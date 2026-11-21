import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';

test('浏览器产物符合 Harness 模块工厂和 keyed toolview 注册契约', async () => {
  const require = createRequire(import.meta.url); let module;
  const window = { __ModuleLoader__: { load: row => { assert.equal(row.id, 'dsh-plugin-tbea-knowledge'); module = row.factory(require); } } };
  const document = { createElement: () => ({ dataset: {}, remove() {} }), head: { append() {} } };
  vm.runInNewContext(await fs.readFile(new URL('../plugin/lib/client.js', import.meta.url), 'utf8'), { window, document, console, setTimeout, clearTimeout });
  assert.equal(typeof module.apply, 'function'); const keys = []; const effects = [];
  const commands = []; const sources = []; const definitions = [];
  module.apply({ effect: fn => { const cleanup = fn(); if (cleanup) effects.push(cleanup); }, connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
    commandUi: { register: row => { commands.push(row); } }, inputTriggers: { registerSource: row => { sources.push(row); } }, uiConversation: { events: { register: row => { definitions.push(row); } } },
    slots: { inject: (_slot, fn) => fn(), register: (spec, component) => { keys.push(spec.key || spec.id); assert.equal(typeof component, 'function'); const injected = spec.inject('session-a'); assert.ok(typeof injected.bridge === 'function' || injected.selection); } },
  });
  assert.deepEqual(keys, ['mcp__tbea__search_knowledge', 'mcp__tbea__get_chunk_detail', 'tbea-knowledge', 'tbea-knowledge-prefetch']);
  assert.equal(commands[0].label(), '公司知识库'); assert.equal(sources[0].trigger, '@'); assert.equal(definitions[0].kind, 'tbea-knowledge-prefetch');
  for (const cleanup of effects) cleanup();
});
