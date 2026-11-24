import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Fetcher, ServiceConfig } from './contracts.ts';
import { describeDocument, listDocuments } from './documents.ts';
import { mockDocumentPage, prepareDocumentPdf, previewStatus, readPageCount, renderDocumentPage } from './document-renderer.ts';
import { samplePreviewPdf } from './pdf-preview.ts';
import { SearchGate } from './gate.ts';
import type { KnowledgeService } from './knowledge.ts';
import { PlatformError } from './platform.ts';
import { SharedTasks } from './shared-tasks.ts';

const idleMs = 10 * 60 * 1000;
const maxPreviews = 3;
const mockFormats = ['pdf', 'docx', 'doc', 'ppt', 'pptx', 'txt', 'md', 'html', 'mhtml', 'dps', 'dpsx', 'ofd', 'wps', 'png', 'jpg', 'jpeg', 'bmp'];

interface Preview {
  id: string;
  library: string;
  documentId: string;
  pages?: number;
  pdfBytes?: number;
  sample?: Buffer;
  directory?: string;
  pdf?: string;
  touched: number;
  renders: number;
}

export class LibraryBrowser {
  private readonly lifetime = new AbortController();
  private readonly previews = new Map<string, Preview>();
  private readonly opening = new SharedTasks<Preview>();
  private readonly pageTasks = new SharedTasks<Buffer>();
  private readonly pageCounts = new SharedTasks<number>();
  private readonly listing = new SharedTasks<Awaited<ReturnType<typeof listDocuments>>>();
  private readonly gate = new SearchGate(2, 50);
  private readonly pending = new Set<Promise<unknown>>();
  private timer?: ReturnType<typeof setInterval>;
  private reservations = 0;
  private mock: boolean;
  private config: ServiceConfig;
  private knowledge: Pick<KnowledgeService, 'catalog'>;
  private fetcher?: Fetcher;

  constructor(config: ServiceConfig, knowledge: Pick<KnowledgeService, 'catalog'>, fetcher?: Fetcher) {
    this.config = config;
    this.knowledge = knowledge;
    this.fetcher = fetcher;
    this.mock = config.mode === 'mock';
  }

  private track<T>(promise: Promise<T>) {
    this.pending.add(promise);
    const complete = () => this.pending.delete(promise);
    void promise.then(complete, complete);
    return promise;
  }

  private operation(signal: AbortSignal, ms: number) {
    return AbortSignal.any([this.lifetime.signal, signal, AbortSignal.timeout(ms)]);
  }

  async catalog(signal: AbortSignal) {
    const entries = await this.knowledge.catalog(this.operation(signal, 30000));
    return { libraries: entries.map(({ id, name, description }) => ({ id, name, description })), demo: this.mock };
  }

  private async authorize(id: string | null, signal: AbortSignal) {
    if (!id || !(await this.knowledge.catalog(signal)).some(item => item.id === id)) {
      throw new PlatformError('LIBRARY_NOT_FOUND', '未找到该知识库，或当前项目无查看权限');
    }
    return id;
  }

  private demoDocuments() {
    return mockFormats.map(format => ({ id: `sample-${format}`, name: `预览演示.${format}`, format, status: 'available' }));
  }

  async documents(id: string | null, signal: AbortSignal) {
    signal = this.operation(signal, 60000);
    const library = await this.authorize(id, signal);
    if (this.mock) {
      const documents = this.demoDocuments().map(info => ({ ...info, preview: 'available' as const }));
      return { documents, total: documents.length, complete: true };
    }
    const result = await this.listing.run(library, signal, shared => this.gate.run(shared,
      () => listDocuments(this.config, library, shared, this.fetcher)));
    const documents = [...result.records.values()].flatMap(record => record.info ? [{ ...record.info,
      preview: previewStatus(record.info.format, this.config.documentPreview, false),
    }] : []);
    return { documents, total: result.total, complete: result.complete };
  }

  private async prune(removeOldest = false) {
    const entries = [...this.previews.values()].sort((a, b) => a.touched - b.touched);
    for (const item of entries) {
      if (item.renders || (Date.now() - item.touched < idleMs && (!removeOldest || this.previews.size + this.reservations < maxPreviews))) continue;
      this.previews.delete(item.id);
      if (item.directory) await fs.rm(item.directory, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
  }

  async open(id: string | null, documentId: string | null, signal: AbortSignal) {
    signal = this.operation(signal, 145000);
    const library = await this.authorize(id, signal);
    if (!documentId || documentId.length > 256) throw new PlatformError('DOCUMENT_NOT_FOUND', '未找到该文档');
    // 用户重新点击文档时重新读取详情；避免沿用可能失效的权限或原文地址。
    const preview = await this.opening.run(JSON.stringify([library, documentId]), signal, shared => this.track(this.gate.run(shared, async () => {
      const doc = this.mock ? { info: this.demoDocuments().find(item => item.id === documentId), address: undefined }
        : await describeDocument(this.config, library, documentId, shared, this.fetcher);
      if (!doc.info) throw new PlatformError('DOCUMENT_NOT_FOUND', '未找到该文档');
      const state = previewStatus(doc.info.format, this.config.documentPreview, this.mock);
      if (state !== 'available') throw new PlatformError('PREVIEW_UNAVAILABLE', '当前格式未启用原文转换，请联系管理员');
      let address = doc.address;
      if (!address && !this.mock) {
        // 部分详情只给内部地址，目录中通常有同源且短时有效的下载地址。
        const { records } = await listDocuments(this.config, library, shared, this.fetcher, documentId);
        address = records.get(documentId)?.address;
      }
      if (!this.mock && !address) throw new PlatformError('ORIGINAL_UNAVAILABLE', '平台未提供可用的同源原文地址');
      await this.prune(true);
      if (this.previews.size + this.reservations >= maxPreviews) throw new PlatformError('PREVIEW_BUSY', '当前预览任务较多，请稍后重试');
      this.reservations++;
      let directory: string | undefined;
      try {
        directory = this.mock ? undefined : await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-preview-'));
        const settings = this.config.documentPreview;
        const allowPdf = settings?.enabled && settings.allowPdfViewer;
        const entry: Preview = { id: randomUUID(), library, documentId, directory, touched: Date.now(), renders: 0 };
        if (directory && address) {
          const data = await prepareDocumentPdf(settings!, address, doc.info.format, directory, shared, this.fetcher);
          entry.pdf = data.pdf;
          if (allowPdf) entry.pdfBytes = data.bytes;
          else entry.pages = await readPageCount(settings!, data.pdf, directory, shared);
        } else {
          entry.pages = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'ofd', 'dps', 'dpsx', 'wps'].includes(doc.info.format) ? 4 : 1;
          if (allowPdf) {
            entry.sample = samplePreviewPdf(entry.pages);
            entry.pdfBytes = entry.sample.length;
          }
        }
        shared.throwIfAborted();
        entry.touched = Date.now();
        this.previews.set(entry.id, entry);
        this.timer ??= setInterval(() => { void this.track(this.prune()); }, 60000).unref();
        return entry;
      } catch (error) {
        if (directory) await fs.rm(directory, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
        throw error;
      } finally { this.reservations--; }
    })));
    return { previewId: preview.id, pages: preview.pages, pdfBytes: preview.pdfBytes };
  }

  private async withPreview<T>(id: string | null, signal: AbortSignal, task: (preview: Preview, signal: AbortSignal) => T | Promise<T>) {
    signal = this.operation(signal, 40000);
    const preview = id ? this.previews.get(id) : undefined;
    if (!preview || Date.now() - preview.touched >= idleMs) throw new PlatformError('PREVIEW_NOT_FOUND', '预览已过期，请重新打开文档');
    preview.renders++;
    return this.track((async () => {
      try {
        await this.authorize(preview.library, signal);
        preview.touched = Date.now();
        return await task(preview, signal);
      } finally { preview.renders--; }
    })());
  }

  private countPages(preview: Preview, signal: AbortSignal) {
    if (preview.pages !== undefined) return preview.pages;
    const { pdf, directory } = preview;
    if (!pdf || !directory) throw new PlatformError('PREVIEW_NOT_FOUND', '预览已过期，请重新打开文档');
    return this.pageCounts.run(preview.id, signal, shared => this.track(this.gate.run(shared, async () => {
      preview.renders++;
      try { return preview.pages = await readPageCount(this.config.documentPreview!, pdf, directory, shared); }
      finally { preview.renders--; }
    })));
  }

  async pageCount(id: string | null, signal: AbortSignal) {
    return { pages: await this.withPreview(id, signal, (preview, active) => this.countPages(preview, active)) };
  }

  async page(id: string | null, index: string | null, signal: AbortSignal) {
    return this.withPreview(id, signal, async (preview, active) => {
      const number = Number(index);
      if (!Number.isInteger(number) || number < 1 || number > await this.countPages(preview, active)) throw new PlatformError('INVALID_PREVIEW_PAGE', '页码超出文档范围');
      if (!preview.pdf || !preview.directory) return mockDocumentPage();
      const { pdf, directory } = preview;
      return this.pageTasks.run(`${preview.id}:${number}`, active, shared => {
        return this.track(this.gate.run(shared, async () => {
          preview.renders++;
          try { return await renderDocumentPage(this.config.documentPreview!, pdf, number, directory, shared); }
          finally { preview.renders--; }
        }));
      });
    });
  }

  async pdfRange(id: string | null, begin: string | null, end: string | null, signal: AbortSignal) {
    if (!this.config.documentPreview?.enabled || !this.config.documentPreview.allowPdfViewer) {
      throw new PlatformError('PDF_VIEWER_DISABLED', '管理员未启用 PDF 查看器');
    }
    return this.withPreview(id, signal, (preview, active) => this.gate.run(active, async () => {
      const from = Number(begin);
      const to = Number(end);
      if (!begin || !end || !/^\d+$/u.test(begin) || !/^\d+$/u.test(end) || !Number.isSafeInteger(from) || !Number.isSafeInteger(to)
        || to <= from || to - from > 1024 * 1024 || preview.pdfBytes === undefined || to > preview.pdfBytes) {
        throw new PlatformError('INVALID_PDF_RANGE', 'PDF 数据区间无效');
      }
      if (preview.sample) return preview.sample.subarray(from, to);
      if (!preview.pdf) throw new PlatformError('PREVIEW_NOT_FOUND', '预览已过期，请重新打开文档');
      const handle = await fs.open(preview.pdf, 'r');
      try {
        const buffer = Buffer.alloc(to - from);
        let offset = 0;
        while (offset < buffer.length) {
          active.throwIfAborted();
          const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, from + offset);
          if (bytesRead === 0) throw new PlatformError('PREVIEW_NOT_FOUND', '预览内容已变更，请重新打开文档');
          offset += bytesRead;
        }
        return buffer;
      } finally { await handle.close(); }
    }));
  }

  async close() {
    this.lifetime.abort();
    if (this.timer) clearInterval(this.timer);
    await Promise.allSettled([...this.pending]);
    await Promise.all([...this.previews.values()].map(item => item.directory && fs.rm(item.directory, { recursive: true, force: true, maxRetries: 3 }).catch(() => {})));
    this.previews.clear();
  }
}
