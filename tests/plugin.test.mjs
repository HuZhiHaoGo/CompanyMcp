import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { answerCitationIds, citationReferences, mergeCitedDocuments, readCitationHistory, resolveAnswerCitation, snapshotDocuments } from '../plugin/src/cited-documents.ts';

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
  const binding = { sessionId: 'session-a' };
  module.apply({ effect: fn => { const cleanup = fn(); if (cleanup) effects.push(cleanup); },
    sessions: { binding: id => id === binding.sessionId ? binding : undefined },
    commandUi: { register: row => { commands.push(row); } }, uiConversation: { events: { register: row => { definitions.push(row); } } },
    slots: { inject: (_slot, fn) => fn(), register: (spec, component) => {
      keys.push(spec.key || spec.id);
      assert.equal(typeof component, 'function');
      if (spec.name === 'sidebar.panellist') assert.equal(spec.label(), '知识库目录');
      else {
        const injected = spec.inject('session-a');
        assert.ok(typeof injected.bridge === 'function' || injected.selection);
        if (spec.name === 'main') bridge = injected.bridge;
        if (spec.name === 'conversation.view') {
          assert.equal(spec.label(), '引用文档');
          assert.equal(injected.binding, binding);
        }
      }
    } },
  });
  assert.deepEqual(keys, ['tbea-knowledge-library', 'tbea-knowledge-library', 'mcp__tbea__search_knowledge', 'mcp__tbea__get_chunk_detail', 'tbea-knowledge', 'tbea-knowledge-prefetch', 'tbea-cited-documents']);
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

const event = (type, data, seq = 0) => ({ type: 'event', event: { type, data, seq } });

test('正文引用按轮次和授权快照解析，文本和代码中的无效编号不会打开原文', async () => {
  const snapshotId = 'feedcafe-0000-4000-8000-000000000000';
  const id = 'Kfeedcafe-1';
  const data = { citations: [{ citationId: id, knowledgeBaseId: 'policy', documentId: 'travel', documentName: '差旅制度' }] };
  const answer = (turn, text) => event('assistant/message', { turn, message: { content: [{ type: 'text', text }] } });
  const entries = [
    event('turn/start', { turn: 1 }),
    event('user/message', { source: { kind: 'tbea-knowledge-prefetch', view: { schema: 'tbea-view/v1', snapshotId } } }),
    answer(1, '依据[差旅制度](' + id + ')。代码：`[Kfeedcafe-2]`。'),
    event('turn/start', { turn: 2 }),
    answer(2, '上一轮编号[' + id + ']'),
  ];
  let reads = 0;
  const load = async actual => { reads++; assert.equal(actual, snapshotId); return data; };
  assert.deepEqual([...answerCitationIds(entries).get(1)], [id]);
  assert.equal((await resolveAnswerCitation(entries, 1, id, load)).documentId, 'travel');
  assert.equal(await resolveAnswerCitation(entries, 2, id, load), undefined);
  assert.equal(await resolveAnswerCitation(entries, 1, 'Kfeedcafe-2', load), undefined);
  assert.equal(reads, 1);
  await assert.rejects(resolveAnswerCitation(entries, 1, id, async () => { throw new Error('授权已撤回'); }), /授权已撤回/);
});

test('会话文档按确认过的原文版本归并，并标明哪轮在正文引用', () => {
  const references = new Map([['feedcafe-id', new Map([[1, null]])], ['a11ce123-id', new Map([[2, null]])]]);
  const citations = (id, library, group, version) => snapshotDocuments({ citations: [{
    citationId: id, knowledgeBaseId: library, knowledgeBaseName: library, documentId: 'doc', documentName: '制度',
    documentGroupId: group.repeat(64), documentVersion: version,
  }] });
  const snapshots = new Map([
    ['feedcafe-id', { citations: citations('Kfeedcafe-1', '甲库', 'a', '2026') }],
    ['a11ce123-id', { citations: [...citations('Ka11ce123-1', '乙库', 'a', '2026'), ...citations('Ka11ce123-2', '乙库', 'b', '2024')] }],
  ]);
  const result = mergeCitedDocuments(references, snapshots, new Map([[2, new Set(['Ka11ce123-1'])]]));
  assert.equal(result.documents.length, 2);
  const current = result.documents.find(item => item.documentVersion === '2026');
  assert.deepEqual(current.citedTurns, [2]);
  assert.deepEqual(current.libraries, ['甲库', '乙库']);
  assert.deepEqual(result.documents.find(item => item.documentVersion === '2024').citedTurns, []);
});

test('会话引用按库和文档去重，区分检索结果和后续轮次打开的单个切片', () => {
  const view = { schema: 'tbea-view/v1', snapshotId: 'search' };
  const result = JSON.stringify({ schema: 'tbea-knowledge/v1', snapshotId: 'search' });
  const entries = [
    event('turn/start', { turn: 1 }),
    event('user/message', { source: { kind: 'tbea-knowledge-prefetch', view } }),
    event('turn/end', { turn: 1 }),
    event('turn/start', { turn: 2 }),
    event('tool/call', { name: 'mcp__tbea__search_knowledge', callId: 'automatic', turn: 2 }),
    event('tool/result', { turn: 2, message: { source: { callId: 'automatic' }, content: [{ type: 'text', text: result }] } }),
    event('turn/end', { turn: 2 }),
    event('turn/start', { turn: 3 }),
    event('tool/call', { name: 'mcp__tbea__get_chunk_detail', callId: 'detail', turn: 3, arguments: '{"citationId":"b"}' }),
    event('tool/result', { turn: 3, meta: view, message: { source: { callId: 'detail' } } }),
    event('tool/result', { turn: 3, meta: { ...view, snapshotId: 'unrelated' }, message: { source: { callId: 'different-tool' } } }),
  ];
  const references = citationReferences(entries);
  assert.deepEqual([...references.keys()], ['search']);
  const citations = snapshotDocuments({ citations: [
    { citationId: 'a', knowledgeBaseId: 'first', documentId: 'same', documentName: '甲', equivalentSources: [
      { citationId: 'b', knowledgeBaseId: 'second', documentId: 'same', documentName: '甲' },
    ] },
    { citationId: 'c', knowledgeBaseId: 'first', documentId: 'same', documentName: '甲' },
    { citationId: 'd', knowledgeBaseId: 'first', documentName: '旧切片' },
  ] });
  const { documents, unavailable } = mergeCitedDocuments(references, new Map([['search', { citations }]]));
  assert.equal(unavailable, true);
  assert.deepEqual(documents.map(doc => [doc.knowledgeBaseId, doc.documentId, doc.turns]), [
    ['second', 'same', [3, 2, 1]], ['first', 'same', [2, 1]],
  ]);
});

test('会话引用继续翻页，直到读完历史或检测到翻页失败', async () => {
  const pages = [
    { entries: [event('turn/start', { turn: 3 }, 301)], hasMore: true },
    { entries: [event('turn/start', { turn: 2 }, 201)], hasMore: true },
    { entries: [event('turn/start', { turn: 1 }, 101)], hasMore: false },
  ];
  let page = 0;
  const binding = {
    eventSource: { getSnapshot: () => pages[page] },
    session: { getSnapshot: () => ({ openState: 'open', loadingOlder: false }), async loadOlder() { page++; } },
  };
  await readCitationHistory(binding, new AbortController().signal);
  assert.equal(page, 2);
  page = 0;
  binding.session.loadOlder = async () => {};
  await assert.rejects(readCitationHistory(binding, new AbortController().signal), /较早的会话记录暂时无法读取/);
});

test('历史记录和公开快照在汇总前校验实际数据', () => {
  const view = { schema: 'tbea-view/v1', snapshotId: 'valid' };
  const references = citationReferences([
    null,
    { type: 'event', event: { type: 'user/message', data: null } },
    event('turn/start', { turn: 1 }),
    event('user/message', { source: { kind: 'tbea-knowledge-prefetch', view: { ...view, snapshotId: 99 } } }),
    event('user/message', { source: { kind: 'tbea-knowledge-prefetch', view } }),
  ]);
  assert.deepEqual([...references.keys()], ['valid']);
  assert.throws(() => snapshotDocuments({ schema: 'tbea-snapshot/v2', citations: [] }), /快照格式无效/);
  assert.throws(() => snapshotDocuments({ citations: 'invalid' }), /快照格式无效/);
  assert.deepEqual(snapshotDocuments({ citations: [] }), []);
});
