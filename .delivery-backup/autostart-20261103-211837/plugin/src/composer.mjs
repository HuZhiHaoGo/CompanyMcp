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
      row.pending = true; row.revision++; row.selectError = ''; publish(row, { pending: true, error: '' });
      try { const value = await rpc('select', { sessionId: id, selected }); publish(row, { ...value, loading: false, phase: '', message: '', error: '' }); }
      catch (error) { row.selectError = `公司知识库开关保存失败：${error.message}`; publish(row, { loading: false, error: row.selectError }); }
      finally { row.pending = false; publish(row, { pending: false }); }
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

/** + 和 / 共用命令目录；@ 只消费候选 token，不把选择文字混入用户问题。 */
export function registerKnowledgeEntries(ctx, store) {
  ctx.effect(() => ctx.commandUi.register({ name: 'company-knowledge', label: () => '公司知识库',
    description: () => '先检索全部已配置知识库，再回答；持续到手动取消', available: () => true,
    ui: { kind: 'action', run: session => { void store.select(session.sessionId, true); } },
  }), 'tbea: + command');
  ctx.effect(() => ctx.inputTriggers.registerSource({ trigger: '@', name: '公司知识', order: -10,
    async candidates(_session, request) {
      if (request.quoted || request.drilled) return [];
      const query = request.query.toLowerCase();
      return !query || '公司知识库 company-knowledge tbea'.includes(query)
        ? [{ name: '公司知识库', description: '先检索全部已配置知识库，再回答', value: 'company-knowledge' }] : [];
    },
    onPick({ candidate, session }) {
      if (candidate.value !== 'company-knowledge') return;
      void store.select(session.sessionId, true); return { text: '' };
    },
  }), 'tbea: @ source');
}
