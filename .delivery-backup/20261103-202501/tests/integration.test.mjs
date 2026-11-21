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
  const ctx = { tools: { register: tool => { tools.set(tool.name, tool); } }, connection: { rpc: { handle: (channel, fn) => { assert.equal(channel, '/tbea'); handler = fn; } } }, effect: fn => effects.push(fn) };
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
