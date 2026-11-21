import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sources } from '../plugin/src/client.jsx';
import styles from '../plugin/src/style.css';
import demoStyles from './style.css';

const tag = document.createElement('style'); tag.textContent = styles + demoStyles; document.head.append(tag);

function Demo() {
  const [snapshot, setSnapshot] = useState(); const [error, setError] = useState('');
  useEffect(() => { fetch('/demo/result').then(r => r.json()).then(setSnapshot).catch(e => setError(e.message)); }, []);
  const bridge = useCallback(async (endpoint, args, signal) => {
    if (endpoint === 'snapshot' || endpoint === 'refresh') return snapshot;
    const response = await fetch(`/demo/asset?snapshotId=${encodeURIComponent(args.snapshotId)}&imageId=${encodeURIComponent(args.imageId)}`, { signal });
    if (!response.ok) throw new Error('演示图片加载失败');
    return { bytes: await response.arrayBuffer(), mediaType: response.headers.get('content-type') };
  }, [snapshot]);
  return <main><header><strong>匠宝 · 公司知识</strong><span>离线演示</span></header><section className="demo-answer"><h1>设计资料查询</h1><p>设计要求应结合产品型号、适用地区和有效标准版本核对，具体技术参数以正式资料为准。</p><p className="demo-note">以下均为合成演示资料，不构成实际设计依据。</p>{error ? <p role="alert">{error}</p> : snapshot ? <Sources view={{ snapshotId: snapshot.id, count: snapshot.citations.length, query: snapshot.query, mode: 'mock' }} bridge={bridge} /> : <p>正在加载…</p>}</section></main>;
}
createRoot(document.getElementById('root')).render(<Demo />);
