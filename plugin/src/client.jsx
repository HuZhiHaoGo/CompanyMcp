import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback, useId } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Check, Copy, FileText, Image as ImageIcon, LoaderCircle, RefreshCw, X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import styles from './style.css';
import { createSelectionClient, registerKnowledgeEntries, prefetchDefinition } from './composer.mjs';
import { LibraryBrowser } from './library-browser.jsx';
import { displayPath } from './display-transport.mjs';

export const inject = ['slots', 'commandUi', 'uiConversation'];

/** 通过 Connection 的同源鉴权路由读取展示数据。 */
export function apply(ctx) {
  const bridge = async (endpoint, args, signal) => {
    const response = await fetch(new URL(displayPath.slice(1), document.baseURI), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint, args }),
      signal,
    });
    const mediaType = response.headers.get('content-type');
    if (response.ok && mediaType?.startsWith('image/')) {
      return { mediaType, bytes: new Uint8Array(await response.arrayBuffer()) };
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      throw new Error(result?.error?.message || `知识展示请求失败（HTTP ${response.status}）`);
    }
    return result.value;
  };
  const selection = createSelectionClient(bridge);
  registerKnowledgeEntries(ctx, selection);
  ctx.effect(() => ctx.uiConversation.events.register(prefetchDefinition), 'tbea: prefetch history');
  ctx.effect(() => {
    const tag = document.createElement('style'); tag.textContent = styles; tag.dataset.plugin = 'dsh-plugin-tbea-knowledge'; document.head.append(tag);
    return () => tag.remove();
  }, 'tbea: styles');
  const libraryPanel = 'tbea-knowledge-library';
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: libraryPanel, inject: () => ({ bridge }) }, LibraryBrowser));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: libraryPanel, order: 20,
    label: () => '知识库目录',
  }, LibraryPanelIcon));
  for (const key of ['mcp__tbea__search_knowledge', 'mcp__tbea__get_chunk_detail']) {
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key,
      inject: () => ({ bridge }),
    }, KnowledgeTool));
  }
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'tbea-knowledge', order: -10,
    inject: sessionId => ({ selection, selectionSessionId: sessionId }),
  }, KnowledgeSelection));
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({ name: 'conversation.chat.node', key: 'tbea-knowledge-prefetch',
    inject: () => ({ bridge }),
  }, PrefetchedKnowledge));
}

function LibraryPanelIcon({ size = 16, className }) { return <BookOpen size={size} className={className} aria-hidden="true" />; }

/** 位于输入框上方的会话级可移除标签，服务端确认成功后才显示已选中。 */
export function KnowledgeSelection({ selection, selectionSessionId }) {
  const subscribe = useCallback(listener => selection.subscribe(selectionSessionId, listener), [selection, selectionSessionId]);
  const snapshot = useCallback(() => selection.get(selectionSessionId), [selection, selectionSessionId]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const serviceError=state.servicePhase==='error';
  const serviceStopped=state.servicePhase==='stopped';
  if (!state.selected && !state.error && !state.pending && !serviceError && !serviceStopped && state.servicePhase!=='starting') return null;
  return <div className="tbea-selection" aria-label="公司知识库来源选择">
    {state.selected ? <span className="tbea-selection-chip"><BookOpen size={14} /><span>公司知识库</span><button type="button" aria-label="取消公司知识库" title={state.autoRetrieveKnowledge === false ? '取消后，需手动选择才会查询公司知识库' : '取消后由模型按需判断是否查库'} disabled={state.pending} onClick={() => { void selection.select(selectionSessionId, false); }}><X size={13} /></button></span> : null}
    {state.pending || state.phase === 'searching' ? <span className="tbea-selection-status" role="status"><LoaderCircle size={13} className="tbea-spin" />{state.pending ? (state.pendingAction==='service' ? '正在启动公司知识服务…' : '正在保存选择…') : state.message}</span> : null}
    {state.phase === 'partial' && !state.pending ? <span className="tbea-selection-status" role="status">{state.message}</span> : null}
    {state.servicePhase==='starting' && !state.pending ? <span className="tbea-selection-status" role="status"><LoaderCircle size={13} className="tbea-spin" />正在启动公司知识服务…</span> : null}
    {serviceStopped ? <span className="tbea-selection-status" role="status">{state.serviceMessage}</span> : null}
    {state.error || serviceError || state.phase === 'error' || state.phase === 'stopped' ? <span className="tbea-selection-error" role="alert">{state.error || (serviceError ? state.serviceMessage : state.message)}{serviceError ? <button className="tbea-icon" type="button" title="重试启动知识服务" aria-label="重试启动知识服务" disabled={state.pending} onClick={()=>{ void selection.retry(selectionSessionId); }}><RefreshCw size={16}/></button> : null}</span> : null}
  </div>;
}

export function PrefetchedKnowledge({ node, bridge }) {
  const view = node.data?.view;
  if (view?.schema !== 'tbea-view/v1') return <div className="tbea-error" role="alert">公司知识检索记录缺少来源信息，请查看运行轨迹。</div>;
  return <div className="tbea-prefetched"><span className="tbea-prefetched-label">已先检索公司知识库</span><Sources view={view} bridge={bridge} /></div>;
}

function textOf(block) { return (block?.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n'); }
function errorOf(block) {
  const text = textOf(block);
  try { const data = JSON.parse(text); return data.message || text; } catch { return text; }
}
function viewOf(block) {
  if (block?.meta?.schema === 'tbea-view/v1') return block.meta;
  try { const data = JSON.parse(textOf(block)); return data.schema === 'tbea-knowledge/v1' ? { snapshotId: data.snapshotId, count: data.hitCount, query: data.query, mode: data.mode, coverage: data.coverage, evidenceStatus: data.evidenceStatus } : null; } catch { return null; }
}

export function KnowledgeTool(props) {
  const result = props.phase === 'result';
  const view = result ? viewOf(props.block) : null;
  if (!result) return <div className="tbea-status" role="status"><LoaderCircle size={16} className="tbea-spin" />正在检索公司知识…</div>;
  if (props.block.isError) return <div className="tbea-error" role="alert">知识检索失败：{errorOf(props.block) || '请求已停止或未完成'}</div>;
  if (!view?.snapshotId) return <pre className="tbea-fallback">{textOf(props.block) || '当前结果没有可展示的来源信息'}</pre>;
  return <Sources view={view} bridge={props.bridge} />;
}

/** 图片引用只存在于展示快照中；历史会话依靠 snapshotId 恢复，不依赖页面内存。 */
export function Sources({ view, bridge }) {
  const panelId = useId();
  const [open, setOpen] = useState(false); const [snapshot, setSnapshot] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [revision, setRevision] = useState(0);
  const coverage = view.coverage || snapshot?.coverage;
  const partial = coverage && coverage.completed < coverage.requested;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setLoading(true); setError('');
    bridge('snapshot', { snapshotId: view.snapshotId }, controller.signal).then(value => {
      if (!controller.signal.aborted) setSnapshot(value);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, view.snapshotId, bridge, revision]);
  return <section className="tbea-sources" aria-label="公司知识参考来源">
    <button className="tbea-source-toggle" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<BookOpen size={16} /><strong>参考来源</strong><span className="tbea-count">{view.count ?? '—'}</span><span className="tbea-query" title={view.query}>{view.query}</span>{view.mode === 'mock' ? <span className="tbea-demo">演示</span> : null}
      {partial ? <span className="tbea-count" title="部分知识库未完成检索">已查 {coverage.completed}/{coverage.requested} 库</span> : null}
      {view.evidenceStatus === 'partial' ? <span className="tbea-count" title="只找到部分所问事项的依据">部分有依据</span> : null}
    </button>
    {open ? <div className="tbea-source-body" id={panelId} aria-busy={loading}>
      {loading ? <div className="tbea-status" role="status"><LoaderCircle size={16} className="tbea-spin" />正在读取来源…</div> : null}
      {error ? <div className="tbea-error" role="alert">{error}<button type="button" className="tbea-icon" title="重新读取来源" onClick={() => setRevision(r => r + 1)}><RefreshCw size={15} /></button></div> : null}
      {!loading && !error && snapshot?.citations.length === 0 ? <p className="tbea-empty">{snapshot.retrievalSkipped ? '本次问题无需查询公司知识库。' : partial ? '本次检索范围不完整，已检索的知识库中未找到相关依据，可重新发送问题。' : '未检索到相关依据，请补充产品、地区或标准版本等条件。'}</p> : null}
      {!loading && !error && snapshot?.citations.map(c => <div className="tbea-citation-group" key={c.citationId}>
        <Citation citation={c} snapshotId={view.snapshotId} bridge={bridge} onRefresh={setSnapshot} />
        {c.equivalentSources?.length ? <EquivalentSources sources={c.equivalentSources} snapshotId={view.snapshotId} bridge={bridge} onRefresh={setSnapshot} /> : null}
      </div>)}
    </div> : null}
  </section>;
}

function EquivalentSources({ sources, snapshotId, bridge, onRefresh }) {
  const [open, setOpen] = useState(false);
  return <details className="tbea-related-sources" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>其他来源（{sources.length}）</summary>
    {open ? sources.map(source => <Citation key={source.citationId} citation={source} snapshotId={snapshotId} bridge={bridge} onRefresh={onRefresh} />) : null}
  </details>;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea'); input.value = value; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select(); const ok = document.execCommand('copy'); input.remove(); if (!ok) throw new Error('复制失败，请选中文字后按 Ctrl+C');
}

function Citation({ citation: c, snapshotId, bridge, onRefresh }) {
  const contentId = useId(); const detailId = useId();
  const hasPreview = c.content.length > 220 || c.content.split(/\r?\n/).length > 5;
  const [expanded, setExpanded] = useState(false); const [detail, setDetail] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [copied, setCopied] = useState(false); const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function refresh() {
    setBusy(true); setError('');
    try { onRefresh(await bridge('refresh', { snapshotId, citationId: c.citationId })); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function copy() {
    try { await copyText([c.documentName, c.content, ...c.tables.map(t => t.rows.map(row => row.map(cell => cell.text).join('\t')).join('\n'))].filter(Boolean).join('\n\n')); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1500); } catch (e) { setError(e.message); }
  }
  return <article className="tbea-citation" id={`tbea-${c.citationId}`}>
    <div className="tbea-citation-head"><FileText size={16} /><strong title={c.documentName}>{c.documentName}</strong><button className="tbea-icon" type="button" title={copied ? '已复制' : '复制切片内容'} aria-label={copied ? '已复制' : '复制切片内容'} onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}</button><span className="tbea-sr-only" role="status">{copied ? '切片内容已复制' : ''}</span></div>
    <div className="tbea-meta"><span className="tbea-citation-id" title="回答对应的引用编号">{c.citationId}</span><span>{c.knowledgeBaseName}</span>{c.page ? <span>第 {c.page} 页</span> : null}{typeof c.score === 'number' ? <span title="检索相关分数，不代表答案正确率">相关分数 {c.score.toFixed(3)}</span> : null}</div>
    {c.content ? <p id={contentId} className={`tbea-content ${hasPreview && !expanded ? 'tbea-collapsed' : ''}`}>{c.content}</p> : null}
    {hasPreview ? <button className="tbea-text-button" type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(!expanded)}>{expanded ? '收起文字' : '展开文字'}</button> : null}
    {c.tables.map((table, index) => <Table key={index} table={table} index={index} />)}
    {c.images.length ? <div className="tbea-gallery">{c.images.map(image => <ImagePreview key={image.id} image={image} snapshotId={snapshotId} bridge={bridge} />)}</div> : null}
    <div className="tbea-citation-actions"><button className="tbea-text-button" type="button" aria-expanded={detail} aria-controls={detailId} onClick={() => setDetail(!detail)}>{detail ? '收起切片详情' : '切片详情'}</button><button className="tbea-icon" type="button" disabled={busy} title="重新获取平台切片详情" aria-label="重新获取平台切片详情" onClick={refresh}>{busy ? <LoaderCircle size={16} className="tbea-spin" /> : <RefreshCw size={16} />}</button></div>
    {detail ? <dl className="tbea-details" id={detailId}><dt>文档</dt><dd>{c.documentName}</dd><dt>知识库</dt><dd>{c.knowledgeBaseName}</dd><dt>切片 ID</dt><dd>{c.chunkId || '平台未提供'}</dd><dt>文档 ID</dt><dd>{c.documentId || '平台未提供'}</dd><dt>知识库 ID</dt><dd>{c.knowledgeBaseId}</dd></dl> : null}
    {error ? <p className="tbea-error" role="alert">{error}</p> : null}
  </article>;
}

function Table({ table, index }) {
  return <div className="tbea-table-scroll" tabIndex={0} role="region" aria-label={`切片表格 ${index + 1}`}><table className="tbea-table"><tbody>{table.rows.map((row, r) => <tr key={r}>{row.map((cell, column) => { const Tag = cell.header ? 'th' : 'td'; return <Tag key={column} colSpan={cell.colSpan} rowSpan={cell.rowSpan}>{cell.text}</Tag>; })}</tr>)}</tbody></table></div>;
}

function ImagePreview({ image, snapshotId, bridge }) {
  const [src, setSrc] = useState(''); const [error, setError] = useState(''); const [retry, setRetry] = useState(0); const [open, setOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl; setError(''); setSrc('');
    bridge('asset', { snapshotId, imageId: image.id }, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([result.bytes], { type: result.mediaType })); setSrc(objectUrl);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [snapshotId, image.id, bridge, retry]);
  return <figure className="tbea-image"><button className="tbea-image-button" type="button" title="查看大图" aria-label="查看大图" disabled={!src} onClick={() => setOpen(true)}>
    {src ? <img src={src} alt={image.caption || '知识库关联图片'} onError={() => { setError('图片无法解码，请刷新切片后重试'); setSrc(''); }} /> : error ? <ImageIcon size={24} /> : <LoaderCircle size={20} className="tbea-spin" />}
  </button>{image.caption ? <figcaption>{image.caption}</figcaption> : null}{error ? <div className="tbea-error">{error}<button className="tbea-icon" title="重试图片" type="button" onClick={() => setRetry(r => r + 1)}><RefreshCw size={15} /></button></div> : null}
    {open && src ? <ImageModal src={src} caption={image.caption || '知识库关联图片'} onClose={() => setOpen(false)} /> : null}
  </figure>;
}

function ImageModal({ src, caption, onClose }) {
  const [scale, setScale] = useState(1); const [natural, setNatural] = useState(); const [fit, setFit] = useState(1); const dialog = useRef(); const viewport = useRef(); const closeButton = useRef();
  useEffect(() => {
    const node = dialog.current; const previous = document.activeElement;
    node.showModal(); closeButton.current?.focus();
    return () => { node.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  // 首次打开同时适配图片的宽和高；窗口改变后重新计算，缩放仍相对于适配后的尺寸。
  useEffect(() => {
    if (!natural) return;
    const node = viewport.current;
    const update = () => setFit(Math.max(0.01, Math.min((node.clientWidth - 32) / natural.width, (node.clientHeight - 32) / natural.height, 1)));
    const observer = new ResizeObserver(update); observer.observe(node); update();
    return () => observer.disconnect();
  }, [natural]);
  function keepFocus(event) {
    if (event.key !== 'Tab') return;
    const items = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')];
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <dialog className="tbea-image-modal" ref={dialog} aria-label={caption} onKeyDown={keepFocus} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="tbea-modal-head"><strong title={caption}>{caption}</strong><div className="tbea-modal-tools" role="toolbar" aria-label="图片预览工具"><button className="tbea-icon" title="缩小" aria-label="缩小" type="button" disabled={scale <= 0.5} onClick={() => setScale(s => Math.max(0.5, s - 0.25))}><ZoomOut size={16} /></button><span className="tbea-zoom-label" role="status" aria-label="相对适配尺寸的缩放比例">{Math.round(scale * 100)}%</span><button className="tbea-icon" title="恢复大小" aria-label="恢复大小" type="button" onClick={() => setScale(1)}><RotateCcw size={16} /></button><button className="tbea-icon" title="放大" aria-label="放大" type="button" disabled={scale >= 4} onClick={() => setScale(s => Math.min(4, s + 0.25))}><ZoomIn size={16} /></button><a className="tbea-icon" title="下载图片" aria-label="下载图片" href={src} download="知识库图片.png"><Download size={16} /></a><button ref={closeButton} className="tbea-icon" title="关闭图片" aria-label="关闭图片" type="button" onClick={onClose}><X size={16} /></button></div></div>
    <div className="tbea-modal-image" ref={viewport} tabIndex={0} role="region" aria-label="图片预览区域"><div className="tbea-modal-canvas"><img src={src} alt={caption} onLoad={event => setNatural({ width:event.currentTarget.naturalWidth, height:event.currentTarget.naturalHeight })} style={{ width:natural ? natural.width * fit * scale : '100%', visibility:natural ? 'visible' : 'hidden' }} /></div></div>
  </dialog>;
}
