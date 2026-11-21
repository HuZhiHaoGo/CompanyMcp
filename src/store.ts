import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PlatformError } from './platform.ts';
import { hasCode, isImageType, isRecord } from './contracts.ts';
import type { ImageData, Limits, ServiceConfig, Snapshot } from './contracts.ts';

const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const IMAGE_ID = /^[a-f0-9]{24}$/;
export function requireSnapshotId(id: unknown): string {
  if (typeof id !== 'string' || !UUID.test(id)) throw new PlatformError('INVALID_SNAPSHOT', '快照标识不合法');
  return id;
}
export function requireImageId(id: unknown): string {
  if (typeof id !== 'string' || !IMAGE_ID.test(id)) throw new PlatformError('INVALID_IMAGE_ID', '图片标识不合法');
  return id;
}

function hasSnapshotShape(value: unknown, id: string): value is Snapshot {
  if (!isRecord(value) || value.schema !== 'tbea-snapshot/v1' || value.id !== id || (value.mode !== 'mock' && value.mode !== 'live')) return false;
  if (typeof value.query !== 'string' || typeof value.createdAt !== 'string' || (typeof value.totalCount !== 'number' && typeof value.totalCount !== 'string')) return false;
  const coverage = value.coverage;
  if (coverage !== undefined && (!isRecord(coverage) || typeof coverage.completed !== 'number' || typeof coverage.requested !== 'number')) return false;
  if (value.retrievalSkipped !== undefined && typeof value.retrievalSkipped !== 'boolean') return false;
  return Array.isArray(value.citations) && value.citations.every(hasCitationShape);
}

function hasCitationShape(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.source)) return false;
  const textFields = ['citationId', 'chunkId', 'knowledgeBaseId', 'knowledgeBaseName', 'documentId', 'documentName', 'content', 'modelText'];
  if (!textFields.every(key => typeof value[key] === 'string')) return false;
  if (value.page !== undefined && typeof value.page !== 'number') return false;
  const hasImages = Array.isArray(value.images) && value.images.every((image: unknown) => isRecord(image) && typeof image.id === 'string' && typeof image.url === 'string' && typeof image.caption === 'string');
  const hasTables = Array.isArray(value.tables) && value.tables.every((table: unknown) => isRecord(table) && Array.isArray(table.rows)
    && table.rows.every((row: unknown) => Array.isArray(row)
      && row.every((cell: unknown) => isRecord(cell) && typeof cell.text === 'string' && typeof cell.colSpan === 'number' && typeof cell.rowSpan === 'number' && typeof cell.header === 'boolean')));
  const otherSources = value.equivalentSources;
  return hasImages && hasTables && (otherSources === undefined || (Array.isArray(otherSources) && otherSources.every(hasCitationShape)));
}

/** 每次写入先落临时文件再替换；不自动清理历史资料，达到配额时明确提示管理员。 */
export class Store {
  readonly root: string;
  readonly limits: Limits;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(config: Pick<ServiceConfig, 'dataDirectory' | 'limits'>) {
    this.root = config.dataDirectory;
    this.limits = config.limits;
  }
  async init() { await fs.mkdir(this.root, { recursive: true }); }
  async transaction<T>(task: () => T | Promise<T>): Promise<T> {
    const next = this.queue.then(task); this.queue = next.catch(() => {}); return next;
  }
  async usage() {
    let bytes = 0; let snapshots = 0;
    for (const entry of await fs.readdir(this.root, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.(json|bin)$/.test(entry.name)) continue;
      bytes += (await fs.stat(path.join(this.root, entry.name))).size;
      if (UUID.test(entry.name.slice(0, -5))) snapshots += 1;
    }
    return { bytes, snapshots };
  }
  async write(name: string, bytes: Buffer, snapshot = false, signal?: AbortSignal) {
    return this.transaction(async () => {
      signal?.throwIfAborted();
      const destination = path.join(this.root, name);
      const existing = await fs.stat(destination).catch(() => null);
      const usage = await this.usage();
      if (snapshot && !existing && usage.snapshots >= this.limits.maxSnapshots) throw new PlatformError('CACHE_FULL', '历史快照达到上限，请备份后清理或增加 maxSnapshots');
      if (usage.bytes - (existing?.size || 0) + bytes.length > this.limits.maxCacheBytes) throw new PlatformError('CACHE_FULL', '本地知识缓存已满，请备份清理或增加 maxCacheBytes');
      const temporary = `${destination}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, bytes, { signal });
        signal?.throwIfAborted();
        await fs.rename(temporary, destination);
      } finally { await fs.unlink(temporary).catch(() => {}); }
    });
  }
  async save(snapshot: Snapshot, signal?: AbortSignal) {
    requireSnapshotId(snapshot.id);
    await this.write(`${snapshot.id}.json`, Buffer.from(JSON.stringify(snapshot)), true, signal);
  }
  async load(snapshotId: unknown): Promise<Snapshot> {
    const id = requireSnapshotId(snapshotId);
    try {
      const value: unknown = JSON.parse(await fs.readFile(path.join(this.root, `${id}.json`), 'utf8'));
      if (!hasSnapshotShape(value, id)) throw new PlatformError('INVALID_SNAPSHOT_CONTENT', '历史资料格式无效，请检查原始快照或备份');
      return value;
    } catch (error) {
      if (hasCode(error, 'ENOENT')) throw new PlatformError('SNAPSHOT_NOT_FOUND', '历史资料不存在，请确认 data 目录已随项目迁移');
      if (error instanceof SyntaxError) throw new PlatformError('INVALID_SNAPSHOT_CONTENT', '历史资料不是有效 JSON，请检查原始快照或备份');
      throw error;
    }
  }
  async image(id: string): Promise<ImageData | null> {
    requireImageId(id);
    try {
      const metadata: unknown = JSON.parse(await fs.readFile(path.join(this.root, `${id}.image.json`), 'utf8'));
      if (!isRecord(metadata) || !isImageType(metadata.type)) return null;
      return { type: metadata.type, bytes: await fs.readFile(path.join(this.root, `${id}.bin`)) };
    } catch (error) { if (hasCode(error, 'ENOENT') || error instanceof SyntaxError) return null; throw error; }
  }
  async saveImage(id: string, image: ImageData) {
    requireImageId(id);
    await this.write(`${id}.bin`, image.bytes);
    await this.write(`${id}.image.json`, Buffer.from(JSON.stringify({ type: image.type })));
  }
}
