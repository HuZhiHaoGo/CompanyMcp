import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readConfig } from './config.ts';
import { KnowledgeService, TOOLS, toolDescription } from './knowledge.ts';
import { LibraryBrowser } from './library-browser.ts';
import { PlatformError } from './platform.ts';
import { configIdentity,SERVICE_VERSION,RUNTIME_PROTOCOL } from './runtime.ts';
import { hasCode, isRecord } from './contracts.ts';
import type { Fetcher, ServiceConfig } from './contracts.ts';
import type { SemanticModel } from './semantic.ts';

interface ServerOptions {
  managed?: boolean;
  demoDirectory?: string;
  onPause?: () => void;
  fetcher?: Fetcher;
  takeSemanticModel?: (requestId: string) => SemanticModel | undefined;
}

export function errorBody(error: unknown) {
  if (error instanceof PlatformError) return { code: error.code, message: error.message };
  if (isRecord(error) && (error.name === 'AbortError' || error.name === 'TimeoutError')) return { code: 'REQUEST_ABORTED', message: '请求已停止或超时，请检查网络后重试' };
  return { code: 'REQUEST_FAILED', message: '知识服务请求失败，请检查配置、平台连通性及诊断记录' };
}
function authorized(request: IncomingMessage, token: string) {
  const received = Buffer.from(request.headers.authorization || ''); const expected = Buffer.from(`Bearer ${token}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const data of req) {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    size += bytes.length;
    if (size > 65536) throw new PlatformError('BODY_TOO_LARGE', '请求体过大');
    chunks.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new PlatformError('INVALID_REQUEST', '请求不是有效 JSON'); }
}
function send(res: ServerResponse, status: number, value: unknown, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
}

export async function createKnowledgeServer(config: ServiceConfig, options: ServerOptions = {}) {
  const service = new KnowledgeService(config, { fetcher: options.fetcher }); await service.init();
  const library = new LibraryBrowser(config, service, options.fetcher);
  const identity=configIdentity(config); const shutdown=new AbortController(); let closing: Promise<void> | undefined;
  const activeMcp = new Set<Server>();
  const owner = options.managed ? 'dsh' : 'manual';
  const server = http.createServer(async (req, res) => {
    const base = `http://127.0.0.1:${config.port}`;
    const hostname = (req.headers.host || '').split(':')[0];
    if (!['127.0.0.1', 'localhost'].includes(hostname) || (req.headers.origin && ![`http://127.0.0.1:${config.port}`, `http://localhost:${config.port}`].includes(req.headers.origin))) return send(res, 403, { error: '请求来源不允许' });
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      const url = new URL(req.url ?? '/', base);
      if (url.pathname === '/health' && req.method === 'GET') return send(res,200,{ ok:true,name:'tbea-knowledge',mode:config.mode,version:SERVICE_VERSION,protocol:'tbea-knowledge/v1' });
      // 演示入口仅在 mock 模式开放，不读取任何正式知识或密钥。
      if (config.mode === 'mock' && url.pathname.startsWith('/demo')) {
        if (req.method !== 'GET') return send(res, 405, { error: '不支持该方法' });
        if (url.pathname === '/demo/result') {
          const result = await service.search({ query: '演示产品设计资料查询' }, controller.signal);
          return send(res, 200, await service.snapshot(result.view.snapshotId));
        }
        if (url.pathname === '/demo/asset') { const image = await service.image(url.searchParams.get('snapshotId'), url.searchParams.get('imageId'), controller.signal); return send(res, 200, image.bytes, image.type); }
        if (url.pathname.startsWith('/demo/library/')) { await libraryResponse(url, '/demo/library', controller.signal, res); return; }
        const files: Record<string, string> = { '/demo': 'index.html', '/demo/': 'index.html', '/demo/demo.js': 'demo.js', '/demo/demo.css': 'demo.css' };
        const name = files[url.pathname];
        if (!name) return send(res, 404, { error: '未找到资源' });
        const root = options.demoDirectory || path.join(path.dirname(fileURLToPath(import.meta.url)), 'demo');
        const bytes = await fs.readFile(path.join(root, name));
        return send(res, 200, bytes, name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css' : 'text/javascript');
      }
      if (!authorized(req, config.serviceToken)) return send(res, 401, { error: '服务口令无效' });
      if(url.pathname==='/runtime' && req.method==='GET') return send(res,200,{ schema:RUNTIME_PROTOCOL,version:SERVICE_VERSION,configIdentity:identity,owner,pid:process.pid });
      if (url.pathname === '/shutdown' && req.method === 'POST') {
        const request = await readJson(req);
        if (!isRecord(request) || request.configIdentity !== identity || request.owner !== owner) return send(res,409,{ error:'知识服务配置或运行方式不匹配' });
        if (options.managed && !options.onPause) return send(res,409,{ error:'当前宿主未启用临时关停' });
        options.onPause?.();
        res.once('finish', () => { void close().catch(() => console.error('知识服务关闭失败，请完全退出拥有该服务的程序')); });
        return send(res,202,{ ok:true });
      }
      if (url.pathname === '/mcp') {
        if (req.method !== 'POST') return send(res, 405, { error: '无状态 MCP 端点仅支持 POST' });
        const mcp = new Server({ name: 'tbea-knowledge', version:SERVICE_VERSION }, { capabilities: { tools: {} }, instructions: '查询公司标准或内部设计要求前先检索。资料不足应澄清或说明；引用返回的 citationId。图片由展示插件处理，不分析图片。工具只读，不执行外部业务操作。' });
        mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS.map(tool => ({ ...tool, description: toolDescription(tool, config), annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } })) }));
        mcp.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
          try {
            const manuallySelected = request.params._meta?.['tbea/trigger'] === 'manual';
            const requestId = request.params._meta?.['tbea/semantic-request'];
            const model = request.params.name === 'search_knowledge' && typeof requestId === 'string'
              ? options.takeSemanticModel?.(requestId) : undefined;
            const result = await service.call(request.params.name, request.params.arguments || {}, AbortSignal.any([extra.signal,controller.signal,shutdown.signal]), manuallySelected, model);
            return { content: [{ type: 'text', text: JSON.stringify(result.model) }], structuredContent: { schema: 'tbea-mcp-result/v1', ...result } };
          } catch (error) { return { isError: true, content: [{ type: 'text', text: JSON.stringify(errorBody(error)) }] }; }
        });
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        activeMcp.add(mcp);
        res.on('close', () => { activeMcp.delete(mcp); void mcp.close(); });
        await mcp.connect(transport);
        await transport.handleRequest(req, res, await readJson(req)); return;
      }
      if (req.method !== 'GET') return send(res, 405, { error: '不支持该方法' });
      if (url.pathname.startsWith('/library/')) { await libraryResponse(url, '/library', controller.signal, res); return; }
      if (url.pathname === '/catalog-summary') return send(res, 200, await service.catalogSummary(AbortSignal.any([controller.signal, shutdown.signal])));
      if (url.pathname === '/snapshot') return send(res, 200, await service.snapshot(url.searchParams.get('snapshotId'), AbortSignal.any([controller.signal, shutdown.signal])));
      if (url.pathname === '/asset') {
        const image = await service.image(url.searchParams.get('snapshotId'), url.searchParams.get('imageId'), controller.signal);
        return send(res, 200, image.bytes, image.type);
      }
      return send(res, 404, { error: '未找到接口' });
    } catch (error) {
      if (!res.headersSent && !res.destroyed) send(res, isRecord(error) && typeof error.code === 'string' && error.code.includes('NOT_FOUND') ? 404 : error instanceof PlatformError ? 400 : 500, errorBody(error));
    }
  });
  async function libraryResponse(url: URL, prefix: string, signal: AbortSignal, res: ServerResponse) {
    const args = url.searchParams;
    switch (url.pathname.slice(prefix.length)) {
      case '/catalog': return send(res, 200, await library.catalog(signal));
      case '/documents': return send(res, 200, await library.documents(args.get('libraryId'), signal));
      case '/open': return send(res, 200, await library.open(args.get('libraryId'), args.get('documentId'), signal));
      case '/page': return send(res, 200, await library.page(args.get('previewId'), args.get('page'), signal), 'image/png');
      default: return send(res, 404, { error: '未找到接口' });
    }
  }
  function close() {
    // 启动失败、显式关停和宿主退出共用一次清理。
    if(!closing) closing=(async()=>{
      shutdown.abort(); await Promise.allSettled([...activeMcp].map(mcp=>mcp.close()));
      await library.close();
      if(server.listening) await new Promise<void>((resolve,reject)=>{
        server.close(error=>error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    })();
    return closing;
  }
  return { service, server, close,
    async listen() {
      await new Promise<void>((resolve,reject)=>{
        const failed=(error: Error)=>{ server.off('listening',ready); reject(error); };
        const ready=()=>{ server.off('error',failed); resolve(); };
        server.once('error',failed); server.once('listening',ready); server.listen(config.port,'127.0.0.1');
      }); return server.address();
    },
  };
}

export async function main() {
  const position = process.argv.indexOf('--config');
  const config = await readConfig(position >= 0 ? process.argv[position + 1] : 'config/local.json');
  const app=await createKnowledgeServer(config);
  try { await app.listen(); }
  catch(error) {
    await app.close();
    if(hasCode(error, 'EADDRINUSE')) throw new Error('知识服务端口已占用；若 DSH 已自动启动服务，无需再次运行本脚本');
    throw error;
  }
  console.log(`知识服务已启动：${config.mode}，http://127.0.0.1:${config.port}/health`);
  if (config.mode === 'mock') console.log(`演示页面：http://127.0.0.1:${config.port}/demo`);
  for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => { void app.close().then(() => process.exit(0)); });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof Error ? error.message : '启动失败'); process.exitCode = 1; });
