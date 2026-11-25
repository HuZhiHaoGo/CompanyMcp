import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { LibraryBridge } from './library-browser.tsx';
import type { PdfFailure } from '../../src/preview-messages.ts';
import { createPdfRangeReader, PdfRangeError } from './pdf-range.ts';

export function PreviewMeter({ label, elapsedMs, received, total }: { label: string; elapsedMs?: number; received?: number; total?: number }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (elapsedMs !== undefined) return;
    const start = performance.now();
    const timer = setInterval(() => setSeconds(Math.floor((performance.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [elapsedMs]);
  const value = total && received !== undefined ? Math.min(100, Math.floor(received / total * 100)) : undefined;
  return <div className="tbea-preview-progress">
    <div><span role="status">{label}</span><span>{value === undefined ? `已用 ${elapsedMs === undefined ? seconds : Math.floor(elapsedMs / 1000)} 秒` : `${value}%`}</span></div>
    <progress aria-label={label} max={100} value={value} />
  </div>;
}

export function assetUrl(base: string, name: string) {
  const url = new URL(base, document.baseURI);
  url.searchParams.set('asset', name);
  return url.href;
}

function pdfError(error: unknown) {
  if (error instanceof Error && error.name === 'PasswordException') return '此 PDF 受密码保护，无法预览。';
  return error instanceof Error ? error.message : 'PDF 查看器加载失败。';
}

export function PdfViewer({ bridge, previewId, bytes, assetPath, restart }: {
  bridge: LibraryBridge; previewId: string; bytes: number; assetPath: string; restart: () => void;
}) {
  const [documentPdf, setDocumentPdf] = useState<{ pdf: PDFDocumentProxy; disableAnnotations: number }>();
  const [failure, setFailure] = useState<{ message: string; reopen?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const [firstPageReady, setFirstPageReady] = useState(false);
  const scrollRoot = useRef<HTMLDivElement>(null);
  const metric = useRef<{ started: number; sent: boolean; assetReady?: number; documentReady?: number }>({
    started: performance.now(), sent: false,
  });
  const report = useCallback((status: 'ready' | 'password' | 'invalid-pdf' | 'load-failed' | 'render-failed', failure?: PdfFailure) => {
    const afterFirstPage = metric.current.sent;
    if (afterFirstPage && failure?.phase !== 'range') return;
    metric.current.sent = true;
    const { started, assetReady, documentReady } = metric.current;
    const elapsedMs = Math.round(performance.now() - started);
    const assetMs = assetReady === undefined ? elapsedMs : Math.round(assetReady - started);
    const loadedMs = documentReady === undefined ? elapsedMs : Math.round(documentReady - started);
    void bridge('library-preview-result', { previewId, status: afterFirstPage ? 'range-failed' : status, elapsedMs, pdfAssetMs: assetMs,
      ...(assetReady !== undefined && { pdfLoadMs: loadedMs - assetMs }),
      ...(documentReady !== undefined && !afterFirstPage && { pdfRenderMs: elapsedMs - loadedMs }),
      ...(failure && { pdfFailure: JSON.stringify(failure) }) },
      AbortSignal.timeout(5000)).catch(() => {});
  }, [bridge, previewId]);
  const firstPage = useCallback((error?: string) => {
    if (metric.current.sent) return;
    if (error) { setFailure({ message: error }); report('render-failed', { phase: 'render', errorCode: 'PDF_RENDER_FAILED' }); }
    else { setFirstPageReady(true); report('ready'); }
  }, [report]);
  useEffect(() => {
    const controller = new AbortController();
    metric.current = { started: performance.now(), sent: false };
    setFirstPageReady(false);
    setDocumentPdf(undefined);
    setFailure(undefined);
    let loading: PDFDocumentLoadingTask | undefined;
    const dispose = () => {
      controller.abort();
      void loading?.destroy().catch(() => {});
      loading = undefined;
    };
    const fail = (error: unknown) => {
      if (controller.signal.aborted) return;
      const name = error instanceof Error ? error.name : '';
      const status = name === 'PasswordException' ? 'password' : name === 'InvalidPDFException' ? 'invalid-pdf' : 'load-failed';
      const failure: PdfFailure = error instanceof PdfRangeError
        ? { phase: 'range', errorCode: error.code, begin: error.begin, end: error.end, retries: error.retries }
        : metric.current.assetReady === undefined ? { phase: 'asset', errorCode: 'PDF_ASSET_FAILED' }
          : { phase: 'load', errorCode: status === 'invalid-pdf' ? 'INVALID_PDF' : status === 'password' ? 'PDF_PASSWORD' : 'PDF_LOAD_FAILED' };
      setFailure({ message: pdfError(error), reopen: failure.errorCode === 'PREVIEW_NOT_FOUND' });
      report(status, failure);
      dispose();
    };

    async function loadPdf() {
      const engine: typeof import('pdfjs-dist') = await import(assetUrl(assetPath, 'pdf.mjs'));
      if (controller.signal.aborted) return;
      metric.current.assetReady = performance.now();
      engine.GlobalWorkerOptions.workerSrc = assetUrl(assetPath, 'pdf.worker.mjs');
      const transport = new engine.PDFDataRangeTransport(bytes, null, true);
      transport.requestDataRange = createPdfRangeReader(bridge, previewId, controller.signal,
        (begin, data) => transport.onDataRange(begin, data), fail);
      transport.abort = () => controller.abort();

      loading = engine.getDocument({ range: transport, disableStream: true, disableAutoFetch: true,
        cMapUrl: `${assetUrl(assetPath, 'cmaps')}/`, standardFontDataUrl: `${assetUrl(assetPath, 'standard_fonts')}/`,
        wasmUrl: `${assetUrl(assetPath, 'wasm')}/`, enableXfa: false, maxImageSize: 32 * 1024 * 1024 });
      const pdf = await loading.promise;
      if (controller.signal.aborted) return;
      metric.current.documentReady = performance.now();
      if (pdf.numPages < 1 || pdf.numPages > 3000) throw new Error('文档预览支持 1 至 3000 页');
      setDocumentPdf({ pdf, disableAnnotations: engine.AnnotationMode.DISABLE });
    }
    void loadPdf().catch(fail);
    return dispose;
  }, [bridge, previewId, bytes, assetPath, attempt, report]);

  if (failure) return <div className="tbea-library-state tbea-library-error" role="alert"><span>{failure.message}</span>
    <button type="button" className="tbea-library-button" onClick={() => failure.reopen ? restart() : setAttempt(value => value + 1)}>重试</button>
  </div>;
  return <>
    {!firstPageReady && <PreviewMeter label="正在加载首页…" />}
    {documentPdf && <div className="tbea-library-pages" ref={scrollRoot} tabIndex={0} aria-label="PDF 查看器，滚动连续阅读">
      {Array.from({ length: firstPageReady ? documentPdf.pdf.numPages : 1 }, (_, index) =>
        <PdfPage key={index} {...documentPdf} number={index + 1} root={scrollRoot} onFirstPage={index === 0 ? firstPage : undefined} />)}
    </div>}
  </>;
}

function PdfPage({ pdf, disableAnnotations, number, root, onFirstPage }: { pdf: PDFDocumentProxy; disableAnnotations: number; number: number;
  root: RefObject<HTMLDivElement>; onFirstPage?: (error?: string) => void }) {
  const element = useRef<HTMLElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(number === 1);
  const [ratio, setRatio] = useState('1 / 1.414');
  const [error, setError] = useState('');
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root: root.current, rootMargin: '650px 0px' });
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, [root]);
  useEffect(() => {
    const canvas = surface.current;
    if (!near || !canvas) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void pdf.getPage(number).then(async page => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 1800 / Math.max(base.width, base.height) });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      setRatio(`${base.width} / ${base.height}`);
      task = page.render({ canvas, viewport, annotationMode: disableAnnotations });
      await task.promise;
      page.cleanup();
      if (!cancelled) onFirstPage?.();
    }).catch(failure => {
      if (!cancelled) {
        const message = pdfError(failure);
        setError(message);
        onFirstPage?.(message);
      }
    });
    return () => { cancelled = true; task?.cancel(); canvas.width = 0; canvas.height = 0; };
  }, [near, number, pdf, disableAnnotations, onFirstPage]);
  return <figure className="tbea-library-page" ref={element}>
    <div className="tbea-library-sheet" style={{ aspectRatio: ratio }}>
      {error ? <div className="tbea-library-state tbea-library-error" role="alert">{error}</div> : near && <canvas ref={surface} className="tbea-library-pdf-page" role="img" aria-label={`原文第 ${number} 页`} />}
    </div>
    <figcaption>第 {number} 页</figcaption>
  </figure>;
}
