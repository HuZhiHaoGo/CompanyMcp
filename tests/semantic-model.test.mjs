import test from 'node:test';
import assert from 'node:assert/strict';
import { createSemanticModel } from '../plugin/src/semantic-model.mjs';

test('复用当前确认过的内网模型，模型请求只含当前问题和候选，禁用工具和历史', async () => {
  let baseURL = 'https://model.tbea.com/v1';
  const calls = [];
  const selected = { provider: 'internal', model: 'current' };
  const ctx = { get(name) {
    if (name === 'settings') return { describe(options) {
      assert.deepEqual(options, { redactSecrets: true });
      return [{ ns: 'profiles', value: { byName: { internal: { baseURL } } } }];
    } };
    if (name === 'llm') return {
      listConfigurableProviders: () => [{ provider: 'internal', settingsNs: 'profiles', settingsPath: ['byName', 'internal'] }],
      async prepareCall(config, signal) {
        calls.push({ config, signal });
        return { config, async *stream(request) {
          calls.push({ request });
          yield { type: 'reasoning-delta', index: 0, text: 'irrelevant' };
          yield { type: 'text-delta', index: 1, text: '{"decisions":[]}' };
          yield { type: 'finish', reason: { kind: 'stop' } };
        } };
      },
    };
  } };
  const model = createSemanticModel(ctx, { ctx, model: { current: () => selected } });
  const signal = new AbortController().signal;
  const input = { query: '工牌丢了怎么补', topics: [{ index: 0, label: '补办' }], candidates: [] };
  assert.equal(await model(input, signal), '{"decisions":[]}');
  assert.deepEqual(calls[0].config, { ...selected, maxTokens: 1000 });
  assert.equal(calls[1].request.messages.length, 1);
  assert.deepEqual(JSON.parse(calls[1].request.messages[0].content[0].text), input);
  assert.equal(calls[1].request.tools, undefined);
  assert.equal(calls[1].request.sessionId, undefined);
  baseURL = 'https://public.example/v1';
  assert.equal(createSemanticModel(ctx, { ctx }, selected), undefined);
  assert.equal(await model(input, signal), undefined);
  assert.equal(calls.length, 2);
});
