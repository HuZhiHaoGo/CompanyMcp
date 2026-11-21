import React, { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Copy, FileText, Image as ImageIcon, LoaderCircle, RefreshCw, X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import styles from './style.css';
import { createSelectionClient, registerKnowledgeEntries, prefetchDefinition } from './composer.mjs';

export const inject = ['slots', 'connection', 'commandUi', 'inputTriggers', 'uiConversation'];

/** 仅注入正式的 RPC 回调；展示组件不读取 Host 密钥或调用模型。 */
export function apply(ctx) {
  const bridge = async (endpoint, args, signal) => {
    const response = await ctx.connection.rpc.call('/tbea', endpoint, args, signal);
    if (!response.ok) throw new Error(response.error.message);
    return response.value;
  };
  const selection = createSelectionClient(bridge);
  registerKnowledgeEntries(ctx, selection);
  ctx.effect(() => ctx.uiConversation.events.register(prefetchDefinition), 'tbea: prefetch history');
  ctx.effect(() => {
    const tag = document.createElement('style'); tag.textContent = styles; tag.dataset.plugin = 'dsh-plugin-tbea-knowledge'; document.head.append(tag);
    return () => tag.remove();
  }, 'tbea: styles');
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

/** 位于输入框上方的会话级可移除标签，服务端确认成功后才显示已选中。 */
export function KnowledgeSelection({ selection, selectionSessionId }) {
  const subscribe = useCallback(listener => selection.subscribe(selectionSessionId, listener), [selection, selectionSessionId]);
  const snapshot = useCallback(() => selection.get(selectionSessionId), [selection, selectionSessionId]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (!state.selected && !state.error && !state.pending) return null;
  return <div className="tbea-selection" aria-label="公司知识库来源选择">
    {state.selected ? <span className="tbea-selection-chip"><BookOpen size={14} /><span>公司知识库</span><button type="button" aria-label="取消公司知识库" title="取消后恢复模型自动判断" disabled={state.pending} onClick={() => { void selection.select(selectionSessionId, false); }}><X size={13} /></button></span> : null}
    {state.pending || state.phase === 'searching' ? <span className="tbea-selection-status" role="status"><LoaderCircle size={13} className="tbea-spin" />{state.pending ? '正在保存选择…' : state.message}</span> : null}
    {state.error || state.phase === 'error' || state.phase === 'stopped' ? <span className="tbea-selection-error" role="alert">{state.error || state.message}</span> : null}
  </div>;
}

export function PrefetchedKnowledge({ node, bridge }) {
  const view = node.data?.view;
  if (view?.schema !== 'tbea-view/v1') return <div className="tbea-error" role="alert">公司知识检索记录缺少来源信息，请查看运行轨迹。</div>;
  return <div className="tbea-prefetched"><span className="tbea-prefetched-label">已先检索公司知识库</span><Sources view={view} bridge={bridge} /></div>;
}

function textOf(block) { return (block?.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n'); }
function viewOf(block) {
  if (block?.meta?.schema === 'tbea-view/v1') return block.meta;
  try { const data = JSON.parse(textOf(block)); return data.schema === 'tbea-knowledge/v1' ? { snapshotId: data.snapshotId, count: data.hitCount, query: data.query, mode: data.mode } : null; } catch { return null; }
}

export function KnowledgeTool(props) {
  const result = props.phase === 'result';
  const view = result ? viewOf(props.block) : null;
  if (!result) return <div className="tbea-status" role="status"><LoaderCircle size={16} className="tbea-spin" />正在检索公司知识…</div>;
  if (props.block.isError) return <div className="tbea-error" role="alert">知识检索失败：{textOf(props.block) || '请求已停止或未完成'}</div>;
  if (!view?.snapshotId) return <pre className="tbea-fallback">{textOf(props.block) || '当前结果没有可展示的来源信息'}</pre>;
  return <Sources view={view} bridge={props.bridge} />;
}

/** 图片引用只存在于展示快照中；历史会话依靠 snapshotId 恢复，不依赖页面内存。 */
export function Sources({ view, bridge }) {
  const [open, setOpen] = useState(false); const [snapshot, setSnapshot] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setLoading(true); setError('');
    bridge('snapshot', { snapshotId: view.snapshotId }, controller.signal).then(setSnapshot).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, view.snapshotId, bridge, revision]);
  return <section className="tbea-sources" aria-label="公司知识参考来源">
    <button className="tbea-source-toggle" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<BookOpen size={17} /><strong>参考来源</strong><span className="tbea-count">{view.count ?? '—'}</span><span className="tbea-query">{view.query}</span>{view.mode === 'mock' ? <span className="tbea-demo">演示</span> : null}
    </button>
    {open ? <div className="tbea-source-body">
      {loading ? <div className="tbea-status" role="status"><LoaderCircle size={16} className="tbea-spin" />正在读取来源…</div> : null}
      {error ? <div className="tbea-error" role="alert">{error}<button type="button" className="tbea-icon" title="重新读取来源" onClick={() => setRevision(r => r + 1)}><RefreshCw size={15} /></button></div> : null}
      {!loading && !error && snapshot?.citations.length === 0 ? <p className="tbea-empty">未检索到相关依据，请补充产品、地区或标准版本等条件。</p> : null}
      {snapshot?.citations.map(c => <Citation key={c.citationId} citation={c} snapshotId={view.snapshotId} bridge={bridge} onRefresh={setSnapshot} />)}
    </div> : null}
  </section>;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea'); input.value = value; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select(); const ok = document.execCommand('copy'); input.remove(); if (!ok) throw new Error('复制失败，请选中文字后按 Ctrl+C');
}

function Citation({ citation: c, snapshotId, bridge, onRefresh }) {
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
    <div className="tbea-citation-head"><FileText size={16} /><span className="tbea-citation-id">{c.citationId}</span><strong>{c.documentName}</strong><button className="tbea-icon" type="button" title={copied ? '已复制' : '复制切片内容'} aria-label={copied ? '已复制' : '复制切片内容'} onClick={copy}><Copy size={15} /></button></div>
    <div className="tbea-meta"><span>{c.knowledgeBaseName}</span>{c.page ? <span>第 {c.page} 页</span> : null}{typeof c.score === 'number' ? <span title="检索相关分数，不代表答案正确率">相关分数 {c.score.toFixed(3)}</span> : null}</div>
    {c.content ? <p className={`tbea-content ${expanded ? 'tbea-expanded' : ''}`}>{c.content}</p> : null}
    {c.content.length > 220 ? <button className="tbea-text-button" type="button" onClick={() => setExpanded(!expanded)}>{expanded ? '收起文字' : '展开文字'}</button> : null}
    {c.tables.map((table, index) => <Table key={index} table={table} index={index} />)}
    {c.images.length ? <div className="tbea-gallery">{c.images.map(image => <ImagePreview key={image.id} image={image} snapshotId={snapshotId} bridge={bridge} />)}</div> : null}
    <div className="tbea-citation-actions"><button className="tbea-text-button" type="button" aria-expanded={detail} onClick={() => setDetail(!detail)}>{detail ? '收起切片详情' : '切片详情'}</button><button className="tbea-icon" type="button" disabled={busy} title="重新获取平台切片详情" onClick={refresh}>{busy ? <LoaderCircle size={15} className="tbea-spin" /> : <RefreshCw size={15} />}</button></div>
    {detail ? <dl className="tbea-details"><dt>文档</dt><dd>{c.documentName}</dd><dt>知识库</dt><dd>{c.knowledgeBaseName}</dd><dt>切片 ID</dt><dd>{c.chunkId || '平台未提供'}</dd><dt>文档 ID</dt><dd>{c.documentId || '平台未提供'}</dd><dt>知识库 ID</dt><dd>{c.knowledgeBaseId}</dd></dl> : null}
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
  const [scale, setScale] = useState(1); const dialog = useRef();
  useEffect(() => { dialog.current.showModal(); return () => dialog.current?.close(); }, []);
  return <dialog className="tbea-image-modal" ref={dialog} aria-label={caption} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="tbea-modal-head"><strong>{caption}</strong><div><button className="tbea-icon" title="缩小" type="button" disabled={scale <= 0.5} onClick={() => setScale(s => Math.max(0.5, s - 0.25))}><ZoomOut size={18} /></button><button className="tbea-icon" title="恢复大小" type="button" onClick={() => setScale(1)}><RotateCcw size={18} /></button><button className="tbea-icon" title="放大" type="button" disabled={scale >= 4} onClick={() => setScale(s => Math.min(4, s + 0.25))}><ZoomIn size={18} /></button><a className="tbea-icon" title="下载图片" href={src} download="知识库图片.png"><Download size={18} /></a><button className="tbea-icon" title="关闭图片" type="button" onClick={onClose}><X size={20} /></button></div></div>
    <div className="tbea-modal-image"><img src={src} alt={caption} style={{ width: `${scale * 100}%`, maxWidth: 'none' }} /></div>
  </dialog>;
}
