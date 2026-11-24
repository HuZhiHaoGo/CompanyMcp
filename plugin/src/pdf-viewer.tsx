import React, { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { LibraryBridge } from './library-browser.tsx';

const requestBytes = 1024 * 1024;

function assetUrl(base: string, name: string) {
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
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const scrollRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setDocumentPdf(undefined);
    setFailure('');
    let loading: PDFDocumentLoadingTask | undefined;
    const dispose = () => {
      controller.abort();
      void loading?.destroy().catch(() => {});
      loading = undefined;
    };
    const fail = (error: unknown) => {
      if (controller.signal.aborted) return;
      setFailure(pdfError(error));
      dispose();
    };

    async function loadPdf() {
      const engine: typeof import('pdfjs-dist') = await import(assetUrl(assetPath, 'pdf.mjs'));
      if (controller.signal.aborted) return;
      engine.GlobalWorkerOptions.workerSrc = assetUrl(assetPath, 'pdf.worker.mjs');
      const transport = new engine.PDFDataRangeTransport(bytes, null, true);
      const read = async (begin: number, end: number) => {
        const result = new Uint8Array(end - begin);
        for (let offset = begin; offset < end; offset += requestBytes) {
          const limit = Math.min(end, offset + requestBytes);
          const chunk = await bridge('library-pdf-range', { previewId, begin: offset, end: limit }, controller.signal);
          if (chunk.bytes.length !== limit - offset) throw new Error('PDF 数据读取不完整。');
          result.set(chunk.bytes, offset - begin);
        }
        if (!controller.signal.aborted) transport.onDataRange(begin, result);
      };
      transport.requestDataRange = (begin, end) => { void read(begin, end).catch(fail); };
      transport.abort = () => controller.abort();

      loading = engine.getDocument({ range: transport, disableStream: true, disableAutoFetch: true,
        cMapUrl: `${assetUrl(assetPath, 'cmaps')}/`, standardFontDataUrl: `${assetUrl(assetPath, 'standard_fonts')}/`,
        wasmUrl: `${assetUrl(assetPath, 'wasm')}/`, enableXfa: false, maxImageSize: 32 * 1024 * 1024 });
      const pdf = await loading.promise;
      if (controller.signal.aborted) return;
      if (pdf.numPages < 1 || pdf.numPages > 3000) throw new Error('文档预览支持 1 至 3000 页');
      setDocumentPdf({ pdf, disableAnnotations: engine.AnnotationMode.DISABLE });
    }
    void loadPdf().catch(fail);
    return dispose;
  }, [bridge, previewId, bytes, assetPath, attempt]);

  if (failure) return <div className="tbea-library-state tbea-library-error" role="alert"><span>{failure}</span>
    <button type="button" className="tbea-library-button" onClick={() => failure.includes('预览已过期') ? restart() : setAttempt(value => value + 1)}>重试</button>
  </div>;
  if (!documentPdf) return <div className="tbea-library-state" role="status">正在加载 PDF…</div>;
  return <div className="tbea-library-pages" ref={scrollRoot} tabIndex={0} aria-label="PDF 查看器，滚动连续阅读">
    {Array.from({ length: documentPdf.pdf.numPages }, (_, index) => <PdfPage key={index} {...documentPdf} number={index + 1} root={scrollRoot} />)}
  </div>;
}

function PdfPage({ pdf, disableAnnotations, number, root }: { pdf: PDFDocumentProxy; disableAnnotations: number; number: number; root: RefObject<HTMLDivElement> }) {
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
    }).catch(failure => { if (!cancelled) setError(pdfError(failure)); });
    return () => { cancelled = true; task?.cancel(); canvas.width = 0; canvas.height = 0; };
  }, [near, number, pdf, disableAnnotations]);
  return <figure className="tbea-library-page" ref={element}>
    <div className="tbea-library-sheet" style={{ aspectRatio: ratio }}>
      {error ? <div className="tbea-library-state tbea-library-error" role="alert">{error}</div> : near && <canvas ref={surface} className="tbea-library-pdf-page" aria-label={`原文第 ${number} 页`} />}
    </div>
    <figcaption>第 {number} 页</figcaption>
  </figure>;
}
