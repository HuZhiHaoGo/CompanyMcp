import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { FileText, LoaderCircle } from 'lucide-react';
import { DocumentReader } from './library-browser.tsx';
import type { LibraryBridge } from './library-browser.tsx';
import { answerCitationIds, citationReferences, knowledgeCitationId, mergeCitedDocuments, readCitationHistory, resolveAnswerCitation, snapshotDocuments } from './cited-documents.ts';
import type { CitationSessionBinding, CitationSnapshot } from './cited-documents.ts';

type SnapshotBridge = (endpoint: 'snapshot', args: { snapshotId: string }, signal: AbortSignal) => Promise<unknown>;
type OpenView = (view: string, focus: string) => void;
type CitationBridge = SnapshotBridge & LibraryBridge;
interface CitedDocumentsProps {
  binding: CitationSessionBinding;
  bridge: CitationBridge;
  openView: OpenView;
}

type PreviewState = { document?: Awaited<ReturnType<typeof resolveAnswerCitation>>; error?: string };

export function CitationLinks({ binding, bridge, renderEvidence }: { binding?: CitationSessionBinding; bridge: CitationBridge;
  renderEvidence: (document: NonNullable<PreviewState['document']>) => ReactNode }) {
  const marker = useRef<HTMLSpanElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController>();
  const [preview, setPreview] = useState<PreviewState>();
  const [showOriginal, setShowOriginal] = useState(false);
  const open = preview !== undefined;
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);
  useEffect(() => {
    if (!binding) return;
    const { eventSource } = binding;
    // The composer and transcript are siblings in the session content container.
    const scopeSelector = '[data-conversation-content][data-conversation-session]';
    const scope = marker.current?.closest(scopeSelector);
    if (!scope || scope.getAttribute('data-conversation-session') !== binding.sessionId) return;
    function click(event: Event) {
      if (!(event.target instanceof Element)) return;
      // Harness renders a settled local Markdown link as a button with the decoded destination in title.
      const target = event.target.closest('button[title],a[href]');
      const id = target?.getAttribute(target.tagName === 'BUTTON' ? 'title' : 'href');
      const row = target?.closest('[data-chat-turn]:is([data-chat-flow-kind="assistant-step"],[data-chat-flow-kind="assistant"],[data-chat-flow-kind="turn-tail"])');
      if (!id || !knowledgeCitationId.test(id) || !row || row.closest(scopeSelector) !== scope) return;
      const turn = Number(row.getAttribute('data-chat-turn'));
      if (!Number.isSafeInteger(turn) || turn < 0) return;
      event.preventDefault();
      event.stopPropagation();
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setShowOriginal(false);
      setPreview({});
      const missing = '对应轮次没有可打开的知识库引用。';
      void resolveAnswerCitation(eventSource.getSnapshot().entries, turn, id,
        snapshotId => bridge('snapshot', { snapshotId }, controller.signal)).then(document => {
        if (!controller.signal.aborted) setPreview(document ? { document } : { error: missing });
      }, error => {
        if (!controller.signal.aborted) setPreview({ error: error instanceof Error ? error.message : missing });
      });
    }
    scope.addEventListener('click', click, true);
    return () => {
      scope.removeEventListener('click', click, true);
      request.current?.abort();
    };
  }, [binding, bridge]);

  const close = () => dialog.current?.close();
  const document = preview?.document;
  return <>
    <span hidden ref={marker} />
    {open && <dialog ref={dialog} className="tbea-citation-dialog" aria-label="知识库引用"
      onClose={() => { request.current?.abort(); setPreview(undefined); }}>
      <div className="tbea-library">
        {document ? <>
          <header className="tbea-citation-dialog-header">
            {!showOriginal && <h2>{document.documentName}</h2>}
            {!showOriginal && document.documentId && <button type="button" className="tbea-library-button" onClick={() => setShowOriginal(true)}>
              查看原文
            </button>}
            <button type="button" className="tbea-library-button" onClick={close}>关闭引用</button>
          </header>
          {showOriginal ? <DocumentReader bridge={bridge} libraryId={document.knowledgeBaseId}
            documentInfo={{ id: document.documentId, name: document.documentName }} requestPreview
            backLabel="返回命中切片" close={() => setShowOriginal(false)} /> : <div className="tbea-citation-evidence">
            {renderEvidence(document)}
          </div>}
        </>
          : <div className="tbea-library-state" role={preview?.error ? 'alert' : 'status'}>
            {preview?.error ?? '正在核对引用…'} <button type="button" className="tbea-library-button" onClick={close}>关闭</button>
          </div>}
      </div>
    </dialog>}
  </>;
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
  const citedByTurn = useMemo(() => answerCitationIds(history.entries), [history]);
  const ids = [...references.keys()];
  const snapshots = useCitationSnapshots(bridge, JSON.stringify(ids.sort()), revision);
  const { documents, unavailable } = useMemo(() => mergeCitedDocuments(references, snapshots, citedByTurn), [references, snapshots, citedByTurn]);
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
            <p>{item.libraries.join('、') || '公司知识库'} · {item.turns.length === 1 ? `第 ${item.turns[0]} 轮` : `引用于 ${item.turns.length} 轮`}
              {item.citedTurns.length > 0 && <span className="tbea-cited-status">正文已引用</span>}
            </p>
            {(item.documentVersion || item.effectiveDate) && <p>{[item.documentVersion, item.effectiveDate && `${item.effectiveDate} 生效`].filter(Boolean).join(' · ')}</p>}
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
