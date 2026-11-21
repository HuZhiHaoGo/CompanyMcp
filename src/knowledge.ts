import { randomUUID } from 'node:crypto';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { normalizeCitation, modelResult, publicSnapshot, citationKnowledgeBaseId } from './normalize.ts';
import { Store, requireImageId, requireSnapshotId } from './store.ts';
import { listPlatformKnowledgeBases, detailPlatform, fetchPlatformImage, PlatformError } from './platform.ts';
import { mockChunks, mockImage } from './mock.ts';
import { SearchGate } from './gate.ts';
import { SharedTasks } from './shared-tasks.ts';
import { RETRIEVAL_DEFAULTS } from './config.ts';
import { retrieveLibraries, selectEvidence } from './retrieval.ts';
import type { CandidateDecision } from './retrieval.ts';
import { summarizeKnowledgeBases } from './catalog-summary.ts';
import { checkEvidence, evidenceScore, standaloneCalculation } from './evidence.ts';
import type { EvidenceDecision, EvidenceText } from './evidence.ts';
import { evidenceFingerprint, reviewCandidates } from './semantic.ts';
import type { SemanticModel, SemanticOutcome } from './semantic.ts';
import type { Citation, Coverage, Fetcher, ImageData, JsonRecord, KnowledgeBase, Mode, ServiceConfig, Snapshot } from './contracts.ts';

const allSources = (snapshot: Snapshot) => snapshot.citations.flatMap(c => [c, ...(c.equivalentSources || [])]);

export interface KnowledgeResult {
  model: ReturnType<typeof modelResult>;
  view: {
    schema: 'tbea-view/v1';
    snapshotId: string;
    count: number;
    query: string;
    mode: Mode;
    coverage?: Coverage;
    evidenceStatus?: ReturnType<typeof modelResult>['evidenceStatus'];
    clarification?: string;
  };
}

export const TOOLS = [
  { name: 'search_knowledge', description: '答案需要公司标准、内部流程、设计资料或其他公司文档时先检索；纯数学、用户已给出原文的翻译等通用问题直接回答。query 写清产品、地区、版本等已知条件，追问须带上此前已明确的对象，不明确时向用户澄清。默认覆盖本项目当前允许检索的全部知识库。只根据能直接支持结论的切片作答，标明缺少依据或检索范围不完整的部分。', inputSchema: { type: 'object', properties: { query: { type: 'string', description: '检索问题，最多1024字符' }, knowledge_base_ids: { type: 'array', items: { type: 'string' }, description: '仅在用户明确要求限定范围且已知库 ID 时填写，省略则检索完整可用范围' }, top: { type: 'integer', minimum: 1, maximum: 20, description: '请求的证据数量上限，仍受每库候选和服务端证据上限约束' } }, required: ['query'], additionalProperties: false } },
  { name: 'get_chunk_detail', description: '查看此前检索结果的完整切片文字。仅接受 search_knowledge 返回的 snapshotId 和 citationId；适用于证据被截断或需要核对上下文。', inputSchema: { type: 'object', properties: { snapshotId: { type: 'string' }, citationId: { type: 'string' } }, required: ['snapshotId', 'citationId'], additionalProperties: false } },
] satisfies Tool[];

export function toolDescription(tool: Pick<Tool, 'name' | 'description'> & { description: string }, config: ServiceConfig) {
  if (tool.name !== 'search_knowledge' || (config.mode === 'live' && config.knowledgeDirectory?.mode === 'auto')) return tool.description;
  const names = config.knowledgeBases.map(k => `${k.name} (${k.id})`).join('；');
  return names ? `${tool.description} 可用知识库：${names}` : tool.description;
}

export class KnowledgeService {
  readonly config: ServiceConfig;
  private readonly fetcher?: Fetcher;
  private readonly store: Store;
  private readonly imageTasks = new SharedTasks<ImageData>();
  private readonly detailTasks = new SharedTasks<KnowledgeResult>();
  private readonly directoryTasks = new SharedTasks<KnowledgeBase[]>();
  private readonly snapshotUpdates = new Map<string, Promise<KnowledgeResult>>();
  private readonly searchGate = new SearchGate();
  private directory?: { entries: KnowledgeBase[]; expiresAt: number };

  constructor(config: ServiceConfig, { fetcher }: { fetcher?: Fetcher } = {}) {
    this.config = config;
    this.fetcher = fetcher;
    this.store = new Store(config);
  }
  async init() { await this.store.init(); }

  /** 缓存完整目录。到期后刷新失败时不再用旧目录授权历史来源。 */
  async catalog(signal?: AbortSignal): Promise<KnowledgeBase[]> {
    signal?.throwIfAborted();
    if (this.config.mode !== 'live' || this.config.knowledgeDirectory?.mode !== 'auto') return this.config.knowledgeBases;
    if (this.directory && this.directory.expiresAt > Date.now()) return this.directory.entries;
    return this.directoryTasks.run('project', signal, async sharedSignal => {
      const entries = await listPlatformKnowledgeBases(this.config, sharedSignal, this.fetcher);
      sharedSignal.throwIfAborted();
      this.directory = { entries, expiresAt: Date.now() + this.config.knowledgeDirectory.refreshSeconds * 1000 };
      return entries;
    });
  }

  async catalogSummary(signal?: AbortSignal) {
    const catalog = await this.catalog(signal);
    // 正式自动模式由搜索与摘要共享同一份完整目录及有效期。
    const expiresAt = this.config.mode === 'live' && this.config.knowledgeDirectory?.mode === 'auto'
      ? this.directory?.expiresAt ?? 0 : null;
    return { ...summarizeKnowledgeBases(catalog), expiresAt };
  }

  async search(args: JsonRecord, signal?: AbortSignal, manuallySelected = false, semanticModel?: SemanticModel): Promise<KnowledgeResult> {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query || query.length > this.config.limits.maxQueryCharacters) throw new PlatformError('INVALID_QUERY', `问题不能为空，且不能超过${this.config.limits.maxQueryCharacters}字符`);
    const top = args.top ?? this.config.limits.top;
    if (typeof top !== 'number' || !Number.isInteger(top) || top < 1 || top > 20) throw new PlatformError('INVALID_TOP', 'top 必须是1～20的整数');
    if (!manuallySelected && standaloneCalculation(query)) {
      // 模型误调用工具时，明显的独立算术题无需向公司平台发送请求。
      const snapshot: Snapshot = { schema: 'tbea-snapshot/v1', id: randomUUID(), mode: this.config.mode, query, createdAt: new Date().toISOString(), totalCount: 0, retrievalSkipped: true, citations: [] };
      await this.store.save(snapshot, signal);
      signal?.throwIfAborted();
      return this.result(snapshot);
    }
    const settings = { ...RETRIEVAL_DEFAULTS, ...this.config.retrieval };
    const deadline = AbortSignal.timeout(settings.roundTimeoutMs);
    const roundSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    const live = this.config.mode === 'live';
    const evidence = live ? checkEvidence(query, settings.synonyms) : undefined;
    const id = randomUUID();
    const started = performance.now();
    let catalog: KnowledgeBase[];
    try { catalog = await this.catalog(roundSignal); }
    catch (error) {
      signal?.throwIfAborted();
      if (deadline.aborted) throw new PlatformError('SEARCH_TIMEOUT', '读取知识库目录时超过本轮检索时限');
      throw error;
    }
    const allowed = new Set(catalog.map(k => k.id));
    const selected: unknown = args.knowledge_base_ids;
    let ids = allowed;
    if (selected != null) {
      if (!Array.isArray(selected) || !selected.every((item: unknown): item is string => typeof item === 'string' && allowed.has(item))) {
        throw new PlatformError('KNOWLEDGE_BASE_DENIED', '请求中包含未授权的知识库');
      }
      if (selected.length) ids = new Set(selected);
    }
    if (!ids.size) throw new PlatformError('EMPTY_KNOWLEDGE_DIRECTORY', '当前项目没有可查询的知识库，请检查项目和授权');
    if (evidence?.clarification) {
      signal?.throwIfAborted();
      const snapshot: Snapshot = { schema: 'tbea-snapshot/v1', id, mode: this.config.mode, query,
        createdAt: new Date().toISOString(), totalCount: 0, citations: [] };
      await this.store.save(snapshot, signal);
      signal?.throwIfAborted();
      return this.result(snapshot);
    }
    const limit = Math.min(top, this.config.limits.maxEvidenceChunks ?? 5);
    const threshold = live ? this.evidenceThreshold() : 0;
    let review: Awaited<ReturnType<typeof reviewCandidates>>;
    let semanticClarification = false;
    let semanticDeadline: AbortSignal | undefined;
    let semantic: SemanticOutcome = semanticModel ? 'local' : 'unavailable';
    const item = (citation: Citation) => ({ text: citation.modelText, documentName: citation.documentName,
      documentVersion: citation.documentVersion, effectiveDate: citation.effectiveDate });
    const noEvidence: EvidenceDecision = { topics: [], directTopics: [], quality: 0, reason: 'semantic-unrelated' };
    function evaluate(candidate: EvidenceText): EvidenceDecision {
      const local = evidence!.evaluate(candidate);
      if (semanticClarification) return noEvidence;
      if (!review) return local;
      const fingerprint = evidenceFingerprint(candidate);
      const decision = review.decisions.get(fingerprint);
      if (decision?.kind === 'unrelated') return local.directTopics.length && evidence!.confident(candidate) ? local : noEvidence;
      const scopes = evidence!.semanticTopics(candidate);
      const topics = decision?.kind === 'direct' ? decision.topics.filter(topic => scopes.includes(topic)) : [];
      return topics.length
        ? { topics, directTopics: topics, quality: 2, reason: 'semantic-direct' }
        : local;
    }
    const select = (chunks: readonly JsonRecord[], report?: (candidate: CandidateDecision) => void) =>
      selectEvidence(chunks, catalog, ids, id, limit, threshold, evidence && evaluate, report);
    const passes: { phase: string; attempted: number; completed: number; ms: number }[] = [];
    const candidates: CandidateDecision[] = [];
    const ranked = evidence ? catalog.filter(library => ids.has(library.id) && evidence.libraryPriority(library)).map(library => library.id) : [];
    const shortlist = (chunks: readonly JsonRecord[]) => chunks.filter(raw => ids.has(citationKnowledgeBaseId(raw)) && evidenceScore(raw.rank_score) >= threshold)
      .sort((a, b) => evidenceScore(b.rank_score) - evidenceScore(a.rank_score)).slice(0, 8)
      .map(raw => normalizeCitation(raw, 0, id, catalog));
    const result = this.config.mode === 'mock'
      ? { chunks: query.includes('无结果') ? [] : mockChunks([...ids]), coverage: undefined }
      : await retrieveLibraries({
        config: this.config, gate: this.searchGate, settings, query, ids, top, roundSignal, signal, fetcher: this.fetcher,
        priorityIds: ranked,
        supplement: evidence?.supplement && evidence.supplement.length <= this.config.limits.maxQueryCharacters ? evidence.supplement : undefined,
        enough: evidence && (chunks => evidence.summarize(select(chunks).map(c => ({ ...c, text: c.modelText }))).status === 'matched'),
        semanticSupplement: evidence && semanticModel && settings.semanticReview !== false ? async chunks => {
          const original = select(chunks).map(item);
          if (evidence.summarize(original.filter(evidence.confident)).status === 'matched') return undefined;
          semanticDeadline = AbortSignal.any([roundSignal, AbortSignal.timeout(10000)]);
          review = await reviewCandidates(semanticModel, query, shortlist(chunks), evidence.semanticQueryTopics, semanticDeadline);
          if (!review) { semantic = 'fallback'; return undefined; }
          const revised = evidence.summarizeDecisions(select(chunks).map(c => evaluate(item(c))));
          if (review.needsClarification && revised.status === 'none') {
            semanticClarification = true;
            semantic = 'clarification';
            return undefined;
          }
          semantic = 'reviewed';
          const rewrite = review.rewrite;
          if (review.needsClarification || revised.status === 'matched' || !rewrite || query.includes(rewrite)
              || /[<>{}\[\]\r\n]|https?:\/\//iu.test(rewrite) || query.length + rewrite.length + 1 > this.config.limits.maxQueryCharacters) return undefined;
          semantic = 'reformulated';
          return query + ' ' + rewrite;
        } : undefined,
        verifySupplement: evidence && semanticModel ? async chunks => {
          if (!review || !semanticDeadline || semanticDeadline.aborted) return;
          const novel = shortlist(chunks).filter(c => !review!.checked.has(evidenceFingerprint(item(c))));
          if (!novel.length) return;
          const next = await reviewCandidates(semanticModel, query, novel, evidence.semanticQueryTopics, semanticDeadline);
          if (!next) return;
          for (const [fingerprint, decision] of next.decisions) review.decisions.set(fingerprint, decision);
        } : undefined,
        passFinished: settings.diagnostics ? pass => passes.push(pass) : undefined,
      });
    signal?.throwIfAborted();
    const citations = select(result.chunks, settings.diagnostics && live ? candidate => candidates.push(candidate) : undefined);
    if (review) for (const citation of citations.flatMap(c => [c, ...(c.equivalentSources ?? [])])) {
      const input = item(citation);
      const decision = evaluate(input);
      const fingerprint = evidenceFingerprint(input);
      const reviewed = review.decisions.get(fingerprint);
      if (decision.reason === 'semantic-direct' && reviewed?.kind === 'direct') {
        citation.semanticEvidence = { fingerprint, topics: decision.directTopics, quote: reviewed.quote };
      }
    }
    const snapshot: Snapshot = { schema: 'tbea-snapshot/v1', id, mode: this.config.mode, query, createdAt: new Date().toISOString(), totalCount: result.chunks.length,
      coverage: result.coverage, citations, ...(semanticClarification ? { semanticClarification } : {}) };
    signal?.throwIfAborted();
    await this.store.save(snapshot, signal);
    signal?.throwIfAborted();
    if (settings.diagnostics && live) console.info(JSON.stringify({
      event: 'tbea-retrieval', searchId: id, threshold, coverage: result.coverage, passes, candidates, topics: evidence?.diagnosticTopics, semantic,
      ms: Math.round(performance.now() - started),
    }));
    return this.result(snapshot);
  }
  private evidenceThreshold() {
    return this.config.retrieval?.evidenceScoreThreshold ?? this.config.platform.rankScoreThreshold ?? 0.4;
  }
  private result(snapshot: Snapshot, citations?: readonly Citation[]): KnowledgeResult {
    const model = modelResult(snapshot, this.config.limits.maxTextCharacters, citations, this.evidenceThreshold(), this.config.retrieval?.synonyms);
    return { model, view: {
      schema: 'tbea-view/v1', snapshotId: snapshot.id, count: snapshot.citations.length, query: snapshot.query, mode: snapshot.mode,
      coverage: snapshot.coverage, evidenceStatus: model.evidenceStatus, ...(model.clarification ? { clarification: model.clarification } : {}),
    } };
  }
  async snapshot(id: unknown, signal?: AbortSignal) {
    const snapshot = await this.store.load(id);
    if (snapshot.citations.length) {
      const allowed = new Set((await this.catalog(signal)).map(k => k.id));
      if (snapshot.citations.some(c => !allowed.has(c.knowledgeBaseId))) throw new PlatformError('KNOWLEDGE_BASE_DENIED', '历史来源包含当前未授权的知识库');
      return publicSnapshot(snapshot, allowed);
    }
    return publicSnapshot(snapshot);
  }
  async detail(snapshotId: unknown, citationId: unknown, signal?: AbortSignal): Promise<KnowledgeResult> {
    const id = requireSnapshotId(snapshotId);
    if (typeof citationId !== 'string') throw new PlatformError('CITATION_NOT_FOUND', '未找到该引用');
    const key = `${id}:${citationId}`;
    return this.detailTasks.run(key, signal, async sharedSignal => {
      // 同一快照的不同切片依次更新，防止并发刷新时后写覆盖先写的修改。
      const previous = this.snapshotUpdates.get(id) || Promise.resolve();
      const task = previous.catch(() => {}).then(async () => {
        sharedSignal.throwIfAborted();
        const snapshot = await this.store.load(id);
        const old = allSources(snapshot).find(c => c.citationId === citationId);
        if (!old) throw new PlatformError('CITATION_NOT_FOUND', '未找到该引用');
        const catalog = await this.catalog(sharedSignal);
        if (!catalog.some(k => k.id === old.knowledgeBaseId)) throw new PlatformError('KNOWLEDGE_BASE_DENIED', '该知识库已从授权范围移除');
        if (this.config.mode === 'live') {
          const raw = await detailPlatform(this.config, old, sharedSignal, this.fetcher);
          if ((citationKnowledgeBaseId(raw) || old.knowledgeBaseId) !== old.knowledgeBaseId || (raw.id || raw.chunk_id || raw.chunkId || old.chunkId) !== old.chunkId) throw new PlatformError('DETAIL_MISMATCH', '切片详情与请求不匹配');
          const fresh = normalizeCitation({ ...old.source, ...raw, knowledgebase_id: old.knowledgeBaseId, chunk_id: old.chunkId }, 0, snapshot.id, catalog);
          // 更新被点开的来源，保留它的引用号及组内其他来源。
          Object.assign(old, fresh, { citationId });
          sharedSignal.throwIfAborted();
          await this.store.save(snapshot, sharedSignal);
        }
        return this.result(snapshot, [old]);
      });
      this.snapshotUpdates.set(id, task);
      try { return await task; } finally { if (this.snapshotUpdates.get(id) === task) this.snapshotUpdates.delete(id); }
    });
  }
  async image(snapshotId: unknown, requestedImageId: unknown, signal?: AbortSignal): Promise<ImageData> {
    const imageId = requireImageId(requestedImageId);
    const snapshot = await this.store.load(snapshotId);
    const allowed = new Set((await this.catalog(signal)).map(k => k.id));
    const citation = allSources(snapshot).find(c => allowed.has(c.knowledgeBaseId) && c.images.some(i => i.id === imageId));
    if (!citation) throw new PlatformError('IMAGE_NOT_FOUND', '未找到允许访问的关联图片');
    const cached = await this.store.image(imageId);
    if (cached) return cached;
    return this.imageTasks.run(imageId,signal,async sharedSignal=>{
      let image;
      if (this.config.mode === 'mock') image = mockImage();
      else {
        const source = citation.images.find(i => i.id === imageId)?.url;
        if (!source) throw new PlatformError('IMAGE_NOT_FOUND', '未找到允许访问的关联图片');
        try { image = await fetchPlatformImage(this.config, source, sharedSignal, this.fetcher); }
        catch (error) {
          if (!(error instanceof PlatformError) || error.status === undefined || ![400, 401, 403].includes(error.status)) throw error;
          // 签名链接可能过期：重新查询只读切片详情，不重放任何业务工作流。
          await this.detail(snapshotId, citation.citationId, sharedSignal);
          const refreshed = await this.store.load(snapshotId);
          const next = allSources(refreshed).find(c => c.citationId === citation.citationId)?.images.find(i => i.id === imageId);
          if (!next) throw new PlatformError('IMAGE_EXPIRED', '图片已更新，请刷新参考来源');
          image = await fetchPlatformImage(this.config, next.url, sharedSignal, this.fetcher);
        }
      }
      await this.store.saveImage(imageId, image); return image;
    });
  }
  async call(name: string, args: JsonRecord, signal?: AbortSignal, manuallySelected = false, semanticModel?: SemanticModel): Promise<KnowledgeResult> {
    if (name === 'search_knowledge') return this.search(args, signal, manuallySelected, semanticModel);
    if (name === 'get_chunk_detail') return this.detail(args.snapshotId, args.citationId, signal);
    throw new PlatformError('UNKNOWN_TOOL', '未知工具');
  }
}
