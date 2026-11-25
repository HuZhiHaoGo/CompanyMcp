import { hasCode, isRecord } from '../../src/contracts.ts';
import type { LibraryBridge } from './library-browser.tsx';

const requestBytes = 1024 * 1024;
const maxReads = 2;
const retryDelays = [150, 300] as const;

export class PdfRangeError extends Error {
  readonly code: string;
  readonly begin: number;
  readonly end: number;
  readonly retries: number;

  constructor(error: unknown, begin: number, end: number, retries: number) {
    super(hasCode(error, 'SERVICE_BUSY') ? 'PDF 读取繁忙，请稍后重试。'
      : error instanceof Error ? error.message : 'PDF 数据读取失败。', { cause: error });
    this.code = isRecord(error) && typeof error.code === 'string' ? error.code : 'PDF_RANGE_FAILED';
    this.begin = begin;
    this.end = end;
    this.retries = retries;
  }
}

function retryAfter(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export function createPdfRangeReader(bridge: LibraryBridge, previewId: string, signal: AbortSignal,
  onData: (begin: number, data: Uint8Array<ArrayBuffer>) => void, onError: (error: unknown) => void) {
  const queue: { begin: number; end: number }[] = [];
  let active = 0;
  let stopped = false;
  signal.addEventListener('abort', () => { queue.length = 0; }, { once: true });

  async function readChunk(begin: number, end: number) {
    for (let retries = 0; ; retries++) {
      signal.throwIfAborted();
      try {
        const chunk = await bridge('library-pdf-range', { previewId, begin, end }, signal);
        if (chunk.bytes.length !== end - begin) {
          throw Object.assign(new Error('PDF 数据读取不完整。'), { code: 'PDF_RANGE_INCOMPLETE' });
        }
        return chunk.bytes;
      } catch (error) {
        signal.throwIfAborted();
        const delay = retryDelays[retries];
        if (!hasCode(error, 'SERVICE_BUSY') || delay === undefined) throw new PdfRangeError(error, begin, end, retries);
        await retryAfter(delay, signal);
      }
    }
  }

  async function read(begin: number, end: number) {
    const result = new Uint8Array(end - begin);
    for (let offset = begin; offset < end; offset += requestBytes) {
      const limit = Math.min(end, offset + requestBytes);
      result.set(await readChunk(offset, limit), offset - begin);
    }
    if (!signal.aborted && !stopped) onData(begin, result);
  }

  function drain() {
    while (!signal.aborted && !stopped && active < maxReads && queue.length) {
      const range = queue.shift()!;
      active++;
      void read(range.begin, range.end).catch(error => {
        if (signal.aborted || stopped) return;
        stopped = true;
        queue.length = 0;
        onError(error);
      }).finally(() => { active--; drain(); });
    }
  }

  return (begin: number, end: number) => {
    if (signal.aborted || stopped) return;
    queue.push({ begin, end });
    drain();
  };
}
