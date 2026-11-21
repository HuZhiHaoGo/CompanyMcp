import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TOOLS, toolDescription } from '../../src/knowledge.ts';
import { readConfig } from '../../src/config.ts';
import { SERVICE_VERSION } from '../../src/runtime.ts';
import { SelectionStore, createPrefetch } from './selection.mjs';
import { ServiceManager } from './service-manager.mjs';
import { createCatalogHint } from './catalog-hint.mjs';
import { displayPath } from './display-transport.mjs';

export const name = 'tbea-knowledge';
export const inject = ['tools', 'connection', 'agents'];

/** 只桥接本服务的两个只读工具；使用官方 MCP 客户端协议，不依赖通用桥接插件。 */
export async function apply(ctx, config = {}) {
  if (!config.configFile || !path.isAbsolute(config.configFile)) throw new Error('请在插件配置中设置 configFile 的绝对路径');
  const local = await readConfig(config.configFile);
  const { autoRetrieveKnowledge } = local;
  const projectRoot=config.projectRoot || path.resolve(path.dirname(config.configFile),'..');
  if(!path.isAbsolute(projectRoot)) throw new Error('projectRoot 必须为项目的绝对路径');
  if (typeof local.serviceToken !== 'string' || local.serviceToken.length < 32 || !Number.isInteger(local.port)) throw new Error('知识服务配置未初始化');
  const base = `http://127.0.0.1:${local.port}`;
  const authorization = `Bearer ${local.serviceToken}`;
  const lifetime = new AbortController(); let connection; let connecting;
  // 安装后插件可能被复制到 DSH profile，资源位置必须来自项目配置，不能猜测 node_modules 路径。
  const service=new ServiceManager(local,{ demoDirectory:path.join(projectRoot,'dist/demo') });
  const clients = new Set();
  const requestScope = new AsyncLocalStorage();
  const selections = new SelectionStore(local.dataDirectory); const status = new Map();
  // 注册时启动，退出时等待连接及监听器清理，不创建额外进程或后台窗口。
  ctx.effect(()=>{
    void service.ensure().catch(()=>{}); // 错误保留在 service 状态，菜单仍可正常加载。
    return async()=>{
      lifetime.abort();
      await connecting?.catch(()=>{});
      await Promise.allSettled([...clients].map(c=>c.close()));
      await service.close();
    };
  },'tbea: service lifecycle');
  async function client() {
    await service.ensure();
    if (connection) return connection;
    if (connecting) return connecting;
    connecting = (async () => {
      const next = new Client({ name:'tbea-dsh-display',version:SERVICE_VERSION }); clients.add(next);
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
      } catch { clients.delete(next); await next.close().catch(() => {}); throw new Error('无法连接公司知识服务，请检查插件服务状态和配置；本次未自动重发'); }
      finally { connecting = undefined; }
    })(); return connecting;
  }

  // 自动工具调用与程序预检索复用相同的真实 MCP 通道、响应校验和取消信号。
  async function callTool(name, args, requestSignal, manuallySelected = false) {
    const signal = AbortSignal.any([requestSignal, lifetime.signal, AbortSignal.timeout(120000)]); signal.throwIfAborted();
    // 连接建立可被当前问题取消，但不关闭其他会话共享的 MCP 客户端。
    const transport = await new Promise((resolve, reject) => {
      const aborted = () => reject(signal.reason); signal.addEventListener('abort', aborted, { once: true });
      client().then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted));
    }); let result;
    signal.throwIfAborted();
    const params = { name, arguments: args, ...(manuallySelected && { _meta: { 'tbea/trigger': 'manual' } }) };
    try { result = await requestScope.run(signal, () => transport.callTool(params, undefined, { signal, timeout: 120000 })); }
    catch { if (signal.aborted) throw signal.reason; throw new Error('知识服务调用失败；未自动重发，请检查服务状态'); }
    if(result.isError) {
      let message=result.content?.find(x=>x.type==='text')?.text || '知识检索失败';
      try { const parsed=JSON.parse(message); if(typeof parsed.message==='string') message=parsed.message; } catch {}
      throw new Error(message);
    }
    const value = result.structuredContent;
    if (value?.schema !== 'tbea-mcp-result/v1' || value.model?.schema !== 'tbea-knowledge/v1' || value.view?.schema !== 'tbea-view/v1') throw new Error('知识服务响应版本不兼容');
    return { model: value.model, view: value.view };
  }
  ctx.on('agent/pre-step', createPrefetch({ selections, callTool, status, autoRetrieveKnowledge }), { prepend: true });

  // 手动模式只允许预检索和界面操作通过内部通道调用 MCP，模型工具不注册。
  if (autoRetrieveKnowledge) {
    const catalogHint = createCatalogHint({
      signal: lifetime.signal,
      async load(signal) {
        await service.ensure();
        const response = await fetch(new URL('/catalog-summary', base), {
          headers: { Authorization: authorization }, redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        });
        if (!response.ok) throw new Error('知识库目录暂不可用');
        return response.json();
      },
    });
    catalogHint(); // 插件加载后后台预热，用户提问不等待目录同步。
    for (const tool of TOOLS) {
      const wireName = `mcp__tbea__${tool.name}`;
      const description = toolDescription(tool, local);
      ctx.tools.register({ name: wireName, parameters: tool.inputSchema,
        // DSH 每个模型步骤读取工具说明；摘要不写入聊天消息，也不改变工具注册与授权。
        get description() {
          const hint = tool.name === 'search_knowledge' ? catalogHint() : '';
          return hint ? description + '\n\n' + hint : description;
        },
        output: {
          schema: { type: 'object', properties: { model: {}, view: {} }, required: ['model', 'view'], additionalProperties: false },
          // 模型只看到文字，界面专用标识通过独立的持久 meta 传递，不要求视觉模型。
          render: (_args, value) => [{ type: 'text', text: JSON.stringify(value.model) }],
          presentationMeta: (_args, value) => value.view,
        },
        execute: (args, execution) => callTool(tool.name, args, execution.signal),
      });
    }
  }

  // Connection 对精确 Fetch 路由执行 Owner 鉴权，并跟随插件卸载撤销注册。
  ctx.connection.fetch.register({
    path: displayPath,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
      if (mediaType !== 'application/json') {
        return Response.json({ ok: false, error: { message: '知识展示请求须使用 JSON' } }, { status: 415 });
      }
      const payload = await request.json().catch(() => null);
      if (typeof payload?.endpoint !== 'string') {
        return Response.json({ ok: false, error: { message: '无效的知识展示请求' } }, { status: 400 });
      }
      const result = await display(payload.endpoint, payload.args, request.signal);
      const headers = { 'cache-control': 'no-store' };
      if (result.ok && result.value?.bytes instanceof Uint8Array) {
        return new Response(result.value.bytes, { headers: { ...headers, 'content-type': result.value.mediaType } });
      }
      return Response.json(result, { headers });
    },
  });

  async function display(endpoint, args, signal) {
    try {
      if(endpoint==='service-retry') { await service.ensure(); return { ok:true,value:service.snapshot() }; }
      if (endpoint === 'selection' || endpoint === 'select') {
        if(endpoint==='select' && args.selected===true) await service.ensure();
        const selected = endpoint === 'select' ? await selections.set(args.sessionId, args.selected) : await selections.get(args.sessionId);
        if (endpoint === 'select') status.delete(args.sessionId);
        return { ok:true,value:{ selected,autoRetrieveKnowledge,...(status.get(args.sessionId)||{}),...service.snapshot() } };
      }
      const libraryAction = ['catalog', 'documents', 'open', 'page'].find(name => endpoint === `library-${name}`);
      if (!libraryAction && !['snapshot', 'asset', 'refresh'].includes(endpoint)) throw new Error('未知知识展示操作');
      await service.ensure();
      if (endpoint === 'refresh') {
        await callTool('get_chunk_detail',{ snapshotId:args.snapshotId,citationId:args.citationId },signal);
      }
      const url = new URL(libraryAction ? `/library/${libraryAction}` : endpoint === 'asset' ? '/asset' : '/snapshot', base);
      if (libraryAction) {
        for (const key of ['libraryId', 'documentId', 'previewId', 'page']) {
          const value = args?.[key];
          if (typeof value === 'string' || typeof value === 'number') url.searchParams.set(key, String(value));
        }
      } else {
        url.searchParams.set('snapshotId', String(args.snapshotId || ''));
        if (endpoint === 'asset') url.searchParams.set('imageId', String(args.imageId || ''));
      }
      const response = await fetch(url, { headers: { Authorization: authorization }, signal: AbortSignal.any([signal, lifetime.signal, AbortSignal.timeout(libraryAction === 'open' ? 150000 : 65000)]), redirect: 'error' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: { code: error.code || 'TBEA_VIEW_FAILED', message: error.message || `知识服务 HTTP ${response.status}`, details: {} } };
      }
      if (endpoint === 'asset' || libraryAction === 'page') {
        const bytes = new Uint8Array(await response.arrayBuffer());
        return { ok: true, value: { mediaType: response.headers.get('content-type'), bytes } };
      }
      return { ok: true, value: await response.json() };
    } catch (error) { return { ok: false, error: { code: 'TBEA_VIEW_FAILED', message: error.message || '参考来源读取失败', details: {} } }; }
  }
}
