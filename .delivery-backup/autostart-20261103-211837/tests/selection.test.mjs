import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SelectionStore, createPrefetch } from '../plugin/src/selection.mjs';
import { createSelectionClient, registerKnowledgeEntries, prefetchDefinition } from '../plugin/src/composer.mjs';

test('来源选择按会话持久化、可取消、并发写入完整，配置损坏不静默关闭', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-selection-')); t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new SelectionStore(directory); assert.equal(await store.get('one'), false);
  await Promise.all([store.set('one', true), store.set('two', true)]);
  const restored = new SelectionStore(directory); assert.equal(await restored.get('one'), true);
  await restored.set('one', false); assert.equal(await new SelectionStore(directory).get('one'), false); assert.equal(await restored.get('two'), true);
  await fs.writeFile(path.join(directory, 'dsh-selection', `${store.key('bad')}.json`), 'invalid');
  await assert.rejects(restored.get('bad'), /读取失败/);
});

test('pre-step 等待真实结果、空结果仍携带依据、取消和失败均不能放行', async () => {
  const status = new Map(); let release; let calls = 0;
  const model = { schema: 'tbea-knowledge/v1', hitCount: 0, citations: [] }; const view = { schema: 'tbea-view/v1', snapshotId: 'test', count: 0 };
  const agent = { id: 'test' }; const message = { id: 'm', role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '今天的天气怎么样？' }] };
  const step = createPrefetch({ selections: { get: async () => true }, status, callTool: async (_name, args) => { calls++; assert.equal(args.query, message.content[0].text); return new Promise(resolve => { release = () => resolve({ model, view }); }); } });
  let settled = false; const controller = new AbortController();
  const result = step({ agent, signal: controller.signal }, async () => ({ kind: 'enter', messages: [message] })).then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(settled, false); assert.equal(status.get('test').phase, 'searching');
  release(); const decision = await result; assert.equal(decision.messages[1].source.view.count, 0); assert.equal(calls, 1);
  // 即使用户问题与公司无关，显式选中也必须检索；取消信号到达后不交给模型。
  const pending = step({ agent, signal: controller.signal }, async () => ({ kind: 'enter', messages: [{ ...message, id: 'm2' }] }));
  await new Promise(resolve => setImmediate(resolve)); controller.abort(); release(); await assert.rejects(pending, /abort/i);
  assert.equal(status.get('test').phase, 'stopped');
  const rejected = await step({ agent, signal: new AbortController().signal }, async () => ({ kind: 'reject' })); assert.equal(rejected.kind, 'reject'); assert.equal(calls, 2);
});

test('+ 和 @ 设置同一个来源，菜单浏览不检索，@ 只删除候选 token', async () => {
  const commands = []; const sources = []; const picks = [];
  registerKnowledgeEntries({ effect: fn => fn(), commandUi: { register: row => commands.push(row) }, inputTriggers: { registerSource: row => sources.push(row) } }, { select: (...args) => { picks.push(args); } });
  const session = { sessionId: 'a' }; const rows = await sources[0].candidates(session, { query: '公司', quoted: false, drilled: false });
  assert.equal(rows.length, 1); assert.equal(picks.length, 0);
  commands[0].ui.run(session); assert.deepEqual(picks[0], ['a', true]);
  assert.deepEqual(sources[0].onPick({ candidate: rows[0], session }), { text: '' }); assert.deepEqual(picks[1], ['a', true]);
  assert.equal((await sources[0].candidates(session, { query: 'file/path', quoted: false, drilled: false })).length, 0);
});

test('客户端等待 Host 确认后显示来源，失败不伪装为选中', async () => {
  let resolve; const client = createSelectionClient(async () => new Promise(r => { resolve = r; }));
  const request = client.select('one', true); assert.equal(client.get('one').selected, false); assert.equal(client.get('one').pending, true);
  resolve({ selected: true }); await request; assert.equal(client.get('one').selected, true);
  const bad = createSelectionClient(async () => { throw new Error('断开'); }); await bad.select('one', true);
  assert.equal(bad.get('one').selected, false); assert.match(bad.get('one').error, /保存失败/);
});

test('预检索会话上下文能从持久记录恢复引用节点，不伪造模型工具事件', () => {
  const event = { type: 'user/message', seq: 7, data: { id: 'one', source: { kind: 'tbea-knowledge-prefetch', view: { schema: 'tbea-view/v1', snapshotId: 'snap' } } } };
  assert.deepEqual(prefetchDefinition.match(event), { id: 'one', role: 'start', exclusive: true });
  const location = { kind: 'step', turn: { turn: 1 }, step: { step: 1 } }; const match = { event, location };
  const state = prefetchDefinition.start({}, match); const node = prefetchDefinition.buildViewNode({ id: 'one', key: 'key', state, start: match });
  assert.equal(node.data.view.snapshotId, 'snap'); assert.equal(node.anchorSeq, 7); assert.equal(node.location, location);
  assert.equal(prefetchDefinition.match({ ...event, type: 'tool/result' }), null);
});
