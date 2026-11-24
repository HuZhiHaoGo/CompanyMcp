import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
    if (action === 'DescribeKnowledgeBases') return Response.json({ total: libraries.length, data: libraries.map(id => typeof id === 'string' ? { id, name: id } : id) });
    return fetcher(action, body, request.signal);
  } });
  service.searchGate = new SearchGate(2, 0);
  service.store = {
    save: async value => snapshots.set(value.id, structuredClone(value)),
    load: async id => structuredClone(snapshots.get(id)),
  };
  return { service, snapshots };
}

test('越南别名归并、装置组成和差旅城市档次各自保留有依据的切片', async () => {
  const { service } = fixture(['rules'], (_action, body) => {
    if (body.query.includes('越南')) return response(
      chunk('rules', 'vn', '越南国情简述：首都河内，地处中南半岛。', 0.75, { document_name: '国别手册【越南】.docx' }),
      chunk('rules', 'other', '乌拉圭国情简述：首都蒙得维的亚。', 0.91, { document_name: '国别手册【乌拉圭】.docx' }),
    );
    if (body.query.includes('装置')) return response(
      chunk('rules', 'technical', '本装置由光纤温度传感器、主机和连接附件组成。', 0.73, { document_name: '变压器用绕组光纤测温装置.pdf' }),
      chunk('rules', 'wrong-device', '本装置由采集和网络模块组成。', 0.95, { document_name: '变压器油位监测装置.pdf' }),
    );
    return response(
      chunk('rules', 'staff-band', '中层管理人员赴省会城市出差，伙食补助按标准表执行。', 0.82, { document_name: '差旅费管理办法.docx' }),
      chunk('rules', 'city-band', '长沙按省会城市档列入差旅补助范围。', 0.80, { document_name: '差旅费城市档次表.docx' }),
      chunk('rules', 'other-staff', '非中层干部赴长沙出差，每天伙食补助 30 元。', 0.91, { document_name: '差旅费管理办法.docx' }),
    );
  });
  const vietnam = await service.search({ query: '越南的国情是什么？' });
  assert.equal(vietnam.model.evidenceStatus, 'matched');
  assert.deepEqual(vietnam.model.citations.map(c => c.chunkId), ['vn']);
  const technical = await service.search({ query: '变压器用绕组光纤测温装置有哪几个部分构成' });
  assert.equal(technical.model.evidenceStatus, 'matched');
  assert.deepEqual(technical.model.citations.map(c => c.chunkId), ['technical']);
  const travel = await service.search({ query: '中干出差长沙的补贴标准是怎么样的？' });
  assert.equal(travel.model.evidenceStatus, 'partial');
  assert.deepEqual(travel.model.citations.map(c => c.chunkId), ['staff-band', 'city-band']);
  assert.ok(travel.model.citations.every(c => c.support === 'related'));
});

test('无别名的新制度库支持员工口语，引用正文可复核并排除访客办理', async () => {
  const passage = '员工证件遗失补办：在行政服务平台提交补办申请，领取新证件。';
  const { service, snapshots } = fixture(['employee-policy'], action => action === 'DescribeChunk'
    ? Response.json({ id: 'badge', knowledgeBaseId: 'employee-policy', content: '访客出入登记流程。' }) : response(
    chunk('employee-policy', 'visitor', '访客工牌丢了可向保安登记。访客证办理只适用于来访人员。', 0.96),
    chunk('employee-policy', 'badge', passage, 0.73, { document_id: 'badge-policy' }),
  ));
  let calls = 0;
  const result = await service.search({ query: '员工工牌丢了怎么补？' }, undefined, false, async input => {
    calls++;
    assert.equal(input.query, '员工工牌丢了怎么补？');
    assert.equal(input.candidates.length, 2);
    assert.doesNotMatch(JSON.stringify(input), /rank_score|knowledgebase_id|access_key/);
    return JSON.stringify({ decisions: [
      { id: input.candidates.find(c => c.text.includes('访客')).id, kind: 'unrelated' },
      { id: input.candidates.find(c => c.text.includes('行政服务平台')).id, kind: 'direct', topics: [0], quote: passage },
    ] });
  });
  assert.equal(calls, 1);
  assert.equal(result.model.evidenceStatus, 'matched');
  assert.deepEqual(result.model.citations.map(c => c.chunkId), ['badge']);
  const stored = snapshots.get(result.view.snapshotId);
  assert.ok(stored.citations[0].semanticEvidence.fingerprint);
  const display = await service.snapshot(result.view.snapshotId);
  assert.equal(display.citations[0].semanticEvidence, undefined);
  assert.equal(display.citations[0].documentId, 'badge-policy');
  const refreshed = await service.detail(result.view.snapshotId, result.model.citations[0].citationId);
  assert.equal(refreshed.model.hitCount, 0, '旧语义复核与原正文绑定');
});

test('首次语义召回复核不足时保留原问题补检，新切片再复核才可引用', async () => {
  const queries = [];
  const passage = '员工证件遗失补办：登录行政服务平台，选择证件补办并提交申请。';
  const { service } = fixture(['new-policy', 'outside'], (_action, body) => {
    const [library] = body.knowledgebase_ids;
    queries.push([library, body.query]);
    return body.query.includes('证件遗失补办') ? response(
      chunk(library, 'heading', '员工证件遗失补办。当前章节只有目录，具体流程待补充。', 0.93),
      chunk(library, 'detail', passage, 0.8),
    ) : response();
  });
  let calls = 0;
  const query = '员工工牌丢了怎么补？';
  const result = await service.search({ query, knowledge_base_ids: ['new-policy'] }, undefined, false, async input => {
    if (++calls === 1) {
      assert.deepEqual(input.candidates, []);
      return JSON.stringify({ decisions: [], rewrite: '员工证件遗失补办' });
    }
    assert.equal(input.query, query);
    return JSON.stringify({ decisions: [
      { id: 1, kind: 'unrelated' },
      { id: 2, kind: 'direct', topics: [0], quote: passage },
    ] });
  });
  assert.equal(calls, 2);
  assert.deepEqual(queries, [['new-policy', query], ['new-policy', query + ' 员工证件遗失补办']]);
  assert.deepEqual(result.model.citations.map(c => c.chunkId), ['detail']);
});

test('语义复核拒绝捏造的引文，且不能越过已指定的国家范围', async () => {
  const passage = '巴西地理气象条件：雨季集中在十月至翌年三月。';
  const { service } = fixture(['manuals'], () => response(
    chunk('manuals', 'br', passage, 0.92, { document_name: '巴西国别手册' }),
  ));
  const result = await service.search({ query: '乌拉圭的地理气象条件' }, undefined, false, async () =>
    JSON.stringify({ decisions: [{ id: 1, kind: 'direct', topics: [0], quote: passage }] }));
  assert.equal(result.model.hitCount, 0);
  const invalid = await service.search({ query: '工牌丢了怎么补' }, undefined, false, async () =>
    JSON.stringify({ decisions: [{ id: 1, kind: 'direct', topics: [0], quote: '员工可在行政平台补办工牌' }] }));
  assert.equal(invalid.model.evidenceStatus, 'none');
  assert.equal(invalid.model.hitCount, 0);
});

test('意图不清时以澄清提示收尾，不根据猜测发起补检', async () => {
  let searches = 0;
  const { service } = fixture(['policy'], () => { searches++; return response(); });
  const result = await service.search({ query: '这张卡要怎么弄' }, undefined, false, async () =>
    JSON.stringify({ decisions: [], needsClarification: true, rewrite: '员工证件补领' }));
  assert.equal(searches, 1);
  assert.equal(result.model.hitCount, 0);
  assert.match(result.view.clarification, /补充.*场景/);
});

test('明确证据走原路径，语义超时或取消无法产生推测证据', async () => {
  const { service, snapshots } = fixture(['plm'], () => response(
    chunk('plm', 'direct', '未创建配置型材料件，请进入产品数据系统创建配置型材料件。', 0.83),
  ));
  let calls = 0;
  const direct = await service.search({ query: '未创建配置型材料件，我该怎么办？' }, undefined, false, async () => { calls++; });
  assert.equal(direct.model.hitCount, 1);
  assert.equal(calls, 0);
  service.config.retrieval = { libraryTimeoutMs: 35, roundTimeoutMs: 60 };
  const timeout = await service.search({ query: '工牌丢了怎么补' }, undefined, false, async (_input, signal) => {
    calls++;
    await sleep(5000, undefined, { signal });
  });
  assert.equal(calls, 1);
  assert.equal(timeout.model.hitCount, 0);
  const count = snapshots.size;
  const abort = new AbortController();
  await assert.rejects(service.search({ query: '工牌丢了怎么补' }, abort.signal, false, async () => {
    abort.abort();
  }), /abort/i);
  assert.equal(snapshots.size, count);
});

test('现场 PLM 误召回回归，高分电力 PDF 被排除，直接证据先于相近报错', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-diagnostics-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const { service } = fixture(['mixed'], () => response(
    chunk('mixed', 'accident', '配置足够的继电保护备品备件，对书面说明材料和结构配置文件进行确认。', 0.99, { document_name: '防止电力生产事故要求.pdf' }),
    chunk('mixed', 'unreleased', '配置型材料件处于正在工作，未发布，请提交材料件审签升级请求。', 0.93),
    chunk('mixed', 'missing', '未查找到配置型原材料，由 PLM 管理员处理。', 0.92),
    chunk('mixed', 'create', '未创建配置型材料件。操作为创建配置型材料件，填写参数后发布。', 0.68, { document_name: '019_未创建配置型材料件.docx' }),
  ), { perLibraryTop: 4, diagnostics: true });
  service.config.diagnosticsDirectory = directory;
  const primary = await service.search({ query: '未创建配置型材料件，我该怎么办？' });
  assert.deepEqual(primary.model.citations.map(item => item.chunkId), ['create', 'unreleased', 'missing']);
  const trace = JSON.parse((await fs.readFile(path.join(directory, 'dsh-mcp-tbea-knowledge.jsonl'), 'utf8')).trim());
  assert.equal(trace.searchId, primary.view.snapshotId);
  assert.equal(trace.candidates.find(item => item.chunkId === 'accident').reason, 'no-topic');
  assert.equal(trace.candidates.find(item => item.chunkId === 'accident').score, 0.99);
  assert.doesNotMatch(JSON.stringify(trace), /继电保护备品|书面说明材料|填写参数|凭证/);
  assert.equal((await service.snapshot(primary.view.snapshotId)).citations.length, 3);
  const electrical = await service.search({ query: '继电保护装置的备品备件要求' });
  assert.equal(electrical.model.citations[0]?.chunkId, 'accident');
});

test('新授权制度库按主题优先查询，口语不足时补检，发票入账与差旅报账分开', async () => {
  const libraries = [{ id: 'finance', name: '财务入账' }, 'standards'];
  const requests = [];
  const { service } = fixture(libraries, (_action, body) => {
    const [id] = body.knowledgebase_ids;
    requests.push([id, body.query]);
    if (id === 'finance') return response(chunk(id, 'invoice', '供应商发票提交应付账款入账，会计凭证登记。', 0.94));
    if (id !== 'rules') return response();
    return response(
      ...(body.query.includes('差旅费报销流程') ? [chunk(id, 'reimburse', '差旅费报销流程：提交费用发票并审批。', 0.8)] : []),
      chunk(id, 'hotel-policy', '出差住宿按城市执行住宿费报销上限，甲类城市 500 元。', 0.78),
      chunk(id, 'purchase', '办公用品采购报销流程：凭发票办理。', 0.95),
    );
  });
  await service.search({ query: '出差回来怎么报账？' });
  libraries.push({ id: 'rules', name: '公司规章制度', description: '差旅及员工费用报销' });
  service.directory.expiresAt = 0;
  requests.length = 0;
  const formal = await service.search({ query: '差旅费报销流程是什么？' });
  assert.deepEqual(formal.model.citations.map(item => item.chunkId), ['reimburse']);
  assert.deepEqual(formal.view.coverage, { completed: 1, requested: 1, available: 3 });
  assert.equal(requests.length, 1);
  requests.length = 0;
  const colloquial = await service.search({ query: '出差回来怎么报账？' });
  assert.deepEqual(colloquial.model.citations.map(item => item.chunkId), ['reimburse']);
  assert.ok(requests.some(([id, q]) => id === 'rules' && q === '出差回来怎么报账？ 差旅费报销流程'));
  const lodging = await service.search({ query: '住酒店最多能报多少？' });
  assert.deepEqual(lodging.model.citations.map(item => item.chunkId), ['hotel-policy']);
  const invoice = await service.search({ query: '供应商发票怎么入账？' });
  assert.deepEqual(invoice.model.citations.map(item => item.chunkId), ['invoice']);
  assert.match((await service.search({ query: '怎么报账？' })).model.notice, /请先确认/);
});

test('两国各自计覆盖，相邻国家的顺带提及不足以支持结论', async () => {
  const { service } = fixture(['countries'], () => response(
    chunk('countries', 'uy', '乌拉圭地理气象条件：年降雨量 950 毫米。', 0.8),
    chunk('countries', 'br', '巴西地理简述：西部毗邻乌拉圭，这里讲的是巴西的国情。', 0.9),
  ));
  const compared = await service.search({ query: '乌拉圭和巴西的地理气象条件' });
  assert.equal(compared.model.evidenceStatus, 'partial');
  assert.match(compared.model.missingTopics.join(), /巴西/);
  assert.deepEqual(compared.model.citations.map(item => item.chunkId), ['uy']);
  assert.equal((await service.search({ query: '乌拉圭的国情简述' })).model.hitCount, 0);
});

test('自定义同义短语可用于新增制度，显式版本排除旧制度', async () => {
  const { service } = fixture(['rules'], () => response(
    chunk('rules', 'old', '合同盖章申请需要提交审批。', 0.96,
      { original_document_id: 'seals-policy', document_version: '2024', effective_date: '2024-01-01' }),
    chunk('rules', 'current', '合同印章使用申请需要提交审批。', 0.8,
      { original_document_id: 'seals-policy', document_version: '2026', effective_date: '2026-01-01' }),
  ), { synonyms: [{ term: '印章使用', aliases: ['盖章'], context: ['合同'] }] });
  const { model, view } = await service.search({ query: '合同怎么盖章？2026版' });
  assert.deepEqual(model.citations.map(item => item.chunkId), ['current']);
  assert.equal(model.citations[0].effectiveDate, '2026-01-01');
  assert.match((await service.snapshot(view.snapshotId)).citations[0].documentGroupId, /^[0-9a-f]{64}$/);
});

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
