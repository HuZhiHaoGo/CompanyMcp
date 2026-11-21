import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TOOLS } from '../../src/knowledge.mjs';
import { readConfig } from '../../src/config.mjs';
import { SelectionStore, createPrefetch } from './selection.mjs';

export const name = 'tbea-knowledge';
export const inject = ['tools', 'connection', 'agents'];

/** 只桥接本服务的两个只读工具；使用官方 MCP 客户端协议，不依赖通用桥接插件。 */
export async function apply(ctx, config = {}) {
  if (!config.configFile || !path.isAbsolute(config.configFile)) throw new Error('请在插件配置中设置 configFile 的绝对路径');
  const local = await readConfig(config.configFile);
  if (typeof local.serviceToken !== 'string' || local.serviceToken.length < 32 || !Number.isInteger(local.port)) throw new Error('知识服务配置未初始化');
  const base = `http://127.0.0.1:${local.port}`;
  const authorization = `Bearer ${local.serviceToken}`;
  const lifetime = new AbortController(); let connection; let connecting;
  const clients = new Set();
  const requestScope = new AsyncLocalStorage();
  const selections = new SelectionStore(local.dataDirectory); const status = new Map();
  async function client() {
    if (connection) return connection;
    if (connecting) return connecting;
    connecting = (async () => {
      const next = new Client({ name: 'tbea-dsh-display', version: '0.2.0' }); clients.add(next);
      try {
        await next.connect(new StreamableHTTPClientTransport(new URL('/mcp', base), {
          requestInit: { headers: { Authorization: authorization }, redirect: 'error' },
          // 无状态 HTTP 的取消通知不能命中另一请求的 Server；主动中断该次 fetch，
          // 让服务端接到连接关闭。AsyncLocalStorage 保证并行会话互不取消。
          fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.any([init?.signal, requestScope.getStore(), lifetime.signal].filter(Boolean)) }),
          reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
        }), { timeout: 10000, signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(10000)]) });
        next.onclose = () => { if (connection === next) connection = undefined; clients.delete(next); };
        connection = next; return next;
      } catch { clients.delete(next); await next.close().catch(() => {}); throw new Error('无法连接本机知识服务，请先启动 Start-Service.ps1'); }
      finally { connecting = undefined; }
    })(); return connecting;
  }

  // 自动工具调用与程序预检索复用相同的真实 MCP 通道、响应校验和取消信号。
  async function callTool(name, args, requestSignal) {
    const signal = AbortSignal.any([requestSignal, lifetime.signal, AbortSignal.timeout(120000)]); signal.throwIfAborted();
    // 连接建立可被当前问题取消，但不关闭其他会话共享的 MCP 客户端。
    const transport = await new Promise((resolve, reject) => {
      const aborted = () => reject(signal.reason); signal.addEventListener('abort', aborted, { once: true });
      client().then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted));
    }); let result;
    signal.throwIfAborted();
    try { result = await requestScope.run(signal, () => transport.callTool({ name, arguments: args }, undefined, { signal, timeout: 120000 })); }
    catch { if (signal.aborted) throw signal.reason; connection = undefined; await transport.close().catch(() => {}); throw new Error('知识服务调用失败；未自动重发，请检查服务状态'); }
    if (result.isError) throw new Error(result.content?.find(x => x.type === 'text')?.text || '知识检索失败');
    const value = result.structuredContent;
    if (value?.schema !== 'tbea-mcp-result/v1' || value.model?.schema !== 'tbea-knowledge/v1' || value.view?.schema !== 'tbea-view/v1') throw new Error('知识服务响应版本不兼容');
    return { model: value.model, view: value.view };
  }
  ctx.on('agent/pre-step', createPrefetch({ selections, callTool, status }), { prepend: true });

  for (const tool of TOOLS) {
    const wireName = `mcp__tbea__${tool.name}`;
    ctx.tools.register({ name: wireName, description: tool.description + (tool.name === 'search_knowledge' ? ` 可用知识库：${(local.knowledgeBases || []).map(k => `${k.name} (${k.id})`).join('；')}` : ''), parameters: tool.inputSchema,
      output: {
        schema: { type: 'object', properties: { model: {}, view: {} }, required: ['model', 'view'], additionalProperties: false },
        // 模型只看到文字，界面专用标识通过独立的持久 meta 传递，不要求视觉模型。
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value.model) }],
        presentationMeta: (_args, value) => value.view,
      },
      execute: (args, execution) => callTool(tool.name, args, execution.signal),
    });
  }

  // 使用 Connection 的鉴权 RPC，而不是浏览器直连后端或依赖 Electron 私有接口。
  ctx.connection.rpc.handle('/tbea', async (endpoint, args, signal, peer) => {
    if (peer.principal.kind !== 'owner') return { ok: false, error: { code: 'FORBIDDEN', message: '不允许访问知识资料', details: {} } };
    try {
      if (endpoint === 'selection' || endpoint === 'select') {
        const selected = endpoint === 'select' ? await selections.set(args.sessionId, args.selected) : await selections.get(args.sessionId);
        if (endpoint === 'select') status.delete(args.sessionId);
        return { ok: true, value: { selected, ...(status.get(args.sessionId) || {}) } };
      }
      if (!['snapshot', 'asset', 'refresh'].includes(endpoint)) throw new Error('未知知识展示操作');
      if (endpoint === 'refresh') {
        const c = await client();
        const r = await c.callTool({ name: 'get_chunk_detail', arguments: { snapshotId: args.snapshotId, citationId: args.citationId } }, undefined, { signal, timeout: 60000 });
        if (r.isError) throw new Error(r.content?.find(x => x.type === 'text')?.text || '刷新失败');
      }
      const url = new URL(endpoint === 'asset' ? '/asset' : '/snapshot', base);
      url.searchParams.set('snapshotId', String(args.snapshotId || ''));
      if (endpoint === 'asset') url.searchParams.set('imageId', String(args.imageId || ''));
      const response = await fetch(url, { headers: { Authorization: authorization }, signal: AbortSignal.any([signal, lifetime.signal, AbortSignal.timeout(60000)]), redirect: 'error' });
      if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || `知识服务 HTTP ${response.status}`); }
      if (endpoint === 'asset') {
        const bytes = new Uint8Array(await response.arrayBuffer());
        return { ok: true, value: { mediaType: response.headers.get('content-type'), bytes: null }, attachments: [{ path: ['bytes'], bytes }] };
      }
      return { ok: true, value: await response.json() };
    } catch (error) { return { ok: false, error: { code: 'TBEA_VIEW_FAILED', message: error.message || '参考来源读取失败', details: {} } }; }
  });
  ctx.effect(() => async () => { lifetime.abort(); await Promise.allSettled([...clients].map(c => c.close())); }, 'tbea: MCP connection');
}
