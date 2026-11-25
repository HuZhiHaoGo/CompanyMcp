import { PLATFORM_ORIGIN } from './config.ts';
import { isRecord } from './contracts.ts';
import type { Fetcher, JsonRecord, ServiceConfig } from './contracts.ts';
import { platformJson, PlatformError } from './platform.ts';

const actions = '/openapi/v1/knowledgeBase?Action=';
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function documentFormat(name: string, extension?: unknown) {
  const candidates = [name.split('.').length > 1 ? name.split('.').at(-1) : '', text(extension)];
  return candidates.map(value => value?.toLowerCase().replace(/^\./, '')).find(value => value && /^[a-z0-9]{1,12}$/.test(value)) ?? '';
}

function integer(value: unknown) {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return typeof number === 'number' && Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function timestamp(value: unknown) {
  const numeric = integer(value);
  const date = new Date(numeric !== undefined ? (numeric < 10 ** 12 ? numeric * 1000 : numeric) : text(value) ?? '');
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function documentRecord(row: JsonRecord) {
  const meta = isRecord(row.meta) ? row.meta : {};
  const source = [meta.dataSourceInfo, row.data_source_info].find(isRecord) ?? {};
  return {
    info: documentMetadata(row, meta, source),
    address: [row.download_url, row.downloadUrl, source.original_file_bos_url, meta.url]
      .map(text).find((value): value is string => Boolean(value && originalAddress(value))),
  };
}

function documentMetadata(row: JsonRecord, meta: JsonRecord, source: JsonRecord) {
  const id = text(row.documentId ?? row.id);
  const name = text(row.name);
  if (!id || !name) return undefined;
  return {
    id, name, format: documentFormat(name, source.extension ?? row.data_file_type),
    status: text(row.display_status ?? row.status),
    createdAt: timestamp(row.createdAt ?? row.created_at),
    bytes: integer(source.size ?? meta.fileSize ?? row.size),
  };
}

export function originalAddress(value: string) {
  try {
    const url = new URL(value);
    if (url.origin === PLATFORM_ORIGIN && !url.username && !url.password && !url.hash) return url;
  } catch { /* 平台会返回空地址或未对客户端开放的内部地址。 */ }
}

export function documentPage(value: JsonRecord) {
  const page = isRecord(value.data) ? value.data : value;
  if (!Array.isArray(page.data) || typeof page.isTruncated !== 'boolean') throw new PlatformError('INVALID_DOCUMENT_DIRECTORY', '平台文档列表缺少分页字段');
  const next = typeof page.nextMarker === 'string' && page.nextMarker.trim() ? page.nextMarker : undefined;
  return { rows: page.data as unknown[], total: integer(page.totalCount ?? page.total_count), more: page.isTruncated, next };
}

export async function listDocuments(config: ServiceConfig, library: string, signal: AbortSignal, fetcher?: Fetcher, target?: string) {
  const records = new Map<string, ReturnType<typeof documentRecord>>();
  const cursors = new Set<string>();
  let total: number | undefined;
  let marker: string | undefined;
  let complete = false;
  // 安全终止异常游标；100 是每次平台请求的页大小，不是知识库容量。
  for (let count = 0; count < 1000; count++) {
    const page = await platformJson(config, `${actions}DescribeDocuments`, { knowledgeBaseId: library, maxKeys: 100, ...(marker ? { marker } : {}) }, signal, fetcher)
      .then(documentPage)
      .catch(error => {
        if (!records.size || signal.aborted || (error instanceof PlatformError && [401, 403].includes(error.status ?? 0))) throw error;
        return undefined;
      });
    if (!page) break;
    if (total !== undefined && page.total !== undefined && page.total !== total) break;
    total ??= page.total;
    const before = records.size;
    let invalid = false;
    for (const row of page.rows) {
      if (!isRecord(row)) { invalid = true; continue; }
      const record = documentRecord(row);
      if (!record.info) { invalid = true; continue; }
      records.set(record.info.id, record);
      if (target === record.info.id) return { records, total, complete: false };
    }
    if (invalid) break;
    if (!page.more) { complete = total === undefined || total === records.size; break; }
    if (!page.next || cursors.has(page.next) || records.size === before) break;
    marker = page.next;
    cursors.add(marker);
  }
  return { records, total, complete };
}

export async function describeDocument(config: ServiceConfig, library: string, id: string, signal: AbortSignal, fetcher?: Fetcher) {
  const result = await platformJson(config, `${actions}DescribeDocument`, { knowledgeBaseId: library, documentId: id }, signal, fetcher);
  const row = isRecord(result.data) ? result.data : result;
  const owner = row.knowledgeBaseId ?? row.knowledgebase_id ?? row.knowledge_base_id;
  if ((row.documentId ?? row.id) !== id || (owner != null && owner !== library)) {
    throw new PlatformError('DOCUMENT_NOT_FOUND', '该文档不在当前知识库中');
  }
  const detail = documentRecord(row);
  if (!detail.address || owner == null) {
    const { records } = await listDocuments(config, library, signal, fetcher, id);
    const listed = records.get(id);
    if (owner == null && !listed) throw new PlatformError('DOCUMENT_NOT_FOUND', '该文档不在当前知识库中');
    detail.address ??= listed?.address;
  }
  return detail;
}
