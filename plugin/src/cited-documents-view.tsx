import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { MouseEvent } from 'react';
import { FileText, LoaderCircle } from 'lucide-react';
import { DocumentReader } from './library-browser.tsx';
import type { LibraryBridge } from './library-browser.tsx';
import { citationReferences, mergeCitedDocuments, readCitationHistory, snapshotDocuments } from './cited-documents.ts';
import type { CitationSessionBinding, CitationSnapshot } from './cited-documents.ts';

type SnapshotBridge = (endpoint: 'snapshot', args: { snapshotId: string }, signal: AbortSignal) => Promise<unknown>;
type OpenView = (view: string, focus: string) => void;
interface CitedDocumentsProps {
  binding: CitationSessionBinding;
  bridge: SnapshotBridge & LibraryBridge;
  openView: OpenView;
}

function useCitationSnapshots(bridge: SnapshotBridge, ids: string, revision: number) {
  const cache = useRef(new Map<string, CitationSnapshot>());
  const [snapshots, setSnapshots] = useState(cache.current);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const requested: string[] = JSON.parse(ids); // Internal key built from the string ids of the reference map.
    const pending = requested.filter(id => {
      const cached = cache.current.get(id);
      return !cached || (cached.errorRevision !== undefined && cached.errorRevision < revision);
    });
    async function read() {
      for (let id = pending.shift(); id !== undefined && !signal.aborted; id = pending.shift()) {
        let result: CitationSnapshot;
        try {
          const snapshot = await bridge('snapshot', { snapshotId: id }, signal);
          result = { citations: snapshotDocuments(snapshot) };
        } catch {
          result = { errorRevision: revision };
        }
        if (signal.aborted) return;
        // Publish each result so available documents can be opened while history is still loading.
        cache.current = new Map(cache.current).set(id, result);
        setSnapshots(cache.current);
      }
    }
    const workers = Math.min(pending.length, 4);
    for (let worker = 0; worker < workers; worker++) void read();
    return () => controller.abort();
  }, [bridge, ids, revision]);
  return snapshots;
}

function showChatTurn(event: MouseEvent<HTMLButtonElement>, openView: OpenView, turn: number) {
  const view = event.currentTarget.closest('[data-slot="conversation.view"]');
  openView('chat', `turn:${turn}`);
  if (!view) return;
  // Chat does not consume view focus requests in the supported Harness versions.
  // Wait for the Chat outlet to mount and locate its own turn marker in this session.
  const limit = performance.now() + 3000;
  let anchor: HTMLElement | undefined;
  const locate = (now: number) => {
    if (!view.isConnected || now >= limit) return;
    const rows = [...view.querySelectorAll<HTMLElement>(`[data-chat-turn="${turn}"][data-chat-anchor-key]:not([hidden]):not([hidden] *)`)]
      .filter(row => row.getClientRects().length > 0 && row.offsetHeight > 0);
    const target = rows.find(row => row.dataset.chatFlowKind === 'input-message') ?? rows[0];
    if (!target || target !== anchor) {
      anchor = target;
      requestAnimationFrame(locate);
      return;
    }
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
  };
  requestAnimationFrame(locate);
}

export function CitedDocumentsView({ binding, ...props }: Omit<CitedDocumentsProps, 'binding'> & { binding?: CitationSessionBinding }) {
  return binding
    ? <SessionDocuments key={binding.sessionId} binding={binding} {...props} />
    : <div className="tbea-library-state" role="status">正在连接当前会话…</div>;
}

function SessionDocuments({ binding, bridge, openView }: CitedDocumentsProps) {
  const { eventSource } = binding;
  const subscribe = useCallback((listener: () => void) => eventSource.subscribe(listener), [eventSource]);
  const getWindow = useCallback(() => eventSource.getSnapshot(), [eventSource]);
  const history = useSyncExternalStore(subscribe, getWindow, getWindow);
  const [revision, setRevision] = useState(0);
  const [historyStatus, setHistoryStatus] = useState<{ loading: boolean; error?: string }>({ loading: true });
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    setHistoryStatus({ loading: true });
    readCitationHistory(binding, controller.signal).then(() => {
      if (!controller.signal.aborted) setHistoryStatus({ loading: false });
    }, error => {
      if (!controller.signal.aborted) setHistoryStatus({
        loading: false, error: error instanceof Error ? error.message : '暂时无法读取会话记录。',
      });
    });
    return () => controller.abort();
  }, [binding, revision]);
  const references = useMemo(() => citationReferences(history.entries), [history]);
  const ids = [...references.keys()];
  const snapshots = useCitationSnapshots(bridge, JSON.stringify(ids.sort()), revision);
  const { documents, unavailable } = useMemo(() => mergeCitedDocuments(references, snapshots), [references, snapshots]);
  const loading = historyStatus.loading || ids.some(id => {
    const snapshot = snapshots.get(id);
    return !snapshot || (snapshot.errorRevision !== undefined && snapshot.errorRevision < revision);
  });
  const snapshotError = ids.some(id => snapshots.get(id)?.errorRevision === revision);
  const incomplete = historyStatus.error || snapshotError || unavailable;
  const document = documents.find(item => item.key === selected);

  return <section className="tbea-library tbea-cited-documents" aria-label="引用文档">
    {document ? <div className="tbea-cited-preview">
      <DocumentReader key={document.key} bridge={bridge} libraryId={document.knowledgeBaseId}
        documentInfo={{ id: document.documentId, name: document.documentName }} requestPreview
        backLabel="返回引用文档" close={() => setSelected(undefined)} />
    </div> : <>
      {loading && <div className="tbea-library-state" role="status"><LoaderCircle size={16} className="tbea-spin" />正在汇总会话引用…</div>}
      {incomplete && <div className="tbea-library-state tbea-library-error" role="status">
        <span>{historyStatus.error || (snapshotError ? '部分参考来源暂时无法读取。' : '部分参考来源缺少文档标识，可在对应轮次查看。')}</span>
        {(historyStatus.error || snapshotError) && <button className="tbea-library-button" type="button" onClick={() => setRevision(value => value + 1)}>重试</button>}
      </div>}
      {!loading && !incomplete && !documents.length && <div className="tbea-library-state">本会话还没有公司知识库引用文档。</div>}
      <ul className="tbea-cited-list" aria-label="本会话的知识文档">
        {documents.map(item => <li key={item.key} className="tbea-cited-row">
          <div className="tbea-cited-document">
            <button type="button" className="tbea-cited-name" onClick={() => setSelected(item.key)}>
              <FileText size={16} aria-hidden="true" /><span>{item.documentName}</span>
            </button>
            <p>{item.knowledgeBaseName || '公司知识库'} · {item.turns.length === 1 ? `第 ${item.turns[0]} 轮` : `引用于 ${item.turns.length} 轮`}</p>
          </div>
          {item.turns.length === 1
            ? <button type="button" className="tbea-library-button" onClick={event => showChatTurn(event, openView, item.turns[0])}>查看引用</button>
            : <details className="tbea-cited-turns">
                <summary className="tbea-library-button">查看引用</summary>
                <ul>{item.turns.map(turn => <li key={turn}>
                  <button type="button" className="tbea-library-button" onClick={event => showChatTurn(event, openView, turn)}>第 {turn} 轮</button>
                </li>)}</ul>
              </details>}
        </li>)}
      </ul>
    </>}
  </section>;
}
