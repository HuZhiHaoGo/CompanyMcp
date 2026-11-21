import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';

test('浏览器产物符合 Harness 模块工厂和 keyed toolview 注册契约', async () => {
  const require = createRequire(import.meta.url); let module;
  const window = { __ModuleLoader__: { load: row => { assert.equal(row.id, 'dsh-plugin-tbea-knowledge'); module = row.factory(require); } } };
  const document = { baseURI: 'http://localhost/profile/', createElement: () => ({ dataset: {}, remove() {} }), head: { append() {} } };
  const signal = new AbortController().signal;
  const fetch = async (url, init) => {
    assert.equal(url.href, 'http://localhost/profile/api/tbea-knowledge');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['content-type'], 'application/json');
    assert.equal(init.signal, signal);
    const { endpoint, args } = JSON.parse(init.body);
    assert.equal(args.sessionId, 'session-a');
    if (endpoint === 'asset') return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
    return Response.json({ ok: true, value: { selected: true } });
  };
  vm.runInNewContext(await fs.readFile(new URL('../plugin/lib/client.js', import.meta.url), 'utf8'), { window, document, fetch, URL, console, setTimeout, clearTimeout });
  assert.equal(typeof module.apply, 'function'); const keys = []; const effects = [];
  const commands = []; const definitions = []; let bridge;
  module.apply({ effect: fn => { const cleanup = fn(); if (cleanup) effects.push(cleanup); },
    commandUi: { register: row => { commands.push(row); } }, uiConversation: { events: { register: row => { definitions.push(row); } } },
    slots: { inject: (_slot, fn) => fn(), register: (spec, component) => {
      keys.push(spec.key || spec.id);
      assert.equal(typeof component, 'function');
      if (spec.name === 'sidebar.panellist') assert.equal(spec.label(), '知识库目录');
      else {
        const injected = spec.inject('session-a');
        assert.ok(typeof injected.bridge === 'function' || injected.selection);
        if (spec.name === 'main') bridge = injected.bridge;
      }
    } },
  });
  assert.deepEqual(keys, ['tbea-knowledge-library', 'tbea-knowledge-library', 'mcp__tbea__search_knowledge', 'mcp__tbea__get_chunk_detail', 'tbea-knowledge', 'tbea-knowledge-prefetch']);
  assert.equal((await bridge('selection', { sessionId: 'session-a' }, signal)).selected, true);
  const image = await bridge('asset', { sessionId: 'session-a' }, signal);
  assert.equal(image.mediaType, 'image/png');
  assert.deepEqual([...image.bytes], [137, 80, 78, 71]);
  assert.equal(commands[0].label(), '公司知识库'); assert.equal(commands[0].name, '公司知识库'); assert.equal(definitions[0].kind, 'tbea-knowledge-prefetch');
  const React=require('react'); const { renderToStaticMarkup }=require('react-dom/server');
  const state={ selected:false,servicePhase:'error',serviceMessage:'知识服务端口被占用' };
  const markup=renderToStaticMarkup(React.createElement(module.KnowledgeSelection,{ selectionSessionId:'a',selection:{ get:()=>state,subscribe:()=>()=>{} } }));
  assert.ok(markup.includes('知识服务端口被占用')); assert.ok(markup.includes('重试启动知识服务'));
  for (const cleanup of effects) cleanup();
});
