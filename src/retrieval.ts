import { normalizeCitation, citationDocumentName, citationKnowledgeBaseId } from './normalize.ts';
import { PlatformError, searchPlatform } from './platform.ts';
import { isRecord } from './contracts.ts';
import type { Citation, Fetcher, JsonRecord, KnowledgeBase, RetrievalConfig, ServiceConfig } from './contracts.ts';
import type { SearchGate } from './gate.ts';
import { evidenceScore } from './evidence.ts';
import type { EvidenceDecision, EvidenceText } from './evidence.ts';
import { diagnosticCredentials, diagnosticErrorCode, diagnosticId, diagnosticText } from './diagnostics.ts';

export interface CandidateDecision {
  libraryId: string;
  chunkId: string;
  score: number | null;
  topics: number[];
  reason: string;
  documentName?: string;
  excerpt?: string;
  excerptTruncated?: boolean;
}

export type CandidateReport = (decision: CandidateDecision, raw: JsonRecord, citation?: Citation) => void;

export function diagnosticDocumentName(raw: JsonRecord, credentials: ReturnType<typeof diagnosticCredentials>) {
  return diagnosticText(citationDocumentName(raw), 240, credentials) || undefined;
}

export interface LibrarySearchTrace {
  phase: string;
  libraryId?: string;
  ms: number;
  errorCode?: string;
  returned?: number;
  scoped?: number;
  kept?: number;
  platformTotal?: number;
  hits?: CandidateDecision[];
}

function describeCandidate(raw: JsonRecord, reason: string, topics: number[] = []): CandidateDecision {
  const score = evidenceScore(raw.rank_score);
  return { libraryId: diagnosticId(citationKnowledgeBaseId(raw)) ?? '', chunkId: diagnosticId(raw.chunk_id ?? raw.chunkId ?? raw.id) ?? '',
    score: score < 0 ? null : score, topics, reason };
}

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
  priorityIds?: readonly string[];
  supplement?: string;
  enough?: (chunks: JsonRecord[]) => boolean;
  semanticSupplement?: (chunks: JsonRecord[]) => Promise<string | undefined>;
  verifySupplement?: (chunks: JsonRecord[]) => Promise<void>;
  passFinished?: (pass: { phase: string; attempted: number; completed: number; ms: number }) => void;
  libraryFinished?: (batch: LibrarySearchTrace) => void;
}

/** 每个库独立召回。每轮只启动少量工作任务，平台请求仍共用全局限流队列。 */
export async function retrieveLibraries({ config, gate, settings, query, ids, top, roundSignal, signal, fetcher, priorityIds, supplement, enough, semanticSupplement, verifySupplement, passFinished, libraryFinished }: RetrieveOptions) {
  const libraryIds = [...ids].sort();
  const candidates = new Map<string, Map<string, JsonRecord>>();
  const attempted = new Set<string>();
  const completed = new Set<string>();
  let firstFailure: unknown;
  let mixedFailures = false;
  const perLibraryTop = Math.min(top, settings.perLibraryTop);
  const credentials = libraryFinished ? diagnosticCredentials(config) : [];
  const collected = () => libraryIds.flatMap(id => [...(candidates.get(id)?.values() ?? [])]);
  async function pass(phase: string, libraries: readonly string[], searchQuery: string) {
    if (!libraries.length) return;
    const started = performance.now();
    // Include the full planned scope even when the deadline expires in the queue.
    libraries.forEach(id => attempted.add(id));
    if (roundSignal.aborted) {
      passFinished?.({ phase, attempted: libraries.length, completed: 0, ms: 0 });
      return;
    }
    let next = 0;
    let success = 0;
    async function worker() {
      while (next < libraries.length && !roundSignal.aborted) {
        const libraryId = libraries[next++];
        const began = performance.now();
        const trace: LibrarySearchTrace | undefined = libraryFinished && { phase, libraryId: diagnosticId(libraryId), ms: 0 };
        try {
          const chunks = await gate.run(roundSignal, async () => {
            const librarySignal = AbortSignal.any([roundSignal, AbortSignal.timeout(settings.libraryTimeoutMs)]);
            librarySignal.throwIfAborted();
            const result = await searchPlatform(config, searchQuery, [libraryId], perLibraryTop, librarySignal, fetcher);
            librarySignal.throwIfAborted();
            const scoped = result.chunks.filter((chunk): chunk is JsonRecord => isRecord(chunk) && citationKnowledgeBaseId(chunk) === libraryId);
            if (trace) {
              trace.returned = result.chunks.length;
              trace.scoped = scoped.length;
              trace.kept = Math.min(scoped.length, perLibraryTop);
              if (typeof result.totalCount === 'number' && Number.isSafeInteger(result.totalCount)) trace.platformTotal = result.totalCount;
              let inScope = 0;
              // Keep the response order and bound the trace even when the platform ignores top.
              trace.hits = result.chunks.slice(0, 40).filter(isRecord).map(chunk => {
                if (citationKnowledgeBaseId(chunk) !== libraryId) return describeCandidate(chunk, 'outside-scope');
                return { ...describeCandidate(chunk, inScope++ < perLibraryTop ? 'received' : 'per-library-limit'),
                  documentName: diagnosticDocumentName(chunk, credentials) };
              });
            }
            if (result.chunks.length && !scoped.length) throw new PlatformError('INVALID_SEARCH_SCOPE', '平台切片与请求的知识库不匹配');
            return scoped.slice(0, perLibraryTop);
          });
          const batch = candidates.get(libraryId) ?? new Map<string, JsonRecord>();
          for (const chunk of chunks) {
            const key = String(chunk.chunk_id ?? chunk.id ?? JSON.stringify(chunk));
            const previous = batch.get(key);
            if (!previous || validScore(chunk) > validScore(previous)) batch.set(key, chunk);
          }
          candidates.set(libraryId, batch);
          completed.add(libraryId);
          success++;
        } catch (error) {
          if (trace) trace.errorCode = roundSignal.aborted ? diagnosticErrorCode(roundSignal.reason)
            : isRecord(error) && error.name === 'TimeoutError' ? 'LIBRARY_SEARCH_TIMEOUT' : diagnosticErrorCode(error);
          if (roundSignal.aborted) return;
          const failure = isRecord(error) && error.name === 'TimeoutError' ? new PlatformError('LIBRARY_SEARCH_TIMEOUT', '知识库检索超时') : error;
          if (firstFailure && errorCode(firstFailure) !== errorCode(failure)) mixedFailures = true;
          firstFailure ??= failure;
        } finally {
          if (trace) {
            trace.ms = Math.round(performance.now() - began);
            libraryFinished?.(trace);
          }
        }
      }
    }
    await Promise.all(libraries.slice(0, gate.concurrency).map(() => worker()));
    passFinished?.({ phase, attempted: libraries.length, completed: success, ms: Math.round(performance.now() - started) });
  }
  const priority = libraryIds.filter(id => priorityIds?.includes(id));
  await pass('priority', priority, query);
  if (!priority.length || !enough?.(collected())) {
    await pass('original', libraryIds.filter(id => !priority.includes(id)), query);
  }
  if (supplement && !enough?.(collected())) {
    await pass('paraphrase', libraryIds.filter(id => attempted.has(id)), supplement);
  }
  signal?.throwIfAborted();
  if (!completed.size) {
    if (roundSignal.aborted) throw new PlatformError('SEARCH_TIMEOUT', '本轮知识库检索超时');
    if (!mixedFailures && firstFailure instanceof PlatformError) throw firstFailure;
    throw new PlatformError('SEARCH_UNAVAILABLE', '所有知识库均未完成检索，请检查平台服务或稍后重新发送');
  }
  if (semanticSupplement && !roundSignal.aborted) {
    const initial = collected();
    const paraphrase = await semanticSupplement(initial);
    if (paraphrase && !roundSignal.aborted) {
      const originals = new Set(initial);
      await pass('semantic-paraphrase', libraryIds, paraphrase);
      const added = collected().filter(candidate => !originals.has(candidate));
      if (added.length && !roundSignal.aborted) await verifySupplement?.(added);
    }
    signal?.throwIfAborted();
  }
  const chunks = collected();
  return { chunks, totalCount: chunks.length, coverage: {
    completed: completed.size, requested: attempted.size,
    ...(attempted.size < libraryIds.length ? { available: libraryIds.length } : {}),
  } };
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
    citation.documentGroupId ?? documentName, versions, citation.effectiveDate ?? null, evidenceText(content),
    tables.map(table => table.rows.map(row => row.map(cell => ({ ...cell, text: evidenceText(cell.text) })))),
    images.map(({ id, caption }) => [id, evidenceText(caption)]),
  ]);
}

/** 按平台得分选证据。顺序相同时沿用稳定的库 ID 和库内顺序，保留所有入选证据的重复来源。 */
export function selectEvidence(chunks: readonly JsonRecord[], catalog: readonly KnowledgeBase[], ids: ReadonlySet<string>, snapshotId: string, limit: number, threshold: number,
  evaluate?: (item: EvidenceText) => EvidenceDecision, report?: CandidateReport): Citation[] {
  function diagnose(raw: JsonRecord, reason: string, topics: number[] = [], citation?: Citation) {
    report?.(describeCandidate(raw, reason, topics), raw, citation);
  }
  const ordered = chunks.flatMap(raw => {
    if (!ids.has(citationKnowledgeBaseId(raw))) { diagnose(raw, 'outside-scope'); return []; }
    const score = validScore(raw);
    if (score < threshold) { diagnose(raw, score < 0 ? 'missing-score' : 'below-threshold'); return []; }
    const citation = normalizeCitation(raw, 0, snapshotId, catalog);
    const match: EvidenceDecision = evaluate?.({ text: citation.modelText, documentName: citation.documentName,
      documentVersion: citation.documentVersion, effectiveDate: citation.effectiveDate })
      ?? { topics: [0], directTopics: [0], quality: 2, reason: 'direct' };
    if (!match.topics.length) { diagnose(raw, match.reason, [], citation); return []; }
    return [{ raw, citation, match, score }];
  }).sort((a, b) => b.match.quality - a.match.quality || b.score - a.score);
  const seenSlices = new Set();
  const evidenceGroups = new Map<string, { primary: typeof ordered[number]; equivalents: typeof ordered }>();
  for (const item of ordered) {
    const { raw, citation, match } = item;
    const sliceKey = JSON.stringify([citation.knowledgeBaseId, citation.chunkId || [citation.documentId, citation.documentName, citation.page, citation.modelText, citation.images.map(image => image.id)]]);
    if (seenSlices.has(sliceKey)) { diagnose(raw, 'duplicate-slice', match.topics, citation); continue; }
    seenSlices.add(sliceKey);
    const key = evidenceKey(citation) ?? sliceKey;
    const group = evidenceGroups.get(key);
    if (group) {
      group.equivalents.push(item);
    } else {
      evidenceGroups.set(key, { primary: item, equivalents: [] });
    }
  }
  // 先给各所问事项留出证据位置，再用剩余额度补高分候选，避免单一事项占满上限。
  const chosen = new Set<string>();
  const covered = new Set<number>();
  for (const [key, { primary: { match: { directTopics: topics } } }] of evidenceGroups) {
    if (chosen.size >= limit) break;
    if (![...topics].some(topic => !covered.has(topic))) continue;
    chosen.add(key);
    for (const topic of topics) covered.add(topic);
  }
  for (const key of evidenceGroups.keys()) {
    if (chosen.size >= limit) break;
    chosen.add(key);
  }
  for (const [key, { primary, equivalents }] of evidenceGroups) {
    diagnose(primary.raw, chosen.has(key) ? 'kept-' + primary.match.reason : 'result-limit', primary.match.topics, primary.citation);
    for (const item of equivalents) diagnose(item.raw, chosen.has(key) ? 'kept-equivalent' : 'result-limit', item.match.topics, item.citation);
  }
  return [...evidenceGroups].filter(([key]) => chosen.has(key)).map(([, { primary: { citation }, equivalents }], index) => {
    const citationId = `K${snapshotId.slice(0, 8)}-${index + 1}`;
    return { ...citation, citationId, equivalentSources: equivalents.map(({ citation: source }, i) => ({ ...source, citationId: `${citationId}-${i + 1}` })) };
  });
}
