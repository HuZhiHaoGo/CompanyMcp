import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Fetcher, ServiceConfig } from './contracts.ts';
import { previewEnabled } from './contracts.ts';
import { appendDiagnostic, diagnosticErrorCode, diagnosticId, timePreview } from './diagnostics.ts';
import type { PreviewTiming } from './diagnostics.ts';
import { describeDocument, listDocuments } from './documents.ts';
import { downloadDocument, preparePreviewDocument, previewStatus, spreadsheetFormat } from './document-renderer.ts';
import { convertHostOffice, isHostOfficeFormat } from './office-preview.ts';
import type { OfficeToPdf } from './office-preview.ts';
import { officeUnavailable } from './preview-messages.ts';
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
  format: string;
  version?: string;
  pdfBytes?: number;
  sheetBytes?: number;
  html?: string;
  sample?: Buffer;
  directory?: string;
  pdf?: string;
  sheet?: string;
  converterIdentity?: string | OfficeToPdf;
  touched: number;
  renders: number;
}

type Phase = 'queued' | 'details' | 'downloading' | 'converting' | 'preparing-text';
type Progress = { phase: Phase; startedAt: number; received?: number; total?: number };
const pdfTimingKeys = ['pdfAssetMs', 'pdfLoadMs', 'pdfRenderMs'] as const;
type PdfTimings = Partial<Record<typeof pdfTimingKeys[number], string | null>>;

export class LibraryBrowser {
  private readonly lifetime = new AbortController();
  private readonly previews = new Map<string, Preview>();
  private readonly opening = new SharedTasks<Preview>();
  private readonly progress = new Map<string, Progress>();
  private readonly listing = new SharedTasks<Awaited<ReturnType<typeof listDocuments>>>();
  private readonly gate = new SearchGate(2, 50);
  private readonly readGate = new SearchGate(4, 0);
  private readonly pending = new Set<Promise<unknown>>();
  private timer?: ReturnType<typeof setInterval>;
  private reservations = 0;
  private mock: boolean;
  private config: ServiceConfig;
  private knowledge: Pick<KnowledgeService, 'catalog'>;
  private fetcher?: Fetcher;
  private readonly getOffice?: () => OfficeToPdf | undefined;

  constructor(config: ServiceConfig, knowledge: Pick<KnowledgeService, 'catalog'>, fetcher?: Fetcher,
    getOffice?: () => OfficeToPdf | undefined) {
    this.config = config;
    this.knowledge = knowledge;
    this.fetcher = fetcher;
    this.getOffice = getOffice;
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
      const documents = this.demoDocuments().map(info => ({ ...info, preview: previewStatus(info.format, this.config.documentPreview, true) }));
      return { documents, total: documents.length, complete: true };
    }
    const result = await this.listing.run(library, signal, shared => this.gate.run(shared,
      () => listDocuments(this.config, library, shared, this.fetcher)));
    const hasOffice = Boolean(this.getOffice?.());
    const documents = [...result.records.values()].flatMap(record => record.info ? [{ ...record.info,
      preview: previewStatus(record.info.format, this.config.documentPreview, false, hasOffice),
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
    const started = performance.now();
    let library: string;
    try {
      library = await this.authorize(id, signal);
      if (!documentId || documentId.length > 256) throw new PlatformError('DOCUMENT_NOT_FOUND', '未找到该文档');
    } catch (error) {
      await appendDiagnostic(this.config, { event: 'tbea-preview-prepare', errorCode: diagnosticErrorCode(error),
        timing: [{ phase: 'authorization', ms: Math.round(performance.now() - started) }] });
      throw error;
    }
    // 用户重新点击文档时重新读取详情；避免沿用可能失效的权限或原文地址。
    const key = JSON.stringify([library, documentId]);
    const authorizationMs = Math.round(performance.now() - started);
    const preview = await this.opening.run(key, signal, shared => this.track(this.prepare(key, library, documentId, shared, authorizationMs)));
    const sheetFormat = preview.sheetBytes && spreadsheetFormat(preview.format) ? preview.format : undefined;
    return { previewId: preview.id, pdfBytes: preview.pdfBytes, sheetBytes: preview.sheetBytes, sheetFormat, html: preview.html };
  }

  async previewProgress(id: string | null, documentId: string | null, signal: AbortSignal) {
    const library = await this.authorize(id, this.operation(signal, 10000));
    const progress = this.progress.get(JSON.stringify([library, documentId]));
    if (!progress) return null;
    const { phase, received, total, startedAt } = progress;
    return { phase, received, total, elapsedMs: Math.round(performance.now() - startedAt) };
  }

  private async prepare(key: string, library: string, documentId: string, signal: AbortSignal, authorizationMs: number): Promise<Preview> {
    const started = performance.now();
    const timing: Array<{ phase: Phase; ms: number }> = [];
    const detailTiming: Array<{ phase: string; ms: number }> = [];
    const detail: PreviewTiming = (phase, began) => detailTiming.push({ phase, ms: Math.round(performance.now() - began) });
    const progress: Progress = { phase: 'queued', startedAt: started };
    const operation = randomUUID();
    this.progress.set(key, progress);
    const stage = (phase: Phase) => {
      const now = performance.now();
      timing.push({ phase: progress.phase, ms: Math.round(now - progress.startedAt) });
      Object.assign(progress, { phase, startedAt: now, received: undefined, total: undefined });
    };
    let format: string | undefined;
    let converter: string | undefined;
    let sourceBytes: number | undefined;
    let result: Preview | undefined;
    let failure: string | undefined;
    let cached = false;
    try {
      result = await this.gate.run(signal, async () => {
        stage('details');
        const doc = this.mock ? { info: this.demoDocuments().find(item => item.id === documentId), address: undefined }
          : await describeDocument(this.config, library, documentId, signal, this.fetcher);
        if (!doc.info) throw new PlatformError('DOCUMENT_NOT_FOUND', '未找到该文档');
        format = doc.info.format;
        const settings = this.config.documentPreview;
        const office = isHostOfficeFormat(format) && !settings?.converters[format] ? this.getOffice?.() : undefined;
        // Cordis can return a new service facade on each lookup.
        const converterIdentity = office?.generation ?? office;
        const state = previewStatus(format, settings, this.mock, Boolean(office));
        if (state === 'office-unavailable') throw new PlatformError('OFFICE_SERVICE_UNAVAILABLE', officeUnavailable);
        if (state === 'converter-required') throw new PlatformError('CONVERTER_REQUIRED', '管理员尚未配置此格式的专用转换组件');
        if (state !== 'available') throw new PlatformError('PREVIEW_UNAVAILABLE', state === 'disabled' ? '原文预览未启用' : '当前格式暂不支持预览');
        converter = this.mock ? 'mock' : spreadsheetFormat(format) ? 'excel' : format === 'pdf' ? 'pdf'
          : settings?.converters[format] ? 'dedicated' : office ? 'harness' : format === 'md' || format === 'txt' ? 'text' : 'external-office';
        const address = doc.address;
        if (!this.mock && !address) throw new PlatformError('ORIGINAL_UNAVAILABLE', '平台未提供可用的同源原文地址');
        let directory: string | undefined;
        let reserved = false;
        try {
          const entry: Preview = { id: randomUUID(), library, documentId, format, converterIdentity, touched: Date.now(), renders: 0 };
          let input: string | undefined;
          if (address && settings) {
            directory = await timePreview(detail, 'temp-directory', () => fs.mkdtemp(path.join(os.tmpdir(), 'tbea-preview-')));
            stage('downloading');
            const downloaded = await downloadDocument(settings, address, format, directory, signal, (received, total) => {
              sourceBytes = received;
              Object.assign(progress, { received, total });
            }, this.fetcher, detail);
            input = downloaded.input;
            entry.version = downloaded.version;
            if (downloaded.version) {
              const reusable = [...this.previews.values()].find(item => item.library === library && item.documentId === documentId
                && item.format === format && item.version === downloaded.version && item.converterIdentity === converterIdentity
                && Date.now() - item.touched < idleMs);
              if (reusable) {
                reusable.touched = Date.now();
                cached = true;
                return reusable;
              }
            }
          }
          await timePreview(detail, 'preview-cache-prune', () => this.prune(true));
          if (this.previews.size + this.reservations >= maxPreviews) throw new PlatformError('PREVIEW_BUSY', '当前预览任务较多，请稍后重试');
          this.reservations++;
          reserved = true;
          if (input && directory && settings) {
            if (spreadsheetFormat(format)) {
              entry.sheet = input;
              entry.sheetBytes = (await fs.stat(input)).size;
            } else if (office && isHostOfficeFormat(format) && entry.version) {
              stage('converting');
              const scope = JSON.stringify(['tbea-knowledge', this.config.platform.projectId, library, documentId]);
              Object.assign(entry, await convertHostOffice(office, format, scope, input, entry.version, directory, signal, detail));
              await timePreview(detail, 'remove-original', () => fs.rm(input, { force: true }));
            } else {
              Object.assign(entry, await preparePreviewDocument(settings, input, format, directory, signal, stage, detail));
            }
          } else if (format === 'md' || format === 'txt') {
            entry.html = '<h2>原文预览演示</h2><p>这是一份合成演示文档。</p>';
          } else {
            entry.sample = samplePreviewPdf(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'ofd', 'dps', 'dpsx', 'wps'].includes(format) ? 4 : 1);
            entry.pdfBytes = entry.sample.length;
          }
          signal.throwIfAborted();
          if (entry.pdf || entry.sheet) { entry.directory = directory; directory = undefined; }
          entry.touched = Date.now();
          this.previews.set(entry.id, entry);
          this.timer ??= setInterval(() => { void this.track(this.prune()); }, 60000).unref();
          return entry;
        } finally {
          if (reserved) this.reservations--;
          if (directory) {
            const temporary = directory;
            await timePreview(detail, 'temp-cleanup', () => fs.rm(temporary, { recursive: true, force: true, maxRetries: 3 }).catch(() => {}));
          }
        }
      });
      return result;
    } catch (error) {
      failure = diagnosticErrorCode(error);
      throw error;
    } finally {
      const now = performance.now();
      timing.push({ phase: progress.phase, ms: Math.round(now - progress.startedAt) });
      if (this.progress.get(key) === progress) this.progress.delete(key);
      await appendDiagnostic(this.config, { event: 'tbea-preview-prepare', operation, previewId: result?.id, format,
        ...(format && { libraryId: diagnosticId(library), documentId: diagnosticId(documentId) }),
        authorizationMs, converter, sourceBytes, pdfBytes: result?.pdfBytes, cached, timing, detailTiming, ms: Math.round(now - started), errorCode: failure });
    }
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

  async previewResult(id: string | null, status: string | null, elapsed: string | null, signal: AbortSignal, parseElapsed: string | null = null,
    pdfTimings: PdfTimings = {}) {
    const ms = Number(elapsed);
    if (!status || !['ready', 'password', 'invalid-pdf', 'load-failed', 'render-failed', 'invalid-sheet', 'sheet-too-large', 'sheet-timeout'].includes(status)
      || !elapsed || !Number.isSafeInteger(ms) || ms < 0 || ms > 600000) throw new PlatformError('INVALID_PREVIEW_RESULT', '无效的预览结果');
    const parseMs = parseElapsed === null ? undefined : Number(parseElapsed);
    if (parseMs !== undefined && (!Number.isSafeInteger(parseMs) || parseMs < 0 || parseMs > ms)) throw new PlatformError('INVALID_PREVIEW_RESULT', '无效的解析耗时');
    const pdfParts: Partial<Record<typeof pdfTimingKeys[number], number>> = {};
    let pdfTotal = 0;
    for (const key of pdfTimingKeys) {
      const value = pdfTimings[key];
      if (value == null) continue;
      if (!/^\d+$/u.test(value)) throw new PlatformError('INVALID_PREVIEW_RESULT', '无效的 PDF 阶段耗时');
      pdfParts[key] = Number(value);
      pdfTotal += pdfParts[key];
    }
    if (pdfTotal > ms) throw new PlatformError('INVALID_PREVIEW_RESULT', '无效的 PDF 阶段耗时');
    return this.withPreview(id, signal, async preview => {
      await appendDiagnostic(this.config, { event: preview.sheet ? 'tbea-preview-first-sheet' : 'tbea-preview-first-page',
        previewId: preview.id, format: preview.format, status, parseMs, ...(preview.pdfBytes && pdfParts), ms });
      return { recorded: true };
    });
  }

  async pdfRange(id: string | null, begin: string | null, end: string | null, signal: AbortSignal) {
    return this.readRange(id, begin, end, signal, 'pdf');
  }

  async sheetRange(id: string | null, begin: string | null, end: string | null, signal: AbortSignal) {
    return this.readRange(id, begin, end, signal, 'sheet');
  }

  private async readRange(id: string | null, begin: string | null, end: string | null, signal: AbortSignal, kind: 'pdf' | 'sheet') {
    if (!previewEnabled(this.config.documentPreview) && !(this.mock && this.config.documentPreview === undefined)) {
      throw new PlatformError('PDF_VIEWER_DISABLED', '管理员未启用 PDF 查看器');
    }
    return this.withPreview(id, signal, (preview, active) => this.readGate.run(active, async () => {
      const from = Number(begin);
      const to = Number(end);
      const size = kind === 'pdf' ? preview.pdfBytes : preview.sheetBytes;
      if (!begin || !end || !/^\d+$/u.test(begin) || !/^\d+$/u.test(end) || !Number.isSafeInteger(from) || !Number.isSafeInteger(to)
        || to <= from || to - from > 1024 * 1024 || size === undefined || to > size) {
        throw new PlatformError(kind === 'pdf' ? 'INVALID_PDF_RANGE' : 'INVALID_SHEET_RANGE', '预览数据区间无效');
      }
      if (preview.sample) return preview.sample.subarray(from, to);
      const file = preview[kind];
      if (!file) throw new PlatformError('PREVIEW_NOT_FOUND', '预览已过期，请重新打开文档');
      const handle = await fs.open(file, 'r');
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
