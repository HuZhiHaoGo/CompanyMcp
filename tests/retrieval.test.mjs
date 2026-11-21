import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { KnowledgeService } from '../src/knowledge.ts';
import { SearchGate } from '../src/gate.ts';
import { PLATFORM_SEARCH_PATH, PLATFORM_CHUNK_PATH } from '../src/config.ts';

const chunk = (libraryId, id, content, score, extra = {}) => ({
  knowledgebase_id: libraryId, chunk_id: id, document_name: '试点资料', content, rank_score: score, ...extra,
});
const response = (...chunks) => Response.json({ chunks, total_count: 99 });

function fixture(libraries, fetcher, retrieval) {
  const config = {
    mode: 'live', knowledgeDirectory: { mode: 'auto', refreshSeconds: 60 }, knowledgeBases: [],
    platform: { projectId: 'test', accessKey: 'test', secretKey: 'test', searchPath: PLATFORM_SEARCH_PATH,
      chunkPath: PLATFORM_CHUNK_PATH, rerankModelName: 'bce-reranker-base-v1', rankScoreThreshold: 0.4 },
    limits: { top: 10, maxEvidenceChunks: 5, maxTextCharacters: 3000, maxQueryCharacters: 1024 },
    retrieval,
  };
  const snapshots = new Map();
  const service = new KnowledgeService(config, { fetcher: (url, request) => {
    const action = url.searchParams.get('Action');
    const body = JSON.parse(request.body);
    if (action === 'DescribeKnowledgeBases') return Response.json({ total: libraries.length, data: libraries.map(id => ({ id, name: id })) });
    return fetcher(action, body, request.signal);
  } });
  service.searchGate = new SearchGate(2, 0);
  service.store = {
    save: async value => snapshots.set(value.id, structuredClone(value)),
    load: async id => structuredClone(snapshots.get(id)),
  };
  return { service, snapshots };
}

test('七库独立召回，库目录顺序改变后原文仍排第一，新授权库在刷新后加入', async () => {
  const ids = ['travel', 'rules', 'plm', 'design', 'scans', 'book-custom', 'book-normal'];
  const requests = [];
  const { service } = fixture(ids, (_action, body) => {
    assert.equal(body.top, 3);
    assert.equal(body.rerankModelName, 'bce-reranker-base-v1');
    assert.equal(body.knowledgebase_ids.length, 1);
    const [id] = body.knowledgebase_ids;
    requests.push(id);
    if (id === 'book-normal') return response(chunk(id, 'original', '乌拉圭地理概况与首都。', 0.742));
    if (id === 'book-custom') return response(chunk(id, 'custom', '乌拉圭地理概况与首都。附录信息。', 0.736));
    if (id === 'travel') return response(chunk(id, 'expenses', '差旅报销制度。', 0.501));
    if (id === 'new-book') return response(chunk(id, 'new', '乌拉圭地理概况补充材料。', 0.8));
    return response();
  });
  const query = '乌拉圭地理概况';
  const first = await service.search({ query });
  assert.deepEqual(first.model.citations.map(c => c.chunkId), ['original', 'custom']);
  assert.deepEqual(first.view.coverage, { completed: 7, requested: 7 });
  assert.equal(first.model.totalCount, 3, '统计实际拿到的候选，而非各库 total_count 之和');
  assert.deepEqual([...requests].sort(), [...ids].sort());
  ids.reverse();
  service.directory.expiresAt = 0;
  const second = await service.search({ query });
  assert.deepEqual(second.model.citations.map(c => c.chunkId), first.model.citations.map(c => c.chunkId));
  ids.push('new-book');
  service.directory.expiresAt = 0;
  const added = await service.search({ query });
  assert.equal(added.model.citations[0].chunkId, 'new');
  assert.deepEqual(added.view.coverage, { completed: 8, requested: 8 });
});

test('筛除高分错库、错国家、缺分数和只有标题匹配的切片，识别部分证据', async () => {
  const query = '乌拉圭地区一般的常见电压及其对应的绝缘一般是多少？';
  const uruguay = { document_name: '国别手册（Uruguay）.docx' };
  const { service } = fixture(['rules', 'countries', 'wrong-country'], (_action, body) => {
    assert.equal(body.rank_score_threshold, 0.4);
    const [library] = body.knowledgebase_ids;
    if (library === 'rules') return response(
      chunk(library, 'expenses', '赴乌拉圭的出差费用按公司制度报销。', 0.501),
      chunk(library, 'title-only', '本文件介绍申请流程。', 0.98, { document_name: '乌拉圭常见电压及绝缘' }),
    );
    if (library === 'wrong-country') return response(chunk(library, 'wrong-country', '越南电网电压及绝缘参数。', 0.93));
    return response(
      chunk(library, 'missing-score', '乌拉圭绝缘参数。', undefined, { score: 0.99 }),
      chunk(library, 'bad-score', '乌拉圭绝缘参数。', '0.99'),
      chunk(library, 'voltage', '| 项目 | 内容 |\n| --- | --- |\n| 电压 | 合成测试值 |', 0.4469, uruguay),
    );
  });
  const { model, view } = await service.search({ query });
  assert.equal(model.totalCount, 6);
  assert.deepEqual(model.citations.map(item => item.chunkId), ['voltage']);
  assert.equal(model.evidenceStatus, 'partial');
  assert.deepEqual(model.missingTopics, ['绝缘']);
  assert.match(model.notice, /仅回答有直接依据的部分/);
  assert.deepEqual((await service.snapshot(view.snapshotId)).citations.map(item => item.chunkId), ['voltage']);
  const absent = await service.search({ query, knowledge_base_ids: ['rules', 'wrong-country'] });
  assert.equal(absent.model.evidenceStatus, 'none');
  assert.match(absent.model.notice, /未找到能支持问题的公司资料/);
  assert.deepEqual(absent.model.citations, []);
});

test('多事项优先覆盖未回答部分，证据阈值可独立于召回阈值', async () => {
  const { service } = fixture(['country'], (_action, body) => {
    assert.equal(body.rank_score_threshold, 0.4);
    return response(
      chunk('country', 'first', '乌拉圭电压 A。', 0.8),
      chunk('country', 'duplicate-topic', '乌拉圭电压 B。', 0.7),
      chunk('country', 'other-topic', '乌拉圭绝缘 C。', 0.5),
    );
  }, { evidenceScoreThreshold: 0.48 });
  service.config.limits.maxEvidenceChunks = 2;
  const query = '乌拉圭电压以及绝缘要求是什么？';
  const full = await service.search({ query });
  assert.deepEqual(full.model.citations.map(item => item.chunkId), ['first', 'other-topic']);
  assert.equal(full.model.evidenceStatus, 'matched');
  service.config.retrieval.evidenceScoreThreshold = 0.55;
  const partial = await service.search({ query });
  assert.equal(partial.model.evidenceStatus, 'partial');
  assert.deepEqual(partial.model.missingTopics, ['绝缘']);
});

test('核对标准编号并阻止详情刷新绕过证据筛选', async () => {
  const { service } = fixture(['design'], (action) => {
    if (action === 'DescribeChunk') return Response.json({ id: 'standard', knowledgeBaseId: 'design', content: '费用报销流程。' });
    return response(
      chunk('design', 'other', '绝缘结构说明。', 0.9, { document_name: 'IEC 60076-30' }),
      chunk('design', 'bad-format', '绝缘结构说明。', 0.89, { document_name: 'IEC 600763' }),
      chunk('design', 'standard', '绝缘结构说明。', 0.48, { document_name: 'IEC 60076-3:2013' }),
    );
  });
  const { model, view } = await service.search({ query: 'IEC 60076-3 的绝缘要求是什么？' });
  assert.deepEqual(model.citations.map(item => item.chunkId), ['standard']);
  const detail = await service.detail(view.snapshotId, model.citations[0].citationId);
  assert.equal(detail.model.evidenceStatus, 'none');
  assert.deepEqual(detail.model.citations, []);
  assert.equal((await service.snapshot(view.snapshotId)).citations[0].content, '费用报销流程。', '界面仍可检查平台返回的详情');
});

test('明显的独立算术误调用不发平台请求，手动查库仍真正调用平台', async () => {
  let calls = 0;
  const { service } = fixture(['design'], (_action, body) => {
    calls++;
    return response(chunk('design', 'unrelated', '设计图纸文件归档。', 0.95));
  });
  const query = '请问 2 + 2 等于几？';
  const automatic = await service.search({ query });
  assert.equal(calls, 0);
  assert.equal(automatic.model.evidenceStatus, 'not_needed');
  assert.equal((await service.snapshot(automatic.view.snapshotId)).retrievalSkipped, true);
  const manual = await service.call('search_knowledge', { query }, undefined, true);
  assert.equal(calls, 1);
  assert.equal(manual.model.evidenceStatus, 'none');
  await service.search({ query: '2026-11-19' });
  assert.equal(calls, 2, '带横线的日期和文档编号不能被当作算术直接跳过');
});

test('相同证据合并，保留独立来源和详情，图片或版本不同则分列', async () => {
  const ids = ['a', 'b', 'c', 'd'];
  const content = '乌拉圭地理概况。';
  const { service } = fixture(ids, (action, body) => {
    if (action === 'DescribeChunk') return Response.json({ id: body.chunkId, knowledgeBaseId: body.knowledgeBaseId, content: '乌拉圭资料来源 B 详情。' });
    const [id] = body.knowledgebase_ids;
    if (id === 'a') return response(chunk(id, 'a', content, 0.8));
    if (id === 'b') return response(chunk(id, 'b', '乌拉圭地理\n概况。', 0.8), chunk('a', 'foreign', '不应显示', 1));
    if (id === 'c') return response(chunk(id, 'c', content, 0.7, { images: ['https://ai.tbea.com/example.png?X-Amz-Signature=demo'] }));
    return response(chunk(id, 'd', content, 0.6, { meta: { version: '2026' } }));
  });
  const { model, view } = await service.search({ query: '乌拉圭' });
  assert.deepEqual(model.citations.map(c => c.chunkId), ['a', 'c', 'd']);
  const snapshot = await service.snapshot(view.snapshotId);
  const [primary] = snapshot.citations;
  assert.deepEqual(primary.equivalentSources.map(c => c.chunkId), ['b']);
  assert.ok(!JSON.stringify(snapshot).includes('Signature'));
  const [alternate] = primary.equivalentSources;
  const detail = await service.detail(view.snapshotId, alternate.citationId);
  assert.equal(detail.model.citations[0].text, '乌拉圭资料来源 B 详情。');
  assert.equal((await service.snapshot(view.snapshotId)).citations[0].content, content);
  ids.splice(ids.indexOf('b'), 1);
  service.directory.expiresAt = 0;
  assert.deepEqual((await service.snapshot(view.snapshotId)).citations[0].equivalentSources, []);
  await assert.rejects(service.detail(view.snapshotId, alternate.citationId), { code: 'KNOWLEDGE_BASE_DENIED' });
});

test('部分请求超时或失败仍保留可用证据，区分部分无结果和全部失败', async () => {
  let calls = 0;
  const { service } = fixture(['a', 'b', 'c'], async (_action, body, signal) => {
    calls++;
    const [id] = body.knowledgebase_ids;
    if (id === 'a') {
      if (body.query === '核对图纸') return response(chunk(id, 'found', '核对图纸时检查审批记录。', 0.8));
      if (body.query === '无依据') return response();
    }
    if (id === 'b') await sleep(1000, undefined, { signal });
    return new Response('内部错误', { status: 500 });
  }, { libraryTimeoutMs: 35, roundTimeoutMs: 300 });
  const found = await service.search({ query: '核对图纸' });
  assert.deepEqual(found.model.coverage, { completed: 1, requested: 3 });
  assert.deepEqual(found.view.coverage, found.model.coverage);
  assert.match(found.model.notice, /说明检索范围不完整/);
  assert.equal(found.model.hitCount, 1);
  const empty = await service.search({ query: '无依据' });
  assert.equal(empty.model.hitCount, 0);
  assert.deepEqual(empty.model.coverage, found.model.coverage);
  await assert.rejects(service.search({ query: '全失败' }), { code: 'SEARCH_UNAVAILABLE' });
  assert.equal(calls, 9, '没有自动重发请求');
});

test('整轮到期时返回已完成部分，用户主动停止时不落检索快照', async () => {
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  const { service, snapshots } = fixture(['a', 'b', 'c'], async (_action, body, signal) => {
    const [id] = body.knowledgebase_ids;
    if (id === 'a' && body.query === '核对图纸') return response(chunk(id, 'a', '核对图纸时检查审批记录。', 0.8));
    if (body.query === '主动停止') started();
    await sleep(1000, undefined, { signal });
    return response();
  }, { libraryTimeoutMs: 70, roundTimeoutMs: 70 });
  const result = await service.search({ query: '核对图纸' });
  assert.equal(result.model.hitCount, 1);
  assert.deepEqual(result.view.coverage, { completed: 1, requested: 3 });
  const controller = new AbortController();
  const running = service.search({ query: '主动停止' }, controller.signal);
  const rejected = assert.rejects(running, /用户停止/);
  await waiting;
  controller.abort(new Error('用户停止'));
  await rejected;
  assert.equal(snapshots.size, 1);
});
