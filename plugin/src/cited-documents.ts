import { isRecord } from '../../src/contracts.ts';
import type { PublicCitation } from '../../src/contracts.ts';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Nodes } from 'mdast';

const searchTool = 'mcp__tbea__search_knowledge';
const detailTool = 'mcp__tbea__get_chunk_detail';

interface Observable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}

interface CitationHistory {
  readonly entries: readonly unknown[];
  readonly hasMore: boolean;
}

interface CitationSessionState {
  readonly openState: string;
  readonly loadingOlder: boolean;
}

// Public subset of the Harness SessionBinding used by this view.
export interface CitationSessionBinding {
  readonly sessionId: string;
  readonly eventSource: Observable<CitationHistory>;
  readonly session: Observable<CitationSessionState> & { loadOlder(): Promise<void> };
}

type CitationReferences = Map<string, Map<number, Set<string> | null>>;
type SnapshotDocument = Pick<PublicCitation, 'citationId' | 'documentId' | 'documentName' | 'knowledgeBaseId' | 'knowledgeBaseName' | 'documentGroupId' | 'documentVersion' | 'effectiveDate'>;
export type CitationSnapshot =
  | { citations: SnapshotDocument[]; errorRevision?: never }
  | { citations?: never; errorRevision: number };

interface ToolCall {
  name: typeof searchTool | typeof detailTool;
  turn: number;
  arguments: unknown;
}

function validTurn(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseJson(text: unknown): unknown {
  if (typeof text !== 'string') return undefined;
  try { return JSON.parse(text); } catch { return undefined; }
}

export const knowledgeCitationId = /^K[0-9a-f]{8}-[1-9]\d*(?:-[1-9]\d*)?$/;

export function answerCitationIds(entries: readonly unknown[]) {
  const finalByTurn = new Map<number, Set<string>>();
  for (const entry of entries) {
    if (!isRecord(entry) || entry.type !== 'event' || !isRecord(entry.event) || entry.event.type !== 'assistant/message') continue;
    const { data } = entry.event;
    if (!isRecord(data) || !validTurn(data.turn) || !isRecord(data.message) || !Array.isArray(data.message.content)) continue;
    const text = data.message.content.flatMap(part => isRecord(part) && part.type === 'text' && typeof part.text === 'string' ? [part.text] : []).join('\n');
    if (!text.trim()) continue;
    const ids = new Set<string>();
    const pending: Nodes[] = [fromMarkdown(text)];
    for (let node = pending.pop(); node; node = pending.pop()) {
      if (node.type === 'link') {
        if (knowledgeCitationId.test(node.url)) ids.add(node.url);
      } else if (node.type === 'text') {
        for (const match of node.value.matchAll(/\[(K[0-9a-f]{8}-[1-9]\d*(?:-[1-9]\d*)?)\]/g)) ids.add(match[1]);
      } else if ('children' in node) {
        pending.push(...node.children);
      }
    }
    finalByTurn.set(data.turn, ids);
  }
  return finalByTurn;
}

function containsCitation(selection: Set<string> | null | undefined, id: string) {
  return selection === null || selection?.has(id) === true;
}

export async function resolveAnswerCitation(entries: readonly unknown[], turn: number, id: string,
  loadSnapshot: (snapshotId: string) => Promise<unknown>): Promise<SnapshotDocument | undefined> {
  if (!answerCitationIds(entries).get(turn)?.has(id)) return;
  const documents = [];
  for (const [snapshotId, turns] of citationReferences(entries)) {
    if (!id.startsWith('K' + snapshotId.slice(0, 8) + '-') || !containsCitation(turns.get(turn), id)) continue;
    const snapshot = await loadSnapshot(snapshotId);
    documents.push(...snapshotDocuments(snapshot).filter(doc => doc.citationId === id && doc.knowledgeBaseId && doc.documentId));
  }
  return documents.length === 1 ? documents[0] : undefined;
}

function addReference(references: CitationReferences, snapshotId: string | undefined, turn: number | undefined, citationId: string | null) {
  if (!snapshotId || turn === undefined) return;
  const turns = references.get(snapshotId) ?? new Map<number, Set<string> | null>();
  const ids = turns.get(turn);
  if (ids !== null) {
    if (citationId === null) turns.set(turn, null);
    else if (ids) ids.add(citationId);
    else turns.set(turn, new Set([citationId]));
  }
  references.set(snapshotId, turns);
}

function toolResult(value: unknown, schema: string) {
  return isRecord(value) && value.schema === schema && typeof value.snapshotId === 'string' && value.snapshotId
    ? { snapshotId: value.snapshotId, citations: value.citations } : undefined;
}

export function citationReferences(entries: readonly unknown[]) {
  const references: CitationReferences = new Map();
  const toolCalls = new Map<string, ToolCall>();
  let turn: number | undefined;
  for (const entry of entries) {
    if (!isRecord(entry) || entry.type !== 'event' || !isRecord(entry.event)) continue;
    const event = entry.event;
    const data = event.data;
    if (!isRecord(data)) continue;
    switch (event.type) {
      case 'turn/start':
        toolCalls.clear();
        turn = validTurn(data.turn) ? data.turn : undefined;
        break;
      case 'turn/end':
        turn = undefined;
        toolCalls.clear();
        break;
      case 'step/start':
        turn = validTurn(data.turn) ? data.turn : undefined;
        break;
      case 'user/message':
        if (isRecord(data.source) && data.source.kind === 'tbea-knowledge-prefetch') {
          const view = toolResult(data.source.view, 'tbea-view/v1');
          addReference(references, view?.snapshotId, turn, null);
        }
        break;
      case 'tool/call':
        if (typeof data.callId === 'string' && validTurn(data.turn) && (data.name === searchTool || data.name === detailTool)) {
          toolCalls.set(data.callId, { name: data.name, turn: data.turn, arguments: data.arguments });
        }
        break;
      case 'tool/result': {
        const message = data.message;
        if (!isRecord(message) || message.isError || (event.surfaceOp && event.surfaceOp !== 'append')) break;
        if (!isRecord(message.source) || typeof message.source.callId !== 'string') break;
        const call = toolCalls.get(message.source.callId);
        if (!call || call.turn !== data.turn) break;
        const meta = toolResult(data.meta, 'tbea-view/v1');
        const args = parseJson(call.arguments);
        let citationId = isRecord(args) && typeof args.citationId === 'string' ? args.citationId : undefined;
        const text = (!meta || (call.name === detailTool && !citationId)) && Array.isArray(message.content)
          ? message.content.flatMap(part => isRecord(part) && part.type === 'text' && typeof part.text === 'string' ? [part.text] : []).join('\n')
          : undefined;
        const result = toolResult(parseJson(text), 'tbea-knowledge/v1');
        const snapshotId = meta?.snapshotId ?? result?.snapshotId;
        if (call.name === searchTool) addReference(references, snapshotId, call.turn, null);
        else {
          const first: unknown = Array.isArray(result?.citations) ? result.citations[0] : undefined;
          if (!citationId && isRecord(first) && typeof first.citationId === 'string') citationId = first.citationId;
          if (citationId) addReference(references, snapshotId, call.turn, citationId);
        }
        break;
      }
    }
  }
  return references;
}

export function snapshotDocuments(snapshot: unknown): SnapshotDocument[] {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.citations)
      || (snapshot.schema !== undefined && snapshot.schema !== 'tbea-snapshot/v1')) {
    throw new Error('历史来源快照格式无效。');
  }
  return snapshot.citations.flatMap(citation => {
    if (!isRecord(citation)) throw new Error('历史来源快照中有无效的引用。');
    const equivalents: unknown[] = Array.isArray(citation.equivalentSources) ? citation.equivalentSources : [];
    return [citation, ...equivalents].map(source => {
      const value = isRecord(source) ? source : {};
      return {
        citationId: typeof value.citationId === 'string' ? value.citationId : '',
        documentId: typeof value.documentId === 'string' ? value.documentId : '',
        documentName: typeof value.documentName === 'string' && value.documentName ? value.documentName : '知识库文档',
        knowledgeBaseId: typeof value.knowledgeBaseId === 'string' ? value.knowledgeBaseId : '',
        knowledgeBaseName: typeof value.knowledgeBaseName === 'string' ? value.knowledgeBaseName : '',
        documentGroupId: typeof value.documentGroupId === 'string' && /^[0-9a-f]{64}$/.test(value.documentGroupId) ? value.documentGroupId : undefined,
        documentVersion: typeof value.documentVersion === 'string' ? value.documentVersion : undefined,
        effectiveDate: typeof value.effectiveDate === 'string' ? value.effectiveDate : undefined,
      };
    });
  });
}

export function mergeCitedDocuments(references: CitationReferences, snapshots: ReadonlyMap<string, CitationSnapshot>, citedByTurn = new Map<number, Set<string>>()) {
  const grouped = new Map<string, SnapshotDocument & { key: string; turns: Set<number>; citedTurns: Set<number>; libraries: Set<string> }>();
  let unavailable = false;
  for (const [snapshotId, turns] of references) {
    for (const citation of snapshots.get(snapshotId)?.citations ?? []) {
      for (const [turn, selected] of turns) {
        if (!containsCitation(selected, citation.citationId)) continue;
        if (!citation.documentId || !citation.knowledgeBaseId) {
          unavailable = true;
          continue;
        }
        const key = citation.documentGroupId ?? JSON.stringify([citation.knowledgeBaseId, citation.documentId, citation.documentVersion, citation.effectiveDate]);
        const document = grouped.get(key) ?? { ...citation, key, turns: new Set<number>(), citedTurns: new Set<number>(), libraries: new Set<string>() };
        document.turns.add(turn);
        if (citedByTurn.get(turn)?.has(citation.citationId)) document.citedTurns.add(turn);
        if (citation.knowledgeBaseName) document.libraries.add(citation.knowledgeBaseName);
        grouped.set(key, document);
      }
    }
  }
  const documents = [...grouped.values()].map(document => ({
    ...document, turns: [...document.turns].sort((a, b) => b - a),
    citedTurns: [...document.citedTurns].sort((a, b) => b - a), libraries: [...document.libraries],
  })).sort((a, b) => b.turns[0] - a.turns[0]);
  return { documents, unavailable };
}

function waitForSession(session: Observable<CitationSessionState>, signal: AbortSignal, ready: (state: CitationSessionState) => boolean) {
  if (signal.aborted || ready(session.getSnapshot())) return Promise.resolve();
  let unsubscribe: (() => void) | undefined;
  let finish: (() => void) | undefined;
  const readyOrAborted = new Promise<void>(resolve => {
    finish = () => resolve();
    const changed = () => { if (ready(session.getSnapshot())) resolve(); };
    unsubscribe = session.subscribe(changed);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted || ready(session.getSnapshot())) finish();
  });
  return readyOrAborted.finally(() => {
    unsubscribe?.();
    if (finish) signal.removeEventListener('abort', finish);
  });
}

function firstSequence(entries: readonly unknown[]) {
  const entry = entries[0];
  return isRecord(entry) && isRecord(entry.event) ? entry.event.seq : undefined;
}

export async function readCitationHistory({ session, eventSource }: CitationSessionBinding, signal: AbortSignal) {
  await waitForSession(session, signal, state => state.openState === 'open' || state.openState === 'error');
  signal.throwIfAborted();
  if (session.getSnapshot().openState !== 'open') throw new Error('无法读取当前会话的历史记录。');
  while (eventSource.getSnapshot().hasMore) {
    signal.throwIfAborted();
    if (session.getSnapshot().loadingOlder) {
      await waitForSession(session, signal, state => !state.loadingOlder);
      continue;
    }
    const before = firstSequence(eventSource.getSnapshot().entries);
    await session.loadOlder();
    signal.throwIfAborted();
    const after = eventSource.getSnapshot();
    if (after.hasMore && firstSequence(after.entries) === before) throw new Error('较早的会话记录暂时无法读取。');
  }
}
