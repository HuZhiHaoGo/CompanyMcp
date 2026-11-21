import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { normalizeCitation, modelResult, publicSnapshot } from '../src/normalize.ts';
import { signedHeaders, platformJson, fetchPlatformImage } from '../src/platform.ts';
import { mockImage } from '../src/mock.ts';
import { SearchGate } from '../src/gate.ts';
import { PLATFORM_SEARCH_PATH, PLATFORM_CHUNK_PATH } from '../src/config.ts';
import { KnowledgeService } from '../src/knowledge.ts';

test('签名使用最终请求体与中国标准时间，不依赖宿主时区', () => {
  const body = '{"query":"设计"}'; const headers = signedHeaders({ accessKey: 'test-ak', secretKey: 'test-sk' }, body, new Date('2026-11-03T01:02:03Z'), 'test-request');
  assert.equal(headers['Sign-Time'], '2026-11-03 09:02:03');
  assert.equal(headers.Token, createHash('sha256').update(body + 'test-sk' + 'test-request' + headers['Sign-Time']).digest('hex'));
});

test('结构化解析图文及工程表格，图片信息不进入模型结果', () => {
  const raw = { knowledgebase_id: 'kb', chunk_id: 'c', content: '要求文字\n\n<figure><img src="https://ai.tbea.com/a.png?X-Amz-Signature=secret"><figcaption>图注</figcaption></figure>\n\n| 公式 | 单位 |\n| --- | --- |\n| A*B*C | mm |\n\n<script>alert(1)</script>' };
  const c = normalizeCitation(raw, 0, '12345678-1234-1234-1234-123456789012', [{ id: 'kb', name: '标准' }]);
  assert.equal(c.tables[0].rows[1][0].text, 'A*B*C');
  assert.equal(c.images.length, 1); assert.ok(!c.content.includes('<img')); assert.ok(!c.content.includes('alert'));
  const snapshot = { id: '12345678-1234-1234-1234-123456789012', mode: 'mock', query: '要求', totalCount: 1, citations: [c] };
  assert.ok(!JSON.stringify(modelResult(snapshot, 1000)).includes('Signature'));
  assert.ok(!JSON.stringify(publicSnapshot(snapshot)).includes('secret'));
  assert.ok(modelResult(snapshot, 1000).citations[0].text.includes('A*B*C'));
});

test('HTML 表格保留合并行列及内容，不执行原始 HTML', () => {
  const c = normalizeCitation({ content: '<table><tr><th colspan="2">标题</th></tr><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr></table>' }, 0, '12345678');
  assert.equal(c.tables[0].rows[0][0].colSpan, 2); assert.equal(c.tables[0].rows[1][0].rowSpan, 2);
});

test('HTTP 500 不重试，错误不包含上游敏感正文', async () => {
  let calls = 0;
  await assert.rejects(platformJson({ platform: { secretKey: 'x', timeoutMs: 1000 } }, '/test', {}, undefined, async () => { calls++; return new Response('secret body', { status: 500 }); }), error => error.message === '平台请求失败（HTTP 500）');
  assert.equal(calls, 1);
});

test('正式检索读取完整分页、逐库发送 ID 与重排模型、过滤弱相关切片，目录撤权后拒绝旧来源', async () => {
  const requests = [];
  let available = ['book-a', 'book-b'];
  let repeatPage = false;
  const config = {
    mode: 'live', knowledgeBases: [], knowledgeDirectory: { mode: 'auto', refreshSeconds: 60 },
    platform: { projectId: 'proj-demo', accessKey: 'test', secretKey: 'test',
      searchPath: PLATFORM_SEARCH_PATH, chunkPath: PLATFORM_CHUNK_PATH, rerankModelName: 'bce-reranker-base-v1', rankScoreThreshold: 0.4 },
    limits: { top: 10, maxEvidenceChunks: 1, maxTextCharacters: 3000, maxQueryCharacters: 1024 },
  };
  const service = new KnowledgeService(config, { fetcher: async (url, request) => {
    const action = url.searchParams.get('Action');
    const body = JSON.parse(request.body);
    requests.push({ path: url.pathname, action, body });
    if (action === 'DescribeKnowledgeBases') {
      const id = available[repeatPage ? 0 : body.pageNo - 1];
      return Response.json({ total: available.length, data: [{ id, name: id }] });
    }
    if (action === 'DescribeChunk') return Response.json({ id: body.chunkId, knowledgeBaseId: body.knowledgeBaseId, content: '设计标准正文详情' });
    return Response.json({ total_count: 3, chunks: [
      { knowledgebase_id: 'book-a', chunk_id: 'weak', content: '弱匹配', rank_score: 0.2 },
      { knowledgebase_id: 'book-b', chunk_id: 'strong', content: '设计标准正文', rank_score: 0.6 },
      { knowledgebase_id: 'book-a', chunk_id: 'more', content: '另一条设计标准正文', rank_score: 0.5 },
    ].filter(chunk => body.knowledgebase_ids.includes(chunk.knowledgebase_id)) });
  } });
  const snapshots = new Map();
  service.store = {
    save: async value => snapshots.set(value.id, structuredClone(value)),
    load: async id => structuredClone(snapshots.get(id)),
  };
  const { model, view } = await service.search({ query: '公司设计标准' });
  assert.deepEqual(requests.map(call => call.action), ['DescribeKnowledgeBases', 'DescribeKnowledgeBases', 'QueryKnowledge', 'QueryKnowledge']);
  assert.deepEqual(requests.slice(0, 2).map(call => call.body.pageNo), [1, 2]);
  assert.equal(requests[2].path, '/openapi/v1/knowledgeBase');
  assert.deepEqual(requests.slice(2).map(call => call.body.knowledgebase_ids), [['book-a'], ['book-b']]);
  assert.equal(requests[2].body.rerankModelName, 'bce-reranker-base-v1');
  assert.equal(requests[2].body.top, 3);
  assert.deepEqual(view.coverage, { completed: 2, requested: 2 });
  assert.equal(model.hitCount, 1);
  assert.equal(model.citations[0].chunkId, 'strong');
  const snapshot = await service.snapshot(view.snapshotId);
  const detail = await service.detail(view.snapshotId, snapshot.citations[0].citationId);
  assert.equal(detail.model.citations[0].text, '设计标准正文详情');
  assert.equal(requests.length, 5, '查看详情时复用尚未到期的目录');

  service.directory.expiresAt = 0;
  repeatPage = true;
  await assert.rejects(service.search({ query: '公司标准' }), { code: 'INVALID_KNOWLEDGE_DIRECTORY' });
  assert.equal(requests.at(-1).action, 'DescribeKnowledgeBases');
  repeatPage = false;
  available = ['book-a'];
  await assert.rejects(service.snapshot(view.snapshotId), { code: 'KNOWLEDGE_BASE_DENIED' });
});

test('预签名图片不叠加 Bearer，拒绝其他主机和非图像字节', async () => {
  const config = { platform: { assetAuth: 'bearer', assetApiKey: 'secret', timeoutMs: 1000 }, limits: { maxImageBytes: 100000 } };
  let headers;
  const image = await fetchPlatformImage(config, 'https://ai.tbea.com/a.png?X-Amz-Signature=abc', undefined, async (_url, options) => { headers = options.headers; const image = mockImage(); return new Response(image.bytes, { headers: { 'content-type': image.type } }); });
  assert.equal(headers.Authorization, undefined); assert.ok(image.bytes.length > 100);
  await assert.rejects(fetchPlatformImage(config, 'https://example.com/a.png'), /不属于/);
  await assert.rejects(fetchPlatformImage(config, 'https://ai.tbea.com/a.png', undefined, async () => new Response('html', { headers: { 'content-type': 'image/png' } })), /内容与类型/);
});

test('等待中的检索可取消，并遵守全局并发上限', async () => {
  const gate = new SearchGate(1, 1); let active = 0; let maximum = 0; let release;
  const first = gate.run(undefined, async () => { active++; maximum = Math.max(maximum, active); await new Promise(resolve => { release = resolve; }); active--; });
  await new Promise(resolve => setTimeout(resolve, 5));
  const controller = new AbortController(); let executed = false;
  const canceled = gate.run(controller.signal, async () => { executed = true; });
  const rejection = assert.rejects(canceled, /停止/); controller.abort(new Error('停止')); await rejection;
  release(); await first; assert.equal(executed, false); assert.equal(maximum, 1);
});
