import { PlatformError } from './platform.ts';

interface WaitingTask {
  signal?: AbortSignal;
  begin: () => Promise<void>;
  abort: () => void;
  reject: (error: unknown) => void;
}

/** 检索并发和发起间隔由服务统一限制，用户停止时能从等待队列移除请求。 */
export class SearchGate {
  readonly concurrency: number;
  readonly interval: number;
  private active = 0;
  private nextStart = 0;
  private queue: WaitingTask[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(concurrency = 2, interval = 150) {
    this.concurrency = concurrency;
    this.interval = interval;
  }

  run<T>(signal: AbortSignal | undefined, task: () => T | Promise<T>): Promise<T> {
    signal?.throwIfAborted();
    if (this.queue.length >= 20) return Promise.reject(new PlatformError('SERVICE_BUSY', '等待检索的请求过多，请稍后重试'));
    return new Promise((resolve, reject) => {
      const item: WaitingTask = {
        signal,
        begin: () => Promise.resolve().then(task).then(resolve, reject),
        reject,
        abort: () => {
          const index = this.queue.indexOf(item);
          if (index >= 0) { this.queue.splice(index, 1); reject(signal?.reason); }
        },
      };
      signal?.addEventListener('abort', item.abort, { once: true }); this.queue.push(item); this.drain();
    });
  }
  private drain() {
    if (this.timer || this.active >= this.concurrency || !this.queue.length) return;
    const delay = Math.max(0, this.nextStart - Date.now());
    if (delay) { this.timer = setTimeout(() => { this.timer = undefined; this.drain(); }, delay); return; }
    const item = this.queue.shift();
    if (!item) return;
    item.signal?.removeEventListener('abort', item.abort);
    if (item.signal?.aborted) { item.reject(item.signal.reason); this.drain(); return; }
    this.active++; this.nextStart = Date.now() + this.interval;
    void item.begin().finally(() => { this.active--; this.drain(); });
    this.drain();
  }
}
