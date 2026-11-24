import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { setTimeout as wait } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createKnowledgeServer } from '../src/server.ts';
import { apply } from '../plugin/lib/index.js';
import { requestDisplay } from './display-route.mjs';

async function fixture(t, mode = 'mock') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-'));
  const socket = net.createServer(); await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve)); const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  const config = JSON.parse(await fs.readFile(new URL('../config/example.json', import.meta.url), 'utf8'));
  config.port = port; config.serviceToken = 't'.repeat(64); config.dataDirectory = directory;
  config.documentPreview = { enabled: false, allowPdfViewer: false, converters: {} };
  if (mode === 'live') {
    config.mode = 'live';
    Object.assign(config.platform, { projectId: 'test-project', accessKey: 'test-access', secretKey: 'test-secret' });
  }
  const app = await createKnowledgeServer(config); await app.listen();
  const client = new Client({ name: 'integration-test', version: '1' });
  t.after(async () => { await client.close(); await app.close(); await fs.rm(directory, { recursive: true, force: true }); });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${config.serviceToken}` } } }));
  return { app, config, client, base: `http://127.0.0.1:${port}`, directory };
}

test('真实 MCP 握手、检索、详情、图片、鉴权及空结果', async t => {
  const { app, config, client, base } = await fixture(t);
  assert.equal((await client.listTools()).tools.length, 2);
  assert.equal((await fetch(`${base}/snapshot?snapshotId=x`)).status, 401);
  const r = await client.callTool({ name: 'search_knowledge', arguments: { query: '设计要求' } });
  assert.ok(!r.isError); assert.equal(r.structuredContent.model.hitCount, 2);
  assert.ok(!JSON.stringify(r.content).includes('image/png')); assert.ok(!JSON.stringify(r.content).includes('https://'));
  const id = r.structuredContent.view.snapshotId;
  const view = await app.service.snapshot(id); const imageId = view.citations[0].images[0].id;
  const headers = { Authorization: `Bearer ${config.serviceToken}` };
  const image = await fetch(`${base}/asset?snapshotId=${id}&imageId=${imageId}`, { headers });
  assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/png');
  const detail = await client.callTool({ name: 'get_chunk_detail', arguments: { snapshotId: id, citationId: view.citations[0].citationId } }); assert.ok(!detail.isError);
  const denied = await client.callTool({ name: 'search_knowledge', arguments: { query: '问题', knowledge_base_ids: ['not-allowed'] } }); assert.equal(denied.isError, true);
  const empty = await client.callTool({ name: 'search_knowledge', arguments: { query: '无结果' } }); assert.equal(empty.structuredContent.model.hitCount, 0);
  const math = await client.callTool({ name: 'search_knowledge', arguments: { query: '2+2等于几？' } });
  assert.equal(math.structuredContent.model.evidenceStatus, 'not_needed');
  assert.equal(math.structuredContent.model.hitCount, 0);
  await assert.rejects(app.service.snapshot('../../escape'), /标识/);
  const cached = await app.service.store.image(imageId); assert.ok(cached.bytes.length > 100);
});

test('DSH Host 适配器使用真实 MCP，将模型文字与持久展示 meta 分离', async t => {
  const { config, directory } = await fixture(t); const file = path.join(directory, 'config.json');
  const legacyConfig = { ...config };
  delete legacyConfig.autoRetrieveKnowledge;
  await fs.writeFile(file, JSON.stringify(legacyConfig));
  const tools = new Map(); const effects = []; let route;
  const ctx = { on() {}, tools: { register: tool => { tools.set(tool.name, tool); } }, connection: { fetch: { register: value => { route = value; } } }, effect: fn => effects.push(fn()) };
  await apply(ctx, { configFile: file }); t.after(async () => { for (const effect of effects.reverse()) await effect(); });
  assert.equal(route.path, '/api/tbea-knowledge');
  assert.deepEqual(route.methods, ['POST']);
  const request = (endpoint, args) => requestDisplay(route, endpoint, args);
  const tool = tools.get('mcp__tbea__search_knowledge'); const args = { query: '演示设计要求' };
  const value = await tool.execute(args, { signal: new AbortController().signal });
  const model = tool.output.render(args, value); const meta = tool.output.presentationMeta(args, value);
  assert.equal(meta.schema, 'tbea-view/v1'); assert.ok(!JSON.stringify(model).includes('/asset')); assert.ok(!JSON.stringify(model).includes('serviceToken'));
  const snapshot = await request('snapshot', { snapshotId: meta.snapshotId });
  assert.equal(snapshot.ok, true); assert.equal(snapshot.value.citations.length, 2);
  const image = await request('asset', { snapshotId: meta.snapshotId, imageId: snapshot.value.citations[0].images[0].id });
  assert.equal(image.ok, true); assert.ok(image.value.bytes.length > 100);
  const catalog = (await request('library-catalog', {})).value;
  const libraryId = catalog.libraries[0].id;
  const { value: preview } = await request('library-open', { libraryId, documentId: 'sample-pdf' });
  const page = await request('library-page', { previewId: preview.previewId, page: 1 });
  assert.equal(page.value.mediaType, 'image/png');
  assert.equal(page.value.bytes[0], 137);
});

test('DSH 托管服务通过真实 MCP 在手动和按需入口使用当前内网模型', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-semantic-host-'));
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const config = JSON.parse(await fs.readFile(new URL('../config/example.json', import.meta.url), 'utf8'));
  Object.assign(config, { mode: 'live', port, serviceToken: 'x'.repeat(64), dataDirectory: directory, autoRetrieveKnowledge: true });
  Object.assign(config.platform, { projectId: 'test-project', accessKey: 'test-access', secretKey: 'test-secret' });
  const file = path.join(directory, 'config.json');
  await fs.writeFile(file, JSON.stringify(config));
  const passage = '员工证件遗失补办：在行政服务平台申请，收到批准后领取新卡。';
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (target, options) => {
    const url = new URL(typeof target === 'string' || target instanceof URL ? target : target.url);
    if (url.hostname === '127.0.0.1') return originalFetch(target, options);
    assert.equal(url.hostname, 'ai.tbea.com');
    if (url.searchParams.get('Action') === 'DescribeKnowledgeBases') {
      return Promise.resolve(Response.json({ total: 1, data: [{ id: 'regulations', name: '公司规章制度' }] }));
    }
    return Promise.resolve(Response.json({ chunks: [
      { knowledgebase_id: 'regulations', chunk_id: 'badge', document_id: 'staff', document_name: '行政制度', rank_score: 0.85, content: passage },
    ] }));
  });
  const effects = [], tools = new Map();
  const selection = { provider: 'current-intranet', model: 'intranet-model' };
  let preStep, route, modelCalls = 0;
  const ctx = {
    on(_name, hook) { preStep = hook; }, effect(fn) { effects.push(fn()); },
    tools: { register: tool => tools.set(tool.name, tool) },
    connection: { fetch: { register: value => { route = value; } } },
    get(name) {
      if (name === 'settings') return { describe: () => [{ ns: 'providers', value: { baseURL: 'https://model.tbea.com/v1' } }] };
      if (name === 'llm') return {
        listConfigurableProviders: () => [{ provider: selection.provider, settingsNs: 'providers', settingsPath: [] }],
        async prepareCall(config) {
          assert.equal(config.provider, selection.provider);
          assert.equal(config.model, selection.model);
          return { config, async *stream(request) {
            const { candidates } = JSON.parse(request.messages[0].content[0].text);
            assert.equal(candidates[0].text, passage);
            modelCalls++;
            yield { type: 'text-delta', index: 0, text: JSON.stringify({ decisions: [{ id: 1, kind: 'direct', topics: [0], quote: passage }] }) };
            yield { type: 'finish', reason: { kind: 'stop' } };
          } };
        },
      };
    },
  };
  t.after(async () => {
    for (const effect of effects.reverse()) await effect();
    await fs.rm(directory, { recursive: true, force: true });
  });
  await apply(ctx, { configFile: file });
  const agent = { id: 'policy-session', ctx, model: { current: () => selection } };
  const signal = AbortSignal.timeout(10000);
  assert.equal((await requestDisplay(route, 'select', { sessionId: agent.id, selected: true })).ok, true);
  const query = '工牌丢了怎么补？';
  const decision = await preStep({ agent, signal, modelSelection: selection }, async () => ({
    kind: 'enter', messages: [{ role: 'user', id: 'ask', source: { kind: 'user' }, content: [{ type: 'text', text: query }] }],
  }));
  assert.equal(decision.messages[1].source.view.count, 1);
  assert.equal(modelCalls, 1);
  const result = await tools.get('mcp__tbea__search_knowledge').execute({ query }, { agent, signal });
  assert.equal(result.model.citations[0].chunkId, 'badge');
  assert.equal(modelCalls, 2);
});

test('DSH 注册后的工具动态使用鉴权目录摘要，预热与逐库检索共享授权缓存', async t => {
  const { app, config, directory, base } = await fixture(t, 'live');
  const file = path.join(directory, 'config.json');
  await fs.writeFile(file, JSON.stringify(config));
  const platformCalls = [];
  let available = true;
  app.service.fetcher = async (url, request) => {
    const action = url.searchParams.get('Action');
    platformCalls.push({ action, body: JSON.parse(request.body) });
    if (action !== 'DescribeKnowledgeBases') return Response.json({ chunks: [], total_count: 0 });
    if (!available) return new Response(null, { status: 403 });
    return Response.json({ total: 2, data: [
      { id: 'internal-library-one', name: '供应商准入', description: '采购、复审、供应商证件', documents: ['file-private'] },
      { id: 'internal-library-two', name: '国别手册' },
    ] });
  };
  assert.equal((await fetch(base + '/catalog-summary')).status, 401);

  const tools = new Map();
  const effects = [];
  await apply({
    on() {}, tools: { register: tool => tools.set(tool.name, tool) },
    connection: { fetch: { register() {} } }, effect: fn => effects.push(fn()),
  }, { configFile: file });
  t.after(async () => { for (const effect of effects.reverse()) await effect(); });
  const tool = tools.get('mcp__tbea__search_knowledge');
  for (let poll = 0; poll < 100 && !tool.description.includes('采购、复审'); poll++) await wait(20);
  assert.match(tool.description, /供应商准入/);
  assert.match(tool.description, /采购、复审/);
  assert.match(tool.description, /纯数学、通用翻译/);
  assert.match(tool.description, /实际命中的切片/);
  assert.doesNotMatch(tool.description, /internal-library|file-private|test-secret/);
  assert.deepEqual(platformCalls.map(call => call.action), ['DescribeKnowledgeBases']);

  const result = await tool.execute({ query: '公司供应商准入要提供什么资料？' }, { signal: AbortSignal.timeout(5000) });
  assert.equal(result.model.hitCount, 0);
  const queries = platformCalls.filter(call => call.action === 'QueryKnowledge');
  assert.deepEqual(queries.map(call => call.body.knowledgebase_ids), [['internal-library-one'], ['internal-library-two']]);
  assert.equal(platformCalls.filter(call => call.action === 'DescribeKnowledgeBases').length, 1);
  available = false;
  app.service.directory.expiresAt = 0;
  const denied = await fetch(base + '/catalog-summary', { headers: { Authorization: `Bearer ${config.serviceToken}` } });
  assert.equal(denied.ok, false);
  assert.doesNotMatch(await denied.text(), /供应商准入/);
});

test('磁盘快照可在新服务实例恢复，不依赖页面或 MCP 会话内存', async t => {
  const { app, config, directory } = await fixture(t);
  const result = await app.service.search({ query: '演示' }); const id = result.view.snapshotId;
  // 早期快照没有覆盖范围和等价来源字段，平台切片计数也可能是字符串。
  const historicalFile = path.join(directory, `${id}.json`);
  const historical = JSON.parse(await fs.readFile(historicalFile, 'utf8'));
  delete historical.coverage;
  for (const citation of historical.citations) delete citation.equivalentSources;
  historical.totalCount = String(historical.totalCount);
  await fs.writeFile(historicalFile, JSON.stringify(historical));
  const { KnowledgeService } = await import('../src/knowledge.ts'); const next = new KnowledgeService(config); await next.init();
  assert.equal((await next.snapshot(id)).citations.length, 2);
  await fs.writeFile(historicalFile, '{');
  await assert.rejects(next.snapshot(id), { code: 'INVALID_SNAPSHOT_CONTENT' });
  await fs.writeFile(historicalFile, JSON.stringify(historical));
  next.config = { ...config, knowledgeBases: [] };
  await assert.rejects(next.snapshot(id), /未授权/);
});

test('选中会话先通过真实 MCP 检索全部登记知识库，未选中保留自动工具，失败阻止模型', async t => {
  const { app, config, directory } = await fixture(t); const file = path.join(directory, 'config.json'); await fs.writeFile(file, JSON.stringify(config));
  let preStep; let route; const effects = []; const tools = new Map(); const signal = new AbortController().signal;
  await apply({ on: (event, fn) => { assert.equal(event, 'agent/pre-step'); preStep = fn; }, tools: { register: tool => tools.set(tool.name, tool) },
    connection: { fetch: { register: value => { route = value; } } }, effect: fn => effects.push(fn()),
  }, { configFile: file });
  t.after(async () => { for (const effect of effects.reverse()) await effect(); });
  const request = (endpoint, args) => requestDisplay(route, endpoint, args, signal);
  const agent = { id: 'session-a' }; let calls = 0;
  const original = app.service.search.bind(app.service);
  app.service.search = async (args, signal, manuallySelected) => {
    calls++;
    assert.equal(args.knowledge_base_ids, undefined);
    assert.equal(manuallySelected, true);
    return original(args, signal, manuallySelected);
  };
  const message = id => ({ id, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '设计要求' }] });
  const prepare = async (subject, messages) => preStep({ agent: subject, signal }, async () => ({ kind: 'enter', messages }));
  assert.equal((await request('select', { sessionId: agent.id, selected: true })).ok, true);
  const result = await prepare(agent, [message('one')]); assert.equal(calls, 1); assert.equal(result.messages.length, 2);
  const evidence = result.messages[1]; assert.equal(evidence.source.kind, 'tbea-knowledge-prefetch');
  assert.equal(evidence.source.toolName, 'search_knowledge'); assert.equal(evidence.source.view.count, 2);
  assert.ok(evidence.content[0].text.includes('tbea-knowledge/v1')); assert.ok(!evidence.content[0].text.includes('serviceToken'));
  assert.equal(new Set((await app.service.snapshot(evidence.source.view.snapshotId)).citations.map(c => c.knowledgeBaseId)).size, 2);
  await prepare(agent, [message('one')]); assert.equal(calls, 1, '重新准备不重复检索');
  await prepare(agent, []); assert.equal(calls, 1, '工具续跑不重复检索');
  await prepare(agent, [message('two')]); assert.equal(calls, 2, '选择持续到下次提问');
  await prepare({ id: 'session-b' }, [message('three')]); assert.equal(calls, 2, '不同会话隔离');
  await request('select', { sessionId: agent.id, selected: false });
  await prepare(agent, [message('four')]); assert.equal(calls, 2); assert.equal(tools.size, 2, '取消不移除自动检索工具');
  await request('select', { sessionId: agent.id, selected: true });
  app.service.search = async () => { calls++; throw new Error('模拟平台500'); };
  await assert.rejects(prepare(agent, [message('five')]), /本次未交给模型回答/); assert.equal(calls, 3);
  const status = await request('selection', { sessionId: agent.id }); assert.equal(status.value.phase, 'error');
});

test('关闭自动检索时模型无知识库工具，仅手动选中的会话预检索，引用仍可打开', async t => {
  const { app, config, directory } = await fixture(t);
  let summaries = 0;
  const originalSummary = app.service.catalogSummary.bind(app.service);
  app.service.catalogSummary = signal => { summaries++; return originalSummary(signal); };
  const file = path.join(directory, 'config.json');
  await fs.writeFile(file, JSON.stringify({ ...config, autoRetrieveKnowledge: false }));
  let preStep;
  let route;
  const tools = [];
  const effects = [];
  await apply({
    on: (_event, fn) => { preStep = fn; },
    tools: { register: tool => tools.push(tool.name) },
    connection: { fetch: { register: value => { route = value; } } },
    effect: fn => effects.push(fn()),
  }, { configFile: file });
  t.after(async () => { for (const effect of effects.reverse()) await effect(); });

  const original = app.service.search.bind(app.service);
  const searched = [];
  app.service.search = (args, signal) => { searched.push(args.query); return original(args, signal); };
  const signal = new AbortController().signal;
  const request = (endpoint, args) => requestDisplay(route, endpoint, args, signal);
  const agent = { id: 'manual' };
  const prepare = (subject, id, text) => preStep({ agent: subject, signal }, async () => ({
    kind: 'enter', messages: [{ id, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] }],
  }));

  assert.deepEqual(tools, []);
  assert.equal((await prepare(agent, 'before', '公司设计标准')).messages.length, 1);
  assert.deepEqual(searched, []);

  const selected = await request('select', { sessionId: agent.id, selected: true });
  assert.equal(selected.value.selected, true);
  assert.equal(selected.value.autoRetrieveKnowledge, false);
  const first = await prepare(agent, 'first', '公司设计标准');
  const evidence = first.messages[1];
  assert.doesNotMatch(evidence.content[0].text, /仍可调用/);
  const { snapshotId } = evidence.source.view;
  const snapshot = await request('snapshot', { snapshotId });
  assert.equal(snapshot.value.citations.length, 2);
  const { citationId } = snapshot.value.citations[0];
  assert.equal((await request('refresh', { snapshotId, citationId })).ok, true);
  await prepare({ id: 'other' }, 'other', '公司设计标准');
  await prepare(agent, 'second', 'PLM 问题处理');
  await request('select', { sessionId: agent.id, selected: false });
  assert.equal((await prepare(agent, 'after', '公司设计标准')).messages.length, 1);
  assert.deepEqual(searched, ['公司设计标准', 'PLM 问题处理']);
  assert.equal(summaries, 0, '关闭按需检索时不加载目录摘要');
  assert.deepEqual(tools, []);
});

test('用户停止会关闭该次 MCP HTTP 请求并中断后端，其他并行提问继续', async t => {
  const { app, config, directory } = await fixture(t); const file = path.join(directory, 'config.json'); await fs.writeFile(file, JSON.stringify(config));
  const effects = []; const tools = new Map(); let started; let cancelled;
  const began = new Promise(resolve => { started = resolve; }); const stopped = new Promise(resolve => { cancelled = resolve; });
  await apply({ on() {}, tools: { register: tool => tools.set(tool.name, tool) }, connection: { fetch: { register() {} } }, effect: fn => effects.push(fn()) }, { configFile: file });
  t.after(async () => { for (const effect of effects.reverse()) await effect(); });
  const original = app.service.search.bind(app.service);
  app.service.search = async (args, signal) => {
    if (args.query !== '等待停止') return original(args, signal);
    started(); return new Promise((_resolve, reject) => { signal.addEventListener('abort', () => { cancelled(); reject(signal.reason); }, { once: true }); });
  };
  const tool = tools.get('mcp__tbea__search_knowledge'); const controller = new AbortController();
  const waiting = tool.execute({ query: '等待停止' }, { signal: controller.signal });
  const rejected = assert.rejects(waiting, /abort/i); await began;
  const other = tool.execute({ query: '其他提问' }, { signal: new AbortController().signal });
  controller.abort(); await rejected;
  await Promise.race([stopped, new Promise((_resolve, reject) => { const timeout = setTimeout(() => reject(new Error('后端未收到停止信号')), 3000); timeout.unref(); })]);
  assert.equal((await other).model.hitCount, 2);
});
