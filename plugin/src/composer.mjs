/** 客户端仅维护界面状态，最终是否强制检索以 Host 已确认的会话开关为准。 */
export function createSelectionClient(rpc) {
  const sessions = new Map();
  function entry(id) {
    if (!sessions.has(id)) sessions.set(id, { value: { selected: false, loading: true, error: '' }, listeners: new Set(), revision: 0 });
    return sessions.get(id);
  }
  function publish(row, patch) { row.value = { ...row.value, ...patch }; for (const listener of row.listeners) listener(); }
  async function refresh(id) {
    const row = entry(id); if (row.pending || row.refreshing) return;
    row.refreshing = true;
    const revision = row.revision;
    try { const value = await rpc('selection', { sessionId: id }); if (revision === row.revision) publish(row, { ...value, loading: false, error: row.selectError || '' }); }
    catch (error) { if (revision === row.revision) publish(row, { loading: false, error: error.message }); }
    finally { row.refreshing = false; }
  }
  return {
    get: id => entry(id).value,
    subscribe(id, listener) {
      const row = entry(id); row.listeners.add(listener);
      if (row.listeners.size === 1) { void refresh(id); row.timer = setInterval(() => { void refresh(id); }, 800); }
      return () => { row.listeners.delete(listener); if (!row.listeners.size) clearInterval(row.timer); };
    },
    async select(id, selected) {
      const row = entry(id); if (row.pending) return;
      row.pending = true; row.revision++; row.selectError = ''; publish(row, { pending:true,pendingAction:'select',error:'' });
      try { const value = await rpc('select', { sessionId: id, selected }); publish(row, { ...value, loading: false, phase: '', message: '', error: '' }); }
      catch (error) { row.selectError = `公司知识库开关保存失败：${error.message}`; publish(row, { loading: false, error: row.selectError }); }
      finally { row.pending = false; publish(row, { pending:false,pendingAction:'' }); }
    },
    async retry(id) {
      const row=entry(id); if(row.pending) return;
      row.pending=true; row.revision++; row.selectError=''; publish(row,{ pending:true,pendingAction:'service',error:'' });
      try { const value=await rpc('service-retry',{}); publish(row,{ ...value,error:'',loading:false }); }
      catch(error) { row.selectError=error.message; publish(row,{ servicePhase:'error',error:error.message }); }
      finally { row.pending=false; publish(row,{ pending:false,pendingAction:'' }); }
    },
  };
}

/** 这是程序检索上下文的真实来源记录，独立于模型发出的工具事件，可随 DSH 历史回放。 */
export const prefetchDefinition = {
  kind: 'tbea-knowledge-prefetch', target: 'chat',
  match: event => event.type === 'user/message' && event.data.source?.kind === 'tbea-knowledge-prefetch'
    ? { id: String(event.data.id), role: 'start', exclusive: true } : null,
  start: (_context, match) => match.event.data.source,
  update: context => context.state,
  buildViewNode(context) {
    const start = context.start ?? context.matches[0];
    if (!start || !context.state) return null;
    return { key: context.key, kind: 'tbea-knowledge-prefetch', id: context.id, target: 'chat', anchorSeq: start.event.seq,
      location: start.location, visibility: 'visible', groupTree: 'input', data: context.state };
  },
};

/** + 和 / 共用 DSH 原生命令菜单。 */
export function registerKnowledgeEntries(ctx, store) {
  const name = '公司知识库';
  ctx.effect(() => ctx.commandUi.register({ name, label: () => name,
    description: () => '先检索当前项目可用的知识库，再回答。持续到手动取消', available: () => true,
    ui: { kind: 'action', run: session => { void store.select(session.sessionId, true); } },
  }), 'tbea: company knowledge command');
}
