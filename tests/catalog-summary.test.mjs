import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { summarizeKnowledgeBases } from '../src/catalog-summary.ts';
import { createCatalogHint } from '../plugin/src/catalog-hint.mjs';

test('知识库主题摘要仅包含去重后的名称和描述，并限制序列化长度', () => {
  const catalog = [
    { id: 'private-id', name: '采购制度', description: '供应商准入\n与复审', documents: ['未授权文档'] },
    { id: 'same-topic', name: '采购制度', description: '供应商准入 与复审' },
    { id: 'invisible-id', name: 'invisible-id' },
    { id: 'without-description', name: '标准件' },
  ];
  const result = summarizeKnowledgeBases(catalog);
  assert.deepEqual(result.topics, [{ name: '采购制度', description: '供应商准入 与复审' }, { name: '标准件' }].sort((a, b) => a.name < b.name ? -1 : 1));
  assert.equal(result.truncated, false);
  assert.deepEqual(result, summarizeKnowledgeBases([...catalog].reverse()));
  assert.doesNotMatch(JSON.stringify(result), /private-id|invisible-id|未授权文档/);

  const long = summarizeKnowledgeBases(Array.from({ length: 25 }, (_, i) => ({
    name: `制度${i}`, description: '"\\🌏'.repeat(150),
  })));
  assert.ok(long.topics.length <= 12);
  assert.ok(JSON.stringify(long.topics).length <= 1600);
  assert.equal(long.truncated, true);
});

test('后台目录加载不等待外部接口，有效期内复用，失败不回退旧摘要', async () => {
  const lifetime = new AbortController();
  let time = 0;
  let requests = 0;
  let complete;
  let fail;
  const hint = createCatalogHint({
    signal: lifetime.signal,
    now: () => time,
    load: () => { requests++; return new Promise((resolve, reject) => { complete = resolve; fail = reject; }); },
  });
  assert.equal(hint(), '');
  assert.equal(hint(), '');
  assert.equal(requests, 1, '合并并发预热');
  complete({ topics: [{ name: '原有目录' }], expiresAt: 60 });
  await setImmediate();
  assert.match(hint(), /原有目录/);
  time = 61;
  assert.equal(hint(), '');
  fail(new DOMException('Timeout', 'TimeoutError'));
  await setImmediate();
  assert.equal(hint(), '');
  assert.equal(requests, 2, '失败冷却期间不重复获取');
  time += 15000;
  assert.equal(hint(), '');
  complete({ topics: [{ name: '新目录' }], expiresAt: time + 60 });
  await setImmediate();
  assert.match(hint(), /新目录/);
  assert.doesNotMatch(hint(), /原有目录/);
  lifetime.abort();
  assert.equal(hint(), '');
});
