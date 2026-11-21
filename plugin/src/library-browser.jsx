import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, FileText, LoaderCircle, RotateCcw, Search } from 'lucide-react';

const states = { disabled: '原文预览未启用', 'converter-required': '待配置转换组件', unsupported: '当前格式暂不支持预览' };
const statusLabels = { available: '可用', enabled: '可用', queuing: '排队中', parsing: '解析中', indexing: '处理中', parseError: '解析失败', error: '处理失败', paused: '已暂停' };

function useLibraryRequest(bridge, action, args, key) {
  const [state, setState] = useState({});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (key === undefined) return;
    const controller = new AbortController();
    setState({ key, revision, loading: true });
    bridge(action, args, controller.signal).then(value => {
      if (!controller.signal.aborted) setState({ key, revision, value });
    }, error => {
      if (!controller.signal.aborted) setState({ key, revision, error: error.message });
    });
    return () => controller.abort();
  }, [bridge, action, key, revision]);
  return { ...(state.key === key && state.revision === revision ? state : { loading: key !== undefined }), retry: () => setRevision(value => value + 1) };
}

function Wait({ children }) {
  return <div className="tbea-library-state" role="status"><LoaderCircle size={16} className="tbea-spin" />{children}</div>;
}

function Failure({ children, retry }) {
  return <div className="tbea-library-state tbea-library-error" role="alert"><span>{children}</span><button type="button" className="tbea-library-button" onClick={retry}><RotateCcw size={14} />重试</button></div>;
}

export function LibraryBrowser({ bridge }) {
  const directory = useLibraryRequest(bridge, 'library-catalog', {}, 'catalog');
  const libraries = directory.value?.libraries ?? [];
  const [selection, setSelection] = useState('');
  const active = libraries.find(entry => entry.id === selection) ?? libraries[0];
  return <section className="tbea-library" aria-label="知识库目录">
    <header className="tbea-library-title"><BookOpen size={18} aria-hidden="true" /><h1>知识库目录</h1>{directory.value?.demo && <span>演示</span>}</header>
    {directory.loading ? <Wait>正在读取知识库…</Wait> : directory.error ? <Failure retry={directory.retry}>{directory.error}</Failure>
      : !active ? <div className="tbea-library-state">当前项目没有可查看的知识库。</div>
      : <LibraryContents key={active.id} library={active} libraries={libraries} select={setSelection} bridge={bridge} />}
  </section>;
}

function LibraryContents({ library, libraries, select, bridge }) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState();
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
          <FileText size={16} aria-hidden="true" /><span><strong>{item.name}</strong><small>{[item.format?.toUpperCase() || '未知格式', states[item.preview]].filter(Boolean).join(' · ')}</small></span>
        </button></li>)}
      </ul>
    </aside>
    {selected ? <DocumentReader key={selected.id} bridge={bridge} libraryId={library.id} documentInfo={selected} close={() => setSelected(undefined)} />
      : <div className="tbea-library-reader tbea-library-empty"><FileText size={24} aria-hidden="true" />选择一份文档查看基本信息和原文。</div>}
  </div>;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentReader({ bridge, libraryId, documentInfo, close }) {
  const { id, name, format, status, createdAt, bytes, preview } = documentInfo;
  const state = useLibraryRequest(bridge, 'library-open', { libraryId, documentId: id }, preview === 'available' ? id : undefined);
  const facts = [format?.toUpperCase(), bytes != null ? formatSize(bytes) : undefined, createdAt ? new Date(createdAt).toLocaleDateString('zh-CN') : undefined, statusLabels[status] ?? status].filter(Boolean);
  return <article className="tbea-library-reader" aria-label="原文预览">
    <div className="tbea-library-reader-heading"><button type="button" className="tbea-library-button" aria-label="返回文档目录" onClick={close}><ArrowLeft size={16} /></button><div><h2>{name}</h2>{facts.length > 0 && <p>{facts.join(' · ')}</p>}</div>{state.value && <span className="tbea-library-page-count">{state.value.pages} 页</span>}</div>
    {state.loading && <Wait>正在准备原文预览…</Wait>}
    {state.error && <Failure retry={state.retry}>{state.error}</Failure>}
    {states[preview] && <div className="tbea-library-state">{states[preview]}。</div>}
    {state.value && <PreviewPages key={state.value.previewId} bridge={bridge} {...state.value} restart={state.retry} />}
  </article>;
}

function PreviewPages({ bridge, previewId, pages, restart }) {
  const root = useRef();
  return <div className="tbea-library-pages" ref={root} tabIndex={0} aria-label="原文页面，滚动连续阅读">
    {Array.from({ length: pages }, (_, i) => <PreviewPage key={i} root={root} bridge={bridge} previewId={previewId} page={i + 1} restart={restart} />)}
  </div>;
}

function PreviewPage({ root, bridge, previewId, page, restart }) {
  const element = useRef();
  const [near, setNear] = useState(page === 1);
  const [ratio, setRatio] = useState();
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root: root.current, rootMargin: '650px 0px' });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [root]);
  useEffect(() => {
    if (!near || error) return;
    const controller = new AbortController();
    let objectUrl;
    bridge('library-page', { previewId, page }, controller.signal).then(asset => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([asset.bytes], { type: 'image/png' }));
      setUrl(objectUrl);
    }, failure => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); setUrl(''); };
  }, [near, previewId, page, bridge, revision, error]);
  return <figure className="tbea-library-page" ref={element}>
    <div className="tbea-library-sheet" style={{ aspectRatio: ratio || '1 / 1.414' }}>
      {url ? <img draggable={false} onContextMenu={event => event.preventDefault()} src={url} alt={`原文第 ${page} 页`} onLoad={event => { const { naturalWidth, naturalHeight } = event.currentTarget; if (naturalWidth && naturalHeight) setRatio(`${naturalWidth} / ${naturalHeight}`); }} />
        : error ? <Failure retry={() => { if (error.includes('预览已过期')) restart(); else { setError(''); setRevision(value => value + 1); } }}>{error}</Failure>
          : near && <Wait>正在加载第 {page} 页…</Wait>}
    </div>
    <figcaption>第 {page} 页</figcaption>
  </figure>;
}
