import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, FileText, LoaderCircle, RotateCcw, Search } from 'lucide-react';
import type { LibraryBrowser as LibraryService } from '../../src/library-browser.ts';
import type { documentRecord } from '../../src/documents.ts';
import type { previewStatus } from '../../src/document-renderer.ts';
import { displayPath } from './display-transport.mjs';
import { PdfViewer, PreviewMeter } from './pdf-viewer.tsx';
import { officeUnavailable } from '../../src/preview-messages.ts';
const SpreadsheetViewer = lazy(() => import('./spreadsheet-viewer.tsx').then(module => ({ default: module.SpreadsheetViewer })));

type LibraryRequests = {
  'library-catalog': {
    args: Record<string, never>;
    result: Awaited<ReturnType<LibraryService['catalog']>>;
  };
  'library-documents': {
    args: { libraryId: string };
    result: Awaited<ReturnType<LibraryService['documents']>>;
  };
  'library-open': {
    args: { libraryId: string; documentId: string };
    result: Awaited<ReturnType<LibraryService['open']>>;
  };
  'library-preview-progress': {
    args: { libraryId: string; documentId: string };
    result: Awaited<ReturnType<LibraryService['previewProgress']>>;
  };
  'library-preview-result': {
    args: { previewId: string; status: 'ready' | 'password' | 'invalid-pdf' | 'load-failed' | 'render-failed' | 'invalid-sheet' | 'sheet-too-large' | 'sheet-timeout';
      elapsedMs: number; parseMs?: number; pdfAssetMs?: number; pdfLoadMs?: number; pdfRenderMs?: number };
    result: Awaited<ReturnType<LibraryService['previewResult']>>;
  };
  'library-pdf-range': {
    args: { previewId: string; begin: number; end: number };
    result: { bytes: Uint8Array<ArrayBuffer> };
  };
  'library-sheet-range': LibraryRequests['library-pdf-range'];
};

type LibraryAction = keyof LibraryRequests;
export type LibraryBridge = <T extends LibraryAction>(
  action: T, args: LibraryRequests[T]['args'], signal: AbortSignal,
) => Promise<LibraryRequests[T]['result']>;

type Library = LibraryRequests['library-catalog']['result']['libraries'][number];
type ListedDocument = LibraryRequests['library-documents']['result']['documents'][number];
type DocumentMetadata = NonNullable<ReturnType<typeof documentRecord>['info']>;
type ReaderDocument = Pick<DocumentMetadata, 'id' | 'name'> & Partial<DocumentMetadata> & { preview?: ReturnType<typeof previewStatus> };

const states = { disabled: '原文预览未启用', 'converter-required': '待配置专用转换组件', 'office-unavailable': '内置 Word/PPT 转换不可用', unsupported: '当前格式暂不支持预览' };
const statusLabels: Readonly<Record<string, string>> = { available: '可用', enabled: '可用', queuing: '排队中', parsing: '解析中', indexing: '处理中', parseError: '解析失败', error: '处理失败', paused: '已暂停' };

interface RequestState<T> {
  key: string;
  revision: number;
  loading?: boolean;
  error?: string;
  value?: T;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '知识库请求失败，请重试。';
}

function useLibraryRequest<T extends LibraryAction>(bridge: LibraryBridge, action: T, args: LibraryRequests[T]['args'], key?: string):
  Omit<RequestState<LibraryRequests[T]['result']>, 'key' | 'revision'> & { retry: () => void } {
  const [state, setState] = useState<RequestState<LibraryRequests[T]['result']>>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (key === undefined) return;
    const controller = new AbortController();
    setState({ key, revision, loading: true });
    bridge(action, args, controller.signal).then(value => {
      if (!controller.signal.aborted) setState({ key, revision, value });
    }, error => {
      if (!controller.signal.aborted) setState({ key, revision, error: errorMessage(error) });
    });
    return () => controller.abort();
  }, [bridge, action, key, revision]);
  return { ...(state?.key === key && state?.revision === revision ? state : { loading: key !== undefined }), retry: () => setRevision(value => value + 1) };
}

function Wait({ children }: { children: ReactNode }) {
  return <div className="tbea-library-state" role="status"><LoaderCircle size={16} className="tbea-spin" />{children}</div>;
}

function Failure({ children, retry }: { children: ReactNode; retry: () => void }) {
  return <div className="tbea-library-state tbea-library-error" role="alert"><span>{children}</span><button type="button" className="tbea-library-button" onClick={retry}><RotateCcw size={14} />重试</button></div>;
}

export function LibraryBrowser({ bridge, pdfAssetPath }: { bridge: LibraryBridge; pdfAssetPath?: string }) {
  const directory = useLibraryRequest(bridge, 'library-catalog', {}, 'catalog');
  const libraries = directory.value?.libraries ?? [];
  const [selection, setSelection] = useState('');
  const active = libraries.find(entry => entry.id === selection) ?? libraries[0];
  return <section className="tbea-library" aria-label="知识库目录">
    <header className="tbea-library-title"><BookOpen size={18} aria-hidden="true" /><h1>知识库目录</h1>{directory.value?.demo && <span>演示</span>}</header>
    {directory.loading ? <Wait>正在读取知识库…</Wait> : directory.error ? <Failure retry={directory.retry}>{directory.error}</Failure>
      : !active ? <div className="tbea-library-state">当前项目没有可查看的知识库。</div>
      : <LibraryContents key={active.id} library={active} libraries={libraries} select={setSelection} bridge={bridge} pdfAssetPath={pdfAssetPath} />}
  </section>;
}

function LibraryContents({ library, libraries, select, bridge, pdfAssetPath }: {
  library: Library; libraries: Library[]; select: (id: string) => void; bridge: LibraryBridge; pdfAssetPath?: string;
}) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<ListedDocument>();
  const listing = useLibraryRequest(bridge, 'library-documents', { libraryId: library.id }, library.id);
  const documents = listing.value?.documents ?? [];
  const visible = documents.filter(item => item.name.toLowerCase().includes(filter.trim().toLowerCase()));
  return <div className={`tbea-library-layout${selected ? ' tbea-library-has-selection' : ''}`}>
    <aside className="tbea-library-list" aria-label="知识库文档">
      <div className="tbea-library-filters">
        <label className="tbea-library-field"><span>知识库</span><select value={library.id} onChange={event => select(event.target.value)}>{libraries.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        {library.description && <p className="tbea-library-description">{library.description}</p>}
        <label className="tbea-library-search"><Search size={15} aria-hidden="true" /><input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="搜索文档名称" aria-label="搜索文档名称" /></label>
        {listing.value && <span className="tbea-library-count">{filter.trim() ? `找到 ${visible.length} 份文档` : `${documents.length} 份文档`}</span>}
      </div>
      {listing.loading && <Wait>正在读取文档目录…</Wait>}
      {listing.error && <Failure retry={listing.retry}>{listing.error}</Failure>}
      {listing.value && !listing.value.complete && <Failure retry={listing.retry}>
        {`平台目录未取全，已显示 ${documents.length}${listing.value.total == null ? '' : `/${listing.value.total}`} 份文档。`}
      </Failure>}
      {listing.value && !visible.length && <div className="tbea-library-state">{filter.trim() ? '没有找到匹配的文档。' : '当前没有可显示的文档。'}</div>}
      <ul className="tbea-library-items">
        {visible.map(item => <li key={item.id}><button type="button" aria-current={selected?.id === item.id ? 'true' : undefined} title={item.name} onClick={() => setSelected(item)}>
          <FileText size={16} aria-hidden="true" /><span><strong>{item.name}</strong><small>{[item.format?.toUpperCase() || '未知格式', item.preview !== 'available' ? states[item.preview] : undefined].filter(Boolean).join(' · ')}</small></span>
        </button></li>)}
      </ul>
    </aside>
    {selected ? <DocumentReader key={selected.id} bridge={bridge} libraryId={library.id} documentInfo={selected} close={() => setSelected(undefined)} pdfAssetPath={pdfAssetPath} />
      : <div className="tbea-library-reader tbea-library-empty"><FileText size={24} aria-hidden="true" />选择一份文档查看基本信息和原文。</div>}
  </div>;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentReader({ bridge, libraryId, documentInfo, close, requestPreview, pdfAssetPath = displayPath.slice(1), backLabel = '返回文档目录' }: {
  bridge: LibraryBridge; libraryId: string; documentInfo: ReaderDocument;
  close: () => void; requestPreview?: boolean; pdfAssetPath?: string; backLabel?: string;
}) {
  const { id, name, format, status, createdAt, bytes, preview } = documentInfo;
  const canOpen = requestPreview ?? (preview === 'available');
  const state = useLibraryRequest(bridge, 'library-open', { libraryId, documentId: id }, canOpen ? JSON.stringify([libraryId, id]) : undefined);
  const opened = state.value;
  const [progress, setProgress] = useState<LibraryRequests['library-preview-progress']['result']>(null);
  useEffect(() => {
    if (!state.loading) return;
    setProgress(null);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const update = await bridge('library-preview-progress', { libraryId, documentId: id }, controller.signal);
        if (!controller.signal.aborted) setProgress(update);
      } catch { /* 原文请求会展示最终错误，进度查询可以重试。 */ }
      if (!controller.signal.aborted) timer = setTimeout(poll, 400);
    };
    timer = setTimeout(poll, 150);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [bridge, libraryId, id, state.loading]);
  const progressLabel = { queued: '等待预览资源…', details: '正在读取文档详情…', downloading: '正在下载原件…',
    converting: '正在转换文档…', 'preparing-text': '正在排版原文…' };
  const facts = [format?.toUpperCase(), bytes != null ? formatSize(bytes) : undefined, createdAt ? new Date(createdAt).toLocaleDateString('zh-CN') : undefined, status ? statusLabels[status] ?? status : undefined].filter(Boolean);
  return <article className="tbea-library-reader" aria-label="原文预览">
    <div className="tbea-library-reader-heading"><button type="button" className="tbea-library-button" aria-label={backLabel} onClick={close}><ArrowLeft size={16} /></button><div><h2>{name}</h2>{facts.length > 0 && <p>{facts.join(' · ')}</p>}</div></div>
    {state.loading && <PreviewMeter key={progress?.phase} label={progress ? progressLabel[progress.phase] : '正在准备原文预览…'}
      elapsedMs={progress?.elapsedMs} received={progress?.received} total={progress?.total} />}
    {state.error && <Failure retry={state.retry}>{state.error}</Failure>}
    {preview && preview !== 'available' && <div className="tbea-library-state">{preview === 'office-unavailable' ? officeUnavailable : states[preview]}。</div>}
    {opened && (opened.pdfBytes
      ? <PdfViewer key={opened.previewId} bridge={bridge} previewId={opened.previewId} bytes={opened.pdfBytes} assetPath={pdfAssetPath} restart={state.retry} />
      : opened.sheetBytes && opened.sheetFormat
        ? <Suspense fallback={<PreviewMeter label="正在读取工作表…" />}>
          <SpreadsheetViewer key={opened.previewId} bridge={bridge} previewId={opened.previewId} bytes={opened.sheetBytes} format={opened.sheetFormat} assetPath={pdfAssetPath} restart={state.retry} />
        </Suspense>
      : opened.html !== undefined && <TextPreview key={opened.previewId} bridge={bridge} previewId={opened.previewId} html={opened.html} />)}
  </article>;
}

function TextPreview({ bridge, previewId, html }: { bridge: LibraryBridge; previewId: string; html: string }) {
  const started = useRef(performance.now());
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void bridge('library-preview-result', { previewId, status: 'ready', elapsedMs: Math.round(performance.now() - started.current) }, AbortSignal.timeout(5000)).catch(() => {});
    });
    return () => cancelAnimationFrame(frame);
  }, [bridge, previewId]);
  // 内容由本插件的静态白名单渲染器重新生成，只包含文本、排版元素和已验证的内嵌图像。
  return <div aria-label="文本原文预览" className="tbea-library-text" tabIndex={0} dangerouslySetInnerHTML={{ __html: html }} />;
}
