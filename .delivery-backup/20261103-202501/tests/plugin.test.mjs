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
  module.apply({ effect: fn => effects.push(fn()), connection: { rpc: { call: async () => ({ ok: true, value: {} }) } }, slots: { inject: (_slot, fn) => fn(), register: (spec, component) => { keys.push(spec.key); assert.equal(typeof component, 'function'); assert.equal(typeof spec.inject().bridge, 'function'); } } });
  assert.deepEqual(keys, ['mcp__tbea__search_knowledge', 'mcp__tbea__get_chunk_detail']);
  for (const cleanup of effects) cleanup();
});
