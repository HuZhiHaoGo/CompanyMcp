import { normalizeCitation, citationKnowledgeBaseId } from './normalize.ts';
import { PlatformError, searchPlatform } from './platform.ts';
import { isRecord } from './contracts.ts';
import type { Citation, Fetcher, JsonRecord, KnowledgeBase, RetrievalConfig, ServiceConfig } from './contracts.ts';
import type { SearchGate } from './gate.ts';
import { evidenceScore } from './evidence.ts';
import type { EvidenceText } from './evidence.ts';

interface RetrieveOptions {
  config: ServiceConfig;
  gate: SearchGate;
  settings: RetrievalConfig;
  query: string;
  ids: ReadonlySet<string>;
  top: number;
  roundSignal: AbortSignal;
  signal?: AbortSignal;
  fetcher?: Fetcher;
}

/** 每个库独立召回。每轮只启动少量工作任务，平台请求仍共用全局限流队列。 */
export async function retrieveLibraries({ config, gate, settings, query, ids, top, roundSignal, signal, fetcher }: RetrieveOptions) {
  const libraryIds = [...ids].sort();
  const batches: JsonRecord[][] = [];
  let completed = 0;
  let next = 0;
  let firstFailure: unknown;
  let mixedFailures = false;
  const perLibraryTop = Math.min(top, settings.perLibraryTop);
  async function worker() {
    while (next < libraryIds.length && !roundSignal.aborted) {
      const index = next++;
      const libraryId = libraryIds[index];
      try {
        const chunks = await gate.run(roundSignal, async () => {
          const librarySignal = AbortSignal.any([roundSignal, AbortSignal.timeout(settings.libraryTimeoutMs)]);
          librarySignal.throwIfAborted();
          const result = await searchPlatform(config, query, [libraryId], perLibraryTop, librarySignal, fetcher);
          librarySignal.throwIfAborted();
          const chunks = result.chunks.filter((chunk): chunk is JsonRecord => isRecord(chunk) && citationKnowledgeBaseId(chunk) === libraryId);
          if (result.chunks.length && !chunks.length) throw new PlatformError('INVALID_SEARCH_SCOPE', '平台切片与请求的知识库不匹配');
          return chunks.slice(0, perLibraryTop);
        });
        batches[index] = chunks;
        completed++;
      } catch (error) {
        if (roundSignal.aborted) return;
        const failure = isRecord(error) && error.name === 'TimeoutError' ? new PlatformError('LIBRARY_SEARCH_TIMEOUT', '知识库检索超时') : error;
        if (firstFailure && errorCode(firstFailure) !== errorCode(failure)) mixedFailures = true;
        firstFailure ??= failure;
      }
    }
  }
  await Promise.all(libraryIds.slice(0, gate.concurrency).map(() => worker()));
  signal?.throwIfAborted();
  if (!completed) {
    if (roundSignal.aborted) throw new PlatformError('SEARCH_TIMEOUT', '本轮知识库检索超时');
    if (!mixedFailures && firstFailure instanceof PlatformError) throw firstFailure;
    throw new PlatformError('SEARCH_UNAVAILABLE', '所有知识库均未完成检索，请检查平台服务或稍后重新发送');
  }
  const chunks = batches.flat();
  return { chunks, totalCount: chunks.length, coverage: { completed, requested: libraryIds.length } };
}

const errorCode = (err: unknown) => isRecord(err) ? err.code : undefined;
const validScore = (chunk: JsonRecord) => evidenceScore(chunk.rank_score);

// 消除排版换行造成的重复，保留拉丁文、数字和单位之间的分隔。
const evidenceText = (value: string) => value.trim().replace(/\s+/gu, ' ').replace(/(?<=\p{Script=Han}) (?=\p{Script=Han})/gu, '');

function evidenceKey(citation: Citation) {
  if (!citation.modelText) return null;
  const { source, documentName, content, tables, images } = citation;
  const meta = isRecord(source.meta) ? source.meta : {};
  const versions = ['version', 'document_version', 'documentVersion', 'revision', 'version_id']
    .map(key => source[key] ?? meta[key] ?? null);
  return JSON.stringify([
    documentName, versions, evidenceText(content),
    tables.map(table => table.rows.map(row => row.map(cell => ({ ...cell, text: evidenceText(cell.text) })))),
    images.map(({ id, caption }) => [id, evidenceText(caption)]),
  ]);
}

/** 按平台得分选证据。顺序相同时沿用稳定的库 ID 和库内顺序，保留所有入选证据的重复来源。 */
export function selectEvidence(chunks: readonly JsonRecord[], catalog: readonly KnowledgeBase[], ids: ReadonlySet<string>, snapshotId: string, limit: number, threshold: number, relevant?: (item: EvidenceText) => number[]): Citation[] {
  const ordered = [...chunks].sort((a, b) => validScore(b) - validScore(a));
  const seenSlices = new Set();
  const evidenceGroups = new Map<string, { citation: Citation; topics: Set<number>; equivalents: Citation[] }>();
  for (const raw of ordered) {
    if (!ids.has(citationKnowledgeBaseId(raw))) continue;
    const score = validScore(raw);
    if (score < threshold) continue;
    const citation = normalizeCitation(raw, 0, snapshotId, catalog);
    const topics = relevant?.({ text: citation.modelText, documentName: citation.documentName }) ?? [0];
    if (!topics.length) continue;
    const sliceKey = JSON.stringify([citation.knowledgeBaseId, citation.chunkId || [citation.documentId, citation.documentName, citation.page, citation.modelText, citation.images.map(image => image.id)]]);
    if (seenSlices.has(sliceKey)) continue;
    seenSlices.add(sliceKey);
    const key = evidenceKey(citation) ?? sliceKey;
    const match = evidenceGroups.get(key);
    if (match) {
      match.equivalents.push(citation);
    } else {
      evidenceGroups.set(key, { citation, topics: new Set(topics), equivalents: [] });
    }
  }
  // 先给各所问事项留出证据位置，再用剩余额度补高分候选，避免单一事项占满上限。
  const chosen = new Set<string>();
  const covered = new Set<number>();
  for (const [key, { topics }] of evidenceGroups) {
    if (chosen.size >= limit) break;
    if (![...topics].some(topic => !covered.has(topic))) continue;
    chosen.add(key);
    for (const topic of topics) covered.add(topic);
  }
  for (const key of evidenceGroups.keys()) {
    if (chosen.size >= limit) break;
    chosen.add(key);
  }
  return [...evidenceGroups].filter(([key]) => chosen.has(key)).map(([, { citation, equivalents }], index) => {
    const citationId = `K${snapshotId.slice(0, 8)}-${index + 1}`;
    return { ...citation, citationId, equivalentSources: equivalents.map((source, i) => ({ ...source, citationId: `${citationId}-${i + 1}` })) };
  });
}
