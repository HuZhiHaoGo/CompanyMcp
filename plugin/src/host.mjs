import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TOOLS, toolDescription } from '../../src/knowledge.ts';
import { readConfig } from '../../src/config.ts';
import { previewEnabled } from '../../src/contracts.ts';
import { pdfViewerAsset } from '../../src/pdf-preview.ts';
import { DESKTOP_CONFIG_TEMPLATE, DESKTOP_DEPLOYMENT_CONFIG, desktopConfigLocations } from '../../src/desktop-config.ts';
import { initializeDesktopConfig } from '../../src/desktop-initialization.ts';
import { SERVICE_VERSION } from '../../src/runtime.ts';
import { diagnosticId } from '../../src/diagnostics.ts';
import { SelectionStore, createPrefetch } from './selection.mjs';
import { ServiceManager } from './service-manager.mjs';
import { createSemanticModel } from './semantic-model.mjs';
import { createCatalogHint } from './catalog-hint.mjs';
import { displayPath } from './display-transport.mjs';

export const name = 'tbea-knowledge';
export const inject = ['tools', 'connection', 'agents'];

/** 只桥接本服务的两个只读工具；使用官方 MCP 客户端协议，不依赖通用桥接插件。 */
export async function apply(ctx, config = {}) {
  const explicitConfig = config.configFile !== undefined;
  if (explicitConfig && (typeof config.configFile !== 'string' || !path.isAbsolute(config.configFile))) {
    throw new Error('请在插件配置中设置 configFile 的绝对路径');
  }
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  const projectRoot = config.projectRoot || (explicitConfig ? path.resolve(path.dirname(config.configFile), '..') : packageRoot);
  if (typeof projectRoot !== 'string' || !path.isAbsolute(projectRoot)) throw new Error('projectRoot 必须为项目的绝对路径');
  const dshHome = process.env.DSH_HOME;
  const local = explicitConfig ? await readConfig(config.configFile, path.isAbsolute(dshHome ?? '') ? { defaultDiagnosticsDirectory: path.join(dshHome, 'logs') } : undefined).catch(error => {
    if (error.code === 'ENOENT') throw new Error(`知识库配置文件不存在，请先运行管理员初始化脚本：${config.configFile}`, { cause: error });
    throw error;
  }) : (await initializeDesktopConfig(desktopConfigLocations(process.env.DSH_HOME), [
    path.join(packageRoot, DESKTOP_DEPLOYMENT_CONFIG),
    path.join(packageRoot, DESKTOP_CONFIG_TEMPLATE),
  ])).config;
  const { autoRetrieveKnowledge } = local;
  if (typeof local.serviceToken !== 'string' || local.serviceToken.length < 32 || !Number.isInteger(local.port)) throw new Error('知识服务配置未初始化');
  const base = `http://127.0.0.1:${local.port}`;
  const authorization = `Bearer ${local.serviceToken}`;
  const lifetime = new AbortController(); let connection; let connecting;
  // 新安装的资源来自实际插件包，旧安装仍可通过 projectRoot 指向外层资源。
  const pdfAssetsDirectory = path.join(packageRoot, 'lib/pdfjs');
  const service=new ServiceManager(local,{
    demoDirectory:path.join(projectRoot,'dist/demo'), pdfAssetsDirectory,
    getOffice: () => {
      const provider = ctx.get?.('officeToPdf');
      return typeof provider?.convert === 'function' ? provider : undefined;
    },
  });
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
  async function callTool(name, args, requestSignal, manuallySelected = false, agent, selection, messageId) {
    const signal = AbortSignal.any([requestSignal, lifetime.signal, AbortSignal.timeout(120000)]); signal.throwIfAborted();
    // 连接建立可被当前问题取消，但不关闭其他会话共享的 MCP 客户端。
    const transport = await new Promise((resolve, reject) => {
      const aborted = () => reject(signal.reason); signal.addEventListener('abort', aborted, { once: true });
      client().then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted));
    }); let result;
    signal.throwIfAborted();
    const semantic = name === 'search_knowledge' && agent && local.mode === 'live' && local.retrieval?.semanticReview !== false
      ? createSemanticModel(ctx, agent, selection, local.retrieval?.semanticModelOrigins) : undefined;
    const sessionId = name === 'search_knowledge' && diagnosticId(agent?.id);
    const sourceMessageId = name === 'search_knowledge' && diagnosticId(messageId);
    try {
      result = await service.withSemanticModel(semantic, semanticId => {
        const meta = { ...(manuallySelected ? { 'tbea/trigger': 'manual' } : {}),
          ...(semanticId ? { 'tbea/semantic-request': semanticId } : {}),
          ...(sessionId ? { 'tbea/session-id': sessionId } : {}),
          ...(sourceMessageId ? { 'tbea/message-id': sourceMessageId } : {}) };
        const params = { name, arguments: args, ...(Object.keys(meta).length ? { _meta: meta } : {}) };
        return requestScope.run(signal, () => transport.callTool(params, undefined, { signal, timeout: 120000 }));
      });
    }
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
        execute: (args, execution) => callTool(tool.name, args, execution.signal, false, execution.agent),
      });
    }
  }

  // Connection 对精确 Fetch 路由执行 Owner 鉴权，并跟随插件卸载撤销注册。
  const viewerEnabled = previewEnabled(local.documentPreview) || (local.mode === 'mock' && local.documentPreview === undefined);
  ctx.connection.fetch.register({
    path: displayPath,
    methods: viewerEnabled ? ['POST', 'GET'] : ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      if (request.method === 'GET') {
        if (!viewerEnabled) return new Response(null, { status: 404 });
        return pdfViewerAsset(pdfAssetsDirectory, new URL(request.url).searchParams.get('asset'));
      }
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
      const libraryAction = ['catalog', 'documents', 'open', 'preview-progress', 'preview-result', 'pdf-range', 'sheet-range'].find(name => endpoint === `library-${name}`);
      if (!libraryAction && !['snapshot', 'asset', 'refresh'].includes(endpoint)) throw new Error('未知知识展示操作');
      await service.ensure();
      if (endpoint === 'refresh') {
        await callTool('get_chunk_detail',{ snapshotId:args.snapshotId,citationId:args.citationId },signal);
      }
      const url = new URL(libraryAction ? `/library/${libraryAction}` : endpoint === 'asset' ? '/asset' : '/snapshot', base);
      if (libraryAction) {
        for (const key of ['libraryId', 'documentId', 'previewId', 'status', 'elapsedMs', 'parseMs', 'pdfAssetMs', 'pdfLoadMs', 'pdfRenderMs', 'begin', 'end']) {
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
      if (endpoint === 'asset' || libraryAction === 'pdf-range' || libraryAction === 'sheet-range') {
        const bytes = new Uint8Array(await response.arrayBuffer());
        return { ok: true, value: { mediaType: response.headers.get('content-type'), bytes } };
      }
      return { ok: true, value: await response.json() };
    } catch (error) { return { ok: false, error: { code: 'TBEA_VIEW_FAILED', message: error.message || '参考来源读取失败', details: {} } }; }
  }
}
