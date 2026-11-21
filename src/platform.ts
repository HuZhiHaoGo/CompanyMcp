import { createHash, randomUUID } from 'node:crypto';
import { PLATFORM_ORIGIN, PLATFORM_LIST_PATH } from './config.ts';
import { isImageType, isRecord } from './contracts.ts';
import type { Citation, Fetcher, ImageData, JsonRecord, KnowledgeBase, PlatformConfig, ServiceConfig } from './contracts.ts';

const SUCCESS_CODES = new Set<unknown>([0, '0', '', 'Success', 'SUCCESS']);

export class PlatformError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** 服务可能运行在不同时区，签名时间明确使用中国标准时间。 */
export function signedHeaders(platform: Pick<PlatformConfig, 'accessKey' | 'secretKey'>, body: string, date = new Date(), requestId: string = randomUUID()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
  const time = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  const token = createHash('sha256').update(body + platform.secretKey + requestId + time).digest('hex');
  return { 'Content-Type': 'application/json', 'x-bce-request-id': requestId, 'Access-Key': platform.accessKey ?? '', 'Sign-Time': time, Token: token };
}

export async function boundedBody(response: Response, limit: number, signal?: AbortSignal): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let size = 0;
  const chunks: Buffer[] = [];
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new PlatformError('RESPONSE_TOO_LARGE', '平台响应超过允许大小');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  } finally { await reader.cancel().catch(() => {}); }
}

/** 不自动重试，避免把平台异常隐藏为重复请求。也不把上游响应正文或密钥写入错误。 */
export async function platformJson(config: Pick<ServiceConfig, 'platform'>, endpoint: string, value: JsonRecord, signal?: AbortSignal, fetcher: Fetcher = fetch): Promise<JsonRecord> {
  const body = JSON.stringify(value);
  const timeout = AbortSignal.timeout(config.platform.timeoutMs || 30000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetcher(new URL(endpoint, PLATFORM_ORIGIN), { method: 'POST', headers: signedHeaders(config.platform, body), body, signal: combined, redirect: 'error' });
  if (!response.ok) throw new PlatformError(`PLATFORM_HTTP_${response.status}`, `平台请求失败（HTTP ${response.status}）`, response.status);
  let result: unknown;
  try { result = JSON.parse((await boundedBody(response, 20 * 1024 * 1024, combined)).toString('utf8')); }
  catch (error) { if(combined.aborted) throw combined.reason; if (error instanceof PlatformError) throw error; throw new PlatformError('INVALID_JSON', '平台返回了无法解析的 JSON'); }
  if (!isRecord(result)) throw new PlatformError('INVALID_RESPONSE', '平台响应结构不正确');
  const code = result.event_code ?? result.code;
  if (result.success === false || (code != null && !SUCCESS_CODES.has(code))) throw new PlatformError('PLATFORM_BUSINESS_ERROR', '平台返回业务错误，请在平台侧核对请求');
  return result;
}

/** 只有分页完整才交给调用方。重复页、空页或总数中途变化都会中止。 */
export async function listPlatformKnowledgeBases(config: ServiceConfig, signal?: AbortSignal, fetcher?: Fetcher): Promise<KnowledgeBase[]> {
  const timeout = AbortSignal.timeout(config.platform.timeoutMs || 30000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const ids = new Map<string, KnowledgeBase>();
  let total: number | undefined;
  for (let pageNo = 1; pageNo <= 100; pageNo++) {
    const result = await platformJson(config, config.platform.listPath ?? PLATFORM_LIST_PATH,
      { projectId: config.platform.projectId, pageNo, pageSize: 10 }, combined, fetcher);
    const page = Array.isArray(result.data) ? result : isRecord(result.data) ? result.data : undefined;
    const rows = page?.data;
    const rawTotal = page?.total ?? result.total;
    const count = typeof rawTotal === 'string' && /^\d+$/.test(rawTotal) ? Number(rawTotal) : rawTotal;
    if (!Array.isArray(rows) || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || (total !== undefined && count !== total)) break;
    total = count;
    for (const row of rows as unknown[]) {
      if (!isRecord(row) || typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id.trim())) throw new PlatformError('INVALID_KNOWLEDGE_DIRECTORY', '平台目录出现缺失或重复的库 ID');
      const id = row.id.trim();
      ids.set(id, {
        id, name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : id,
        description: typeof row.description === 'string' ? row.description : '',
      });
    }
    if (ids.size === total) return [...ids.values()];
    if (ids.size > total || !rows.length) break;
  }
  throw new PlatformError('INCOMPLETE_KNOWLEDGE_DIRECTORY', '未能完整获取项目知识库目录，请检查平台分页和项目配置');
}

export async function searchPlatform(config: ServiceConfig, query: string, ids: string[], top: number, signal?: AbortSignal, fetcher?: Fetcher): Promise<{ chunks: unknown[]; totalCount: unknown }> {
  const body = { type: 'hybrid', query, knowledgebase_ids: ids, projectId: config.platform.projectId,
    rerankModelName: config.platform.rerankModelName, top, rank_score_threshold: config.platform.rankScoreThreshold ?? 0.4,
    expand_chunk: true, enable_cache: false, skip: 0 };
  const result = await platformJson(config, config.platform.searchPath, body, signal, fetcher);
  const data = isRecord(result.data) ? result.data : result;
  if (!Array.isArray(data.chunks)) throw new PlatformError('INVALID_SEARCH_RESPONSE', '检索响应缺少 chunks 数组，请核对接口路径');
  return { chunks: data.chunks, totalCount: data.total_count ?? data.chunks.length };
}

export async function detailPlatform(config: ServiceConfig, citation: Pick<Citation, 'knowledgeBaseId' | 'chunkId'>, signal?: AbortSignal, fetcher?: Fetcher): Promise<JsonRecord> {
  const result = await platformJson(config, config.platform.chunkPath, { knowledgeBaseId: citation.knowledgeBaseId, chunkId: citation.chunkId }, signal, fetcher);
  return isRecord(result.data) ? result.data : result;
}

/** 仅允许平台同源 HTTPS 图片；禁止重定向，防止将凭证发送到其他主机。 */
export async function fetchPlatformImage(config: ServiceConfig, source: string, signal?: AbortSignal, fetcher: Fetcher = fetch): Promise<ImageData> {
  const url = new URL(source);
  if (url.origin !== PLATFORM_ORIGIN || url.username || url.password) throw new PlatformError('IMAGE_ORIGIN_DENIED', '图片不属于股份公司平台');
  const presigned = [...url.searchParams.keys()].some(k => k.toLowerCase().startsWith('x-amz-'));
  const headers: Record<string, string> = {};
  if (!presigned && config.platform.assetAuth === 'bearer') {
    if (!config.platform.assetApiKey) throw new PlatformError('IMAGE_AUTH_MISSING', '普通图片已启用 Bearer 鉴权，但未配置图片 API Key');
    headers.Authorization = `Bearer ${config.platform.assetApiKey}`;
  }
  const timeout = AbortSignal.timeout(config.platform.timeoutMs || 30000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetcher(url, { headers, signal: combined, redirect: 'error' });
  if (!response.ok) throw new PlatformError(`IMAGE_HTTP_${response.status}`, `图片下载失败（HTTP ${response.status}），可尝试刷新切片`, response.status);
  const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!isImageType(type)) throw new PlatformError('IMAGE_TYPE_DENIED', '当前仅预览 PNG、JPEG、WebP、GIF 图片');
  const bytes = await boundedBody(response, config.limits.maxImageBytes, combined);
  const valid = type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 : type === 'image/gif' ? /^GIF8[79]a/.test(bytes.toString('ascii', 0, 6)) : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new PlatformError('INVALID_IMAGE', '图片文件内容与类型不符');
  return { bytes, type };
}
