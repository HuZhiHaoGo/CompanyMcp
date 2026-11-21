import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createKnowledgeServer } from '../src/server.mjs';
import { apply } from '../plugin/lib/index.js';

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-'));
  const socket = net.createServer(); await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve)); const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  const config = JSON.parse(await fs.readFile(new URL('../config/example.json', import.meta.url), 'utf8'));
  config.port = port; config.serviceToken = 't'.repeat(64); config.dataDirectory = directory;
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
  await assert.rejects(app.service.snapshot('../../escape'), /标识/);
  const cached = await app.service.store.image(imageId); assert.ok(cached.bytes.length > 100);
});

test('DSH Host 适配器使用真实 MCP，将模型文字与持久展示 meta 分离', async t => {
  const { config, directory } = await fixture(t); const file = path.join(directory, 'config.json'); await fs.writeFile(file, JSON.stringify(config));
  const tools = new Map(); const effects = []; let handler;
  const ctx = { on() {}, tools: { register: tool => { tools.set(tool.name, tool); } }, connection: { rpc: { handle: (channel, fn) => { assert.equal(channel, '/tbea'); handler = fn; } } }, effect: fn => effects.push(fn) };
  await apply(ctx, { configFile: file }); t.after(async () => { for (const effect of effects.reverse()) await effect(); });
  const tool = tools.get('mcp__tbea__search_knowledge'); const args = { query: '演示设计要求' };
  const value = await tool.execute(args, { signal: new AbortController().signal });
  const model = tool.output.render(args, value); const meta = tool.output.presentationMeta(args, value);
  assert.equal(meta.schema, 'tbea-view/v1'); assert.ok(!JSON.stringify(model).includes('/asset')); assert.ok(!JSON.stringify(model).includes('serviceToken'));
  const snapshot = await handler('snapshot', { snapshotId: meta.snapshotId }, new AbortController().signal, { principal: { kind: 'owner' } });
  assert.equal(snapshot.ok, true); assert.equal(snapshot.value.citations.length, 2);
  const denied = await handler('snapshot', { snapshotId: meta.snapshotId }, new AbortController().signal, { principal: { kind: 'guest' } }); assert.equal(denied.ok, false);
  const image = await handler('asset', { snapshotId: meta.snapshotId, imageId: snapshot.value.citations[0].images[0].id }, new AbortController().signal, { principal: { kind: 'owner' } });
  assert.equal(image.ok, true); assert.equal(image.attachments[0].path[0], 'bytes');
});

test('磁盘快照可在新服务实例恢复，不依赖页面或 MCP 会话内存', async t => {
  const { app, config } = await fixture(t);
  const result = await app.service.search({ query: '演示' }); const id = result.view.snapshotId;
  const { KnowledgeService } = await import('../src/knowledge.mjs'); const next = new KnowledgeService(config); await next.init();
  assert.equal((await next.snapshot(id)).citations.length, 2);
  next.config = { ...config, knowledgeBases: [] };
  await assert.rejects(next.snapshot(id), /未授权/);
});

test('选中会话先通过真实 MCP 检索全部登记知识库，未选中保留自动工具，失败阻止模型', async t => {
  const { app, config, directory } = await fixture(t); const file = path.join(directory, 'config.json'); await fs.writeFile(file, JSON.stringify(config));
  let preStep; let handler; const effects = []; const tools = new Map(); const signal = new AbortController().signal;
  await apply({ on: (event, fn) => { assert.equal(event, 'agent/pre-step'); preStep = fn; }, tools: { register: tool => tools.set(tool.name, tool) },
    connection: { rpc: { handle: (_channel, fn) => { handler = fn; } } }, effect: fn => effects.push(fn),
  }, { configFile: file });
  t.after(async () => { for (const effect of effects.reverse()) await effect(); });
  const owner = { principal: { kind: 'owner' } }; const agent = { id: 'session-a' }; let calls = 0;
  const original = app.service.search.bind(app.service);
  app.service.search = async (args, signal) => { calls++; assert.equal(args.knowledge_base_ids, undefined); return original(args, signal); };
  const message = id => ({ id, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '设计要求' }] });
  const prepare = async (subject, messages) => preStep({ agent: subject, signal }, async () => ({ kind: 'enter', messages }));
  assert.equal((await handler('select', { sessionId: agent.id, selected: true }, signal, owner)).ok, true);
  const result = await prepare(agent, [message('one')]); assert.equal(calls, 1); assert.equal(result.messages.length, 2);
  const evidence = result.messages[1]; assert.equal(evidence.source.kind, 'tbea-knowledge-prefetch');
  assert.equal(evidence.source.toolName, 'search_knowledge'); assert.equal(evidence.source.view.count, 2);
  assert.ok(evidence.content[0].text.includes('tbea-knowledge/v1')); assert.ok(!evidence.content[0].text.includes('serviceToken'));
  assert.equal(new Set((await app.service.snapshot(evidence.source.view.snapshotId)).citations.map(c => c.knowledgeBaseId)).size, 2);
  await prepare(agent, [message('one')]); assert.equal(calls, 1, '重新准备不重复检索');
  await prepare(agent, []); assert.equal(calls, 1, '工具续跑不重复检索');
  await prepare(agent, [message('two')]); assert.equal(calls, 2, '选择持续到下次提问');
  await prepare({ id: 'session-b' }, [message('three')]); assert.equal(calls, 2, '不同会话隔离');
  await handler('select', { sessionId: agent.id, selected: false }, signal, owner);
  await prepare(agent, [message('four')]); assert.equal(calls, 2); assert.equal(tools.size, 2, '取消不移除自动检索工具');
  await handler('select', { sessionId: agent.id, selected: true }, signal, owner);
  app.service.search = async () => { calls++; throw new Error('模拟平台500'); };
  await assert.rejects(prepare(agent, [message('five')]), /本次未交给模型回答/); assert.equal(calls, 3);
  const status = await handler('selection', { sessionId: agent.id }, signal, owner); assert.equal(status.value.phase, 'error');
  const denied = await handler('select', { sessionId: agent.id, selected: false }, signal, { principal: { kind: 'guest' } }); assert.equal(denied.ok, false);
});

test('用户停止会关闭该次 MCP HTTP 请求并中断后端，其他并行提问继续', async t => {
  const { app, config, directory } = await fixture(t); const file = path.join(directory, 'config.json'); await fs.writeFile(file, JSON.stringify(config));
  const effects = []; const tools = new Map(); let started; let cancelled;
  const began = new Promise(resolve => { started = resolve; }); const stopped = new Promise(resolve => { cancelled = resolve; });
  await apply({ on() {}, tools: { register: tool => tools.set(tool.name, tool) }, connection: { rpc: { handle() {} } }, effect: fn => effects.push(fn) }, { configFile: file });
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
