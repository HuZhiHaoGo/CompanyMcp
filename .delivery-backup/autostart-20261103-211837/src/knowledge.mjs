import { randomUUID } from 'node:crypto';
import { normalizeCitation, modelResult, publicSnapshot } from './normalize.mjs';
import { Store, requireImageId } from './store.mjs';
import { searchPlatform, detailPlatform, fetchPlatformImage, PlatformError } from './platform.mjs';
import { mockChunks, mockImage } from './mock.mjs';
import { SearchGate } from './gate.mjs';

export const TOOLS = [
  { name: 'search_knowledge', description: '检索公司正式知识库。涉及公司标准、设计要求、PLM操作等问题时先检索；query 写清产品、地区、版本等已知条件，不明确时向用户澄清。返回文字证据和引用编号，图片由界面展示，不要推断图片内容。没有证据时明确说明，不用常识冒充公司规定。', inputSchema: { type: 'object', properties: { query: { type: 'string', description: '检索问题，最多1024字符' }, knowledge_base_ids: { type: 'array', items: { type: 'string' }, description: '可选，限定允许访问的知识库；留空则检索配置中的全部知识库' }, top: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['query'], additionalProperties: false } },
  { name: 'get_chunk_detail', description: '查看此前检索结果的完整切片文字。仅接受 search_knowledge 返回的 snapshotId 和 citationId；适用于证据被截断或需要核对上下文。', inputSchema: { type: 'object', properties: { snapshotId: { type: 'string' }, citationId: { type: 'string' } }, required: ['snapshotId', 'citationId'], additionalProperties: false } },
];

export class KnowledgeService {
  constructor(config) { this.config = config; this.store = new Store(config); this.imagesInFlight = new Map(); this.refreshes = new Map(); this.snapshotUpdates = new Map(); this.searchGate = new SearchGate(); }
  async init() { await this.store.init(); }
  async search(args, signal) {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    if (!query || query.length > this.config.limits.maxQueryCharacters) throw new PlatformError('INVALID_QUERY', `问题不能为空，且不能超过${this.config.limits.maxQueryCharacters}字符`);
    const allowed = this.config.knowledgeBases.map(k => k.id);
    const ids = args.knowledge_base_ids?.length ? [...new Set(args.knowledge_base_ids)] : allowed;
    if (!Array.isArray(ids) || ids.some(id => !allowed.includes(id))) throw new PlatformError('KNOWLEDGE_BASE_DENIED', '请求中包含未授权的知识库');
    const top = args.top ?? this.config.limits.top;
    if (!Number.isInteger(top) || top < 1 || top > 20) throw new PlatformError('INVALID_TOP', 'top 必须是1～20的整数');
    const result = await this.searchGate.run(signal, () => this.config.mode === 'mock' ? { chunks: query.includes('无结果') ? [] : mockChunks(ids), totalCount: query.includes('无结果') ? 0 : 2 } : searchPlatform(this.config, query, ids, top, signal));
    signal?.throwIfAborted();
    const id = randomUUID(); const unique = new Map();
    for (const raw of result.chunks) {
      const c = normalizeCitation(raw, unique.size, id, this.config.knowledgeBases);
      // 按服务端白名单再次过滤平台响应；父子块保留在原始快照，不重复堆叠父段落。
      if (!ids.includes(c.knowledgeBaseId)) continue;
      const key = `${c.knowledgeBaseId}:${c.chunkId || c.documentName + c.modelText}`;
      if (!unique.has(key)) unique.set(key, c);
      if (unique.size >= top) break;
    }
    const snapshot = { schema: 'tbea-snapshot/v1', id, mode: this.config.mode, query, createdAt: new Date().toISOString(), totalCount: result.totalCount, citations: [...unique.values()] };
    await this.store.save(snapshot);
    return this.result(snapshot);
  }
  result(snapshot) { return { model: modelResult(snapshot, this.config.limits.maxTextCharacters), view: { schema: 'tbea-view/v1', snapshotId: snapshot.id, count: snapshot.citations.length, query: snapshot.query, mode: snapshot.mode } }; }
  async snapshot(id) {
    const snapshot = await this.store.load(id);
    if (snapshot.citations.some(c => !this.config.knowledgeBases.some(k => k.id === c.knowledgeBaseId))) throw new PlatformError('KNOWLEDGE_BASE_DENIED', '历史来源包含当前未授权的知识库');
    return publicSnapshot(snapshot);
  }
  async detail(id, citationId, signal) {
    const key = `${id}:${citationId}`;
    if (this.refreshes.has(key)) return this.refreshes.get(key);
    // 同一快照的不同切片依次更新，防止并发刷新时后写覆盖先写的修改。
    const previous = this.snapshotUpdates.get(id) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      const snapshot = await this.store.load(id);
      const old = snapshot.citations.find(c => c.citationId === citationId);
      if (!old) throw new PlatformError('CITATION_NOT_FOUND', '未找到该引用');
      if (this.config.mode === 'live') {
        if (!this.config.knowledgeBases.some(k => k.id === old.knowledgeBaseId)) throw new PlatformError('KNOWLEDGE_BASE_DENIED', '该知识库已从授权范围移除');
        const raw = await detailPlatform(this.config, old, signal);
        if ((raw.knowledgeBaseId || raw.knowledgebase_id || old.knowledgeBaseId) !== old.knowledgeBaseId || (raw.id || raw.chunk_id || old.chunkId) !== old.chunkId) throw new PlatformError('DETAIL_MISMATCH', '切片详情与请求不匹配');
        const fresh = normalizeCitation({ ...old.source, ...raw, knowledgebase_id: old.knowledgeBaseId, chunk_id: old.chunkId }, snapshot.citations.indexOf(old), snapshot.id, this.config.knowledgeBases);
        snapshot.citations[snapshot.citations.indexOf(old)] = { ...fresh, citationId: old.citationId };
        await this.store.save(snapshot);
      }
      return this.result(snapshot);
    });
    this.snapshotUpdates.set(id, task);
    this.refreshes.set(key, task);
    try { return await task; } finally { this.refreshes.delete(key); if (this.snapshotUpdates.get(id) === task) this.snapshotUpdates.delete(id); }
  }
  async image(snapshotId, imageId, signal) {
    requireImageId(imageId);
    const snapshot = await this.store.load(snapshotId);
    const citation = snapshot.citations.find(c => c.images.some(i => i.id === imageId));
    if (!citation || !this.config.knowledgeBases.some(k => k.id === citation.knowledgeBaseId)) throw new PlatformError('IMAGE_NOT_FOUND', '未找到允许访问的关联图片');
    const cached = await this.store.image(imageId);
    if (cached) return cached;
    if (this.imagesInFlight.has(imageId)) return this.imagesInFlight.get(imageId);
    const task = (async () => {
      let image;
      if (this.config.mode === 'mock') image = mockImage();
      else {
        const source = citation.images.find(i => i.id === imageId).url;
        try { image = await fetchPlatformImage(this.config, source, signal); }
        catch (error) {
          if (![400, 401, 403].includes(error.status)) throw error;
          // 签名链接可能过期：重新查询只读切片详情，不重放任何业务工作流。
          await this.detail(snapshotId, citation.citationId, signal);
          const refreshed = await this.store.load(snapshotId);
          const next = refreshed.citations.flatMap(c => c.images).find(i => i.id === imageId);
          if (!next) throw new PlatformError('IMAGE_EXPIRED', '图片已更新，请刷新参考来源');
          image = await fetchPlatformImage(this.config, next.url, signal);
        }
      }
      await this.store.saveImage(imageId, image); return image;
    })();
    this.imagesInFlight.set(imageId, task);
    try { return await task; } finally { this.imagesInFlight.delete(imageId); }
  }
  async call(name, args, signal) {
    if (name === 'search_knowledge') return this.search(args, signal);
    if (name === 'get_chunk_detail') return this.detail(args.snapshotId, args.citationId, signal);
    throw new PlatformError('UNKNOWN_TOOL', '未知工具');
  }
}
