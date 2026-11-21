import { createHash } from 'node:crypto';
import { isRecord } from './contracts.ts';
import type { Citation, SemanticProof } from './contracts.ts';
import type { EvidenceDecision, EvidenceText } from './evidence.ts';

export interface SemanticInput {
  query: string;
  topics: readonly { index: number; label: string }[];
  candidates: { id: number; title: string; text: string; version?: string; effectiveDate?: string }[];
}

export type SemanticModel = (input: SemanticInput, signal: AbortSignal) => Promise<string | undefined>;
export type SemanticOutcome = 'unavailable' | 'local' | 'reviewed' | 'reformulated' | 'clarification' | 'fallback';

export function evidenceFingerprint(item: EvidenceText): string {
  return createHash('sha256').update(JSON.stringify([item.documentName, item.documentVersion, item.effectiveDate, item.text])).digest('hex');
}

export function verifiedSemanticDecision(item: EvidenceText, proof: SemanticProof | undefined, renderedText: string): EvidenceDecision | undefined {
  if (!proof || proof.fingerprint !== evidenceFingerprint(item) || !Array.isArray(proof.topics)
      || !proof.topics.length || proof.topics.some(topic => !Number.isSafeInteger(topic) || topic < 0)
      || typeof proof.quote !== 'string' || proof.quote.length < 8 || !space(renderedText).includes(proof.quote)) return undefined;
  return { topics: proof.topics, directTopics: proof.topics, quality: 2, reason: 'semantic-direct' };
}

type ReviewDecision =
  | { kind: 'unrelated' }
  | { kind: 'direct'; topics: number[]; quote: string };

function parseResponse(value: string | undefined) {
  if (!value || value.length > 14000) return undefined;
  try {
    const raw: unknown = JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    return isRecord(raw) && Array.isArray(raw.decisions) && raw.decisions.length <= 8 ? raw : undefined;
  } catch {
    return undefined;
  }
}

function space(text: string) {
  return text.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

export async function reviewCandidates(model: SemanticModel, query: string, candidates: readonly Citation[],
  topics: SemanticInput['topics'], deadline: AbortSignal) {
  if (deadline.aborted) return undefined;
  const top = candidates.slice(0, 8).map(citation => ({
    citation, input: {
      id: 0, title: citation.documentName.slice(0, 180), text: citation.modelText.slice(0, 1300),
      version: citation.documentVersion?.slice(0, 80), effectiveDate: citation.effectiveDate,
    },
  }));
  const input = { query, topics, candidates: top.map(({ input }, index) => ({ ...input, id: index + 1 })) };
  const signal = AbortSignal.any([deadline, AbortSignal.timeout(8000)]);
  let onAbort: (() => void) | undefined;
  let response;
  try {
    const aborted = new Promise<undefined>(resolve => {
      onAbort = () => resolve(undefined);
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) onAbort();
    });
    response = parseResponse(await Promise.race([aborted, model(input, signal)]));
  } catch {
    return undefined;
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
  if (!response || signal.aborted) return undefined;
  const decisions = new Map<string, ReviewDecision>();
  const seen = new Set<number>();
  const rawDecisions = response.decisions;
  if (!Array.isArray(rawDecisions)) return undefined;
  for (const row of rawDecisions) {
    if (!isRecord(row) || typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || seen.has(row.id)) return undefined;
    const candidate = top[row.id - 1];
    if (!candidate) return undefined;
    seen.add(row.id);
    const fingerprint = evidenceFingerprint({ ...candidate.citation, text: candidate.citation.modelText });
    if (row.kind === 'unrelated') decisions.set(fingerprint, { kind: 'unrelated' });
    else if (row.kind === 'direct' && Array.isArray(row.topics) && typeof row.quote === 'string') {
      const quote = space(row.quote);
      const supported = topics.filter(topic => row.topics instanceof Array && row.topics.includes(topic.index)).map(topic => topic.index);
      if (quote.length < 8 || quote.length > 260 || !space(candidate.input.text).includes(quote)
          || !supported.length || supported.length !== new Set(row.topics).size) return undefined;
      decisions.set(fingerprint, { kind: 'direct', topics: supported, quote });
    } else return undefined;
  }
  const rewrite = typeof response.rewrite === 'string' ? space(response.rewrite) : '';
  return {
    decisions, checked: new Set(top.map(({ citation }) => evidenceFingerprint({ ...citation, text: citation.modelText }))),
    rewrite: rewrite.length >= 4 && rewrite.length <= 120 ? rewrite : undefined,
    needsClarification: response.needsClarification === true,
  };
}
