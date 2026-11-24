import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Moon, Sun } from 'lucide-react';
import { Sources, KnowledgeSelection } from '../plugin/src/client.jsx';
import { LibraryBrowser } from '../plugin/src/library-browser.tsx';
import { createSelectionClient, registerKnowledgeEntries } from '../plugin/src/composer.mjs';
import styles from '../plugin/src/style.css';
import demoStyles from './style.css';

const tag = document.createElement('style'); tag.textContent = styles + demoStyles; document.head.append(tag);

// 演示复用正式的菜单注册和来源标签；这里的开关仅存浏览器，不调用模型或正式资料。
const selection = createSelectionClient(async (endpoint, args) => {
  if (endpoint === 'select') localStorage.setItem('tbea-demo-selected', String(args.selected));
  return { selected: localStorage.getItem('tbea-demo-selected') === 'true' };
});
let command;
registerKnowledgeEntries({ effect: fn => fn(), commandUi: { register: row => { command = row; } } }, selection);

function ComposerDemo() {
  const [open, setOpen] = useState(false); const [text, setText] = useState(''); const session = { sessionId: 'demo' };
  const slash = text.startsWith('/') && command.name.startsWith(text.slice(1));
  function pick() {
    command.ui.run(session);
    if (slash) setText('');
    setOpen(false);
  }
  function onKeyDown(event) {
    if (!slash || event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    pick();
  }
  return <section className="demo-composer" aria-label="输入入口演示"><p className="demo-note">通过 + 菜单或 / 命令选择来源。</p>
    <KnowledgeSelection selection={selection} selectionSessionId="demo" />
    {open || slash ? <div className="demo-menu"><button type="button" onClick={pick}>{command.label()}</button><span>检索当前项目可用的知识库</span></div> : null}
    <textarea aria-label="演示问题输入框" placeholder="输入问题，或输入 / 选择公司知识库" value={text} onChange={event => setText(event.target.value)} onKeyDown={onKeyDown} />
    <button type="button" className="demo-add" aria-label="添加来源" aria-expanded={open} onClick={() => setOpen(!open)}><Plus size={16} /></button>
  </section>;
}

function Demo() {
  const [snapshot, setSnapshot] = useState(); const [error, setError] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('tbea-demo-theme') === 'dark');
  useEffect(() => {
    document.body.toggleAttribute('data-ds-dark-theme', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    localStorage.setItem('tbea-demo-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => { fetch('/demo/result').then(r => r.json()).then(setSnapshot).catch(e => setError(e.message)); }, []);
  const bridge = useCallback(async (endpoint, args, signal) => {
    if (endpoint === 'snapshot' || endpoint === 'refresh') return snapshot;
    const response = await fetch(`/demo/asset?snapshotId=${encodeURIComponent(args.snapshotId)}&imageId=${encodeURIComponent(args.imageId)}`, { signal });
    if (!response.ok) throw new Error('演示图片加载失败');
    return { bytes: await response.arrayBuffer(), mediaType: response.headers.get('content-type') };
  }, [snapshot]);
  if (new URLSearchParams(location.search).has('library')) return <LibraryDemo />;
  return <main><header><strong>公司知识库</strong><div className="demo-header-actions"><span>合成资料 · 展示预览</span><button className="demo-theme" type="button" title={dark ? '切换浅色' : '切换深色'} aria-label={dark ? '切换浅色' : '切换深色'} onClick={() => setDark(!dark)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button></div></header><section className="demo-answer"><h1>设计资料查询</h1><p>设计要求应结合产品型号、适用地区和有效标准版本核对，具体技术参数以正式资料为准。</p><p className="demo-note">以下均为合成演示资料，不构成实际设计依据。</p>{error ? <p role="alert">{error}</p> : snapshot ? <Sources view={{ snapshotId: snapshot.id, count: snapshot.citations.length, query: snapshot.query, mode: 'mock', coverage: snapshot.coverage }} bridge={bridge} /> : <p>正在加载…</p>}</section><ComposerDemo /></main>;
}

const libraryBridge = async (endpoint, args, signal) => {
  const response = await fetch(`/demo/library/${endpoint.slice(8)}?${new URLSearchParams(args)}`, { signal });
  if (!response.ok) throw new Error((await response.json()).message || `HTTP ${response.status}`);
  if (endpoint === 'library-pdf-range') return { bytes: new Uint8Array(await response.arrayBuffer()), mediaType: response.headers.get('content-type') };
  return response.json();
};

function LibraryDemo() {
  return <div style={{ height: '100dvh' }}><LibraryBrowser bridge={libraryBridge} pdfAssetPath="/demo/pdf-asset" /></div>;
}
createRoot(document.getElementById('root')).render(<Demo />);
