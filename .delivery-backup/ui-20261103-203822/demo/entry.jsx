import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sources, KnowledgeSelection } from '../plugin/src/client.jsx';
import { createSelectionClient, registerKnowledgeEntries } from '../plugin/src/composer.mjs';
import styles from '../plugin/src/style.css';
import demoStyles from './style.css';

const tag = document.createElement('style'); tag.textContent = styles + demoStyles; document.head.append(tag);

// 演示复用正式的菜单注册和来源标签；这里的开关仅存浏览器，不调用模型或正式资料。
const selection = createSelectionClient(async (endpoint, args) => {
  if (endpoint === 'select') localStorage.setItem('tbea-demo-selected', String(args.selected));
  return { selected: localStorage.getItem('tbea-demo-selected') === 'true' };
});
let command; let source;
registerKnowledgeEntries({ effect: fn => fn(), commandUi: { register: row => { command = row; } }, inputTriggers: { registerSource: row => { source = row; } } }, selection);

function ComposerDemo() {
  const [open, setOpen] = useState(false); const [text, setText] = useState(''); const session = { sessionId: 'demo' };
  function pick() {
    if (open) command.ui.run(session);
    else { source.onPick({ session, candidate: { value: 'company-knowledge' } }); setText(text.replace(/@[^\s@]*$/, '')); }
    setOpen(false);
  }
  return <section className="demo-composer" aria-label="输入入口演示"><p className="demo-note">输入入口演示：可以通过 + 或 @ 选择来源，此页面不发送模型请求。</p>
    <KnowledgeSelection selection={selection} selectionSessionId="demo" />
    {open || /@[^\s@]*$/.test(text) ? <div className="demo-menu"><button type="button" onClick={pick}>公司知识库</button><span>检索全部已配置知识库</span></div> : null}
    <textarea aria-label="演示问题输入框" placeholder="输入问题，或输入 @ 选择公司知识库" value={text} onChange={event => setText(event.target.value)} />
    <button type="button" className="demo-add" aria-label="添加来源" aria-expanded={open} onClick={() => setOpen(!open)}>+</button>
  </section>;
}

function Demo() {
  const [snapshot, setSnapshot] = useState(); const [error, setError] = useState('');
  useEffect(() => { fetch('/demo/result').then(r => r.json()).then(setSnapshot).catch(e => setError(e.message)); }, []);
  const bridge = useCallback(async (endpoint, args, signal) => {
    if (endpoint === 'snapshot' || endpoint === 'refresh') return snapshot;
    const response = await fetch(`/demo/asset?snapshotId=${encodeURIComponent(args.snapshotId)}&imageId=${encodeURIComponent(args.imageId)}`, { signal });
    if (!response.ok) throw new Error('演示图片加载失败');
    return { bytes: await response.arrayBuffer(), mediaType: response.headers.get('content-type') };
  }, [snapshot]);
  return <main><header><strong>匠宝 · 公司知识</strong><span>离线演示</span></header><section className="demo-answer"><h1>设计资料查询</h1><p>设计要求应结合产品型号、适用地区和有效标准版本核对，具体技术参数以正式资料为准。</p><p className="demo-note">以下均为合成演示资料，不构成实际设计依据。</p>{error ? <p role="alert">{error}</p> : snapshot ? <Sources view={{ snapshotId: snapshot.id, count: snapshot.citations.length, query: snapshot.query, mode: 'mock' }} bridge={bridge} /> : <p>正在加载…</p>}</section><ComposerDemo /></main>;
}
createRoot(document.getElementById('root')).render(<Demo />);
