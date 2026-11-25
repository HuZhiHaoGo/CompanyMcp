import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isRecord } from './contracts.ts';
import { PlatformError } from './platform.ts';
import { officeUnavailable } from './preview-messages.ts';
import { timePreview } from './diagnostics.ts';
import type { PreviewTiming } from './diagnostics.ts';

export function isHostOfficeFormat(format: string): format is 'doc' | 'docx' | 'ppt' | 'pptx' {
  return format === 'doc' || format === 'docx' || format === 'ppt' || format === 'pptx';
}

// Harness 0.2.2-rc.1 OfficeToPdf.convert. The provider exists only in the Host process.
export interface OfficeToPdf {
  readonly generation?: string;
  convert(request: {
    extension: 'doc' | 'docx' | 'ppt' | 'pptx';
    priority: 'foreground';
    source: {
      key: string;
      version: string;
      bytes: number;
      read(signal: AbortSignal, maxBytes: number): Promise<{ bytes: Uint8Array; version: string }>;
    };
  }, signal: AbortSignal): Promise<{ pdf: Uint8Array }>;
}

export async function convertHostOffice(provider: OfficeToPdf, extension: 'doc' | 'docx' | 'ppt' | 'pptx',
  key: string, original: string, version: string, directory: string, signal: AbortSignal, timing?: PreviewTiming) {
  const { size } = await timePreview(timing, 'office-source-stat', () => fs.stat(original));
  let pdf: Uint8Array;
  const submitted = performance.now();
  let readingStarted = false;
  let readingFinished: number | undefined;
  try {
    const result = await provider.convert({
      extension,
      priority: 'foreground',
      source: {
        key: createHash('sha256').update(key).digest('hex'),
        version,
        bytes: size,
        async read(upstream, maxBytes) {
          readingStarted = true;
          timing?.('office-await-source', submitted);
          try {
            return await timePreview(timing, 'office-read-source', async () => {
              const active = AbortSignal.any([signal, upstream]);
              active.throwIfAborted();
              if (size > maxBytes) throw new PlatformError('ORIGINAL_TOO_LARGE', '原文超过匠宝转换服务的大小限制');
              const handle = await fs.open(original, 'r');
              try {
                const bytes = Buffer.alloc(size + 1);
                let offset = 0;
                while (offset < bytes.length) {
                  active.throwIfAborted();
                  const { bytesRead } = await handle.read(bytes, offset, Math.min(bytes.length - offset, 1024 * 1024), offset);
                  if (!bytesRead) break;
                  offset += bytesRead;
                }
                active.throwIfAborted();
                const content = bytes.subarray(0, offset);
                return { bytes: content, version: createHash('sha256').update(content).digest('hex') };
              } finally { await handle.close(); }
            });
          } finally { readingFinished = performance.now(); }
        },
      },
    }, signal);
    pdf = result.pdf;
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof PlatformError) throw error;
    switch (isRecord(error) ? error.code : undefined) {
      case 'unavailable': throw new PlatformError('OFFICE_SERVICE_UNAVAILABLE', officeUnavailable);
      case 'timeout': throw new PlatformError('PREVIEW_CONVERSION_TIMEOUT', 'Word/PPT 转换超时，请重试');
      case 'busy': throw new PlatformError('PREVIEW_BUSY', '当前文档转换任务较多，请稍后重试');
      case 'source-changed': throw new PlatformError('ORIGINAL_CHANGED', '原件已变更，请重新打开');
      case 'input-too-large': throw new PlatformError('ORIGINAL_TOO_LARGE', '原文超过匠宝转换服务的大小限制');
      case 'invalid-document': throw new PlatformError('INVALID_ORIGINAL', 'Word/PPT 文件损坏或受保护，无法预览');
      case 'invalid-output':
      case 'output-too-large': throw new PlatformError('INVALID_CONVERSION', '匠宝未生成可预览的 PDF');
      default: throw new PlatformError('RENDER_PROGRAM_FAILED', '匠宝未能转换该 Word/PPT 文件，请重试或联系管理员');
    }
  } finally {
    timing?.('office-service-total', submitted);
    if (readingFinished !== undefined) timing?.('office-after-read', readingFinished);
    else if (!readingStarted) timing?.('office-without-source', submitted);
  }
  signal.throwIfAborted();
  await timePreview(timing, 'validate-pdf', () => {
    if (!(pdf instanceof Uint8Array) || pdf.length < 5 || pdf.length > 300 * 1024 * 1024
      || !Buffer.from(pdf.subarray(0, 5)).equals(Buffer.from('%PDF-'))
      || !Buffer.from(pdf.subarray(-1024)).includes('%%EOF')) {
      throw new PlatformError('INVALID_CONVERSION', '匠宝未生成可预览的 PDF');
    }
  });
  const filename = path.join(directory, 'converted.pdf');
  await timePreview(timing, 'write-converted-pdf', () => fs.writeFile(filename, pdf, { signal, flag: 'wx', mode: 0o600 }));
  return { pdf: filename, pdfBytes: pdf.length };
}
