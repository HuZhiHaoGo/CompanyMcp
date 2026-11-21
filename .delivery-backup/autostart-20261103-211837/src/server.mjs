import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readConfig } from './config.mjs';
import { KnowledgeService, TOOLS } from './knowledge.mjs';
import { PlatformError } from './platform.mjs';

export function errorBody(error) {
  if (error instanceof PlatformError) return { code: error.code, message: error.message };
  if (['AbortError', 'TimeoutError'].includes(error?.name)) return { code: 'REQUEST_ABORTED', message: '请求已停止或超时，请检查网络后重试' };
  return { code: 'REQUEST_FAILED', message: '知识服务请求失败，请检查配置、平台连通性及诊断记录' };
}
function authorized(request, token) {
  const received = Buffer.from(request.headers.authorization || ''); const expected = Buffer.from(`Bearer ${token}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
async function readJson(req) {
  let size = 0; const chunks = [];
  for await (const data of req) { size += data.length; if (size > 65536) throw new PlatformError('BODY_TOO_LARGE', '请求体过大'); chunks.push(data); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new PlatformError('INVALID_REQUEST', '请求不是有效 JSON'); }
}
function send(res, status, value, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
}

export async function createKnowledgeServer(config, options = {}) {
  const service = new KnowledgeService(config); await service.init();
  const activeMcp = new Set();
  const server = http.createServer(async (req, res) => {
    const base = `http://127.0.0.1:${config.port}`;
    const hostname = (req.headers.host || '').split(':')[0];
    if (!['127.0.0.1', 'localhost'].includes(hostname) || (req.headers.origin && ![`http://127.0.0.1:${config.port}`, `http://localhost:${config.port}`].includes(req.headers.origin))) return send(res, 403, { error: '请求来源不允许' });
    const url = new URL(req.url, base);
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      if (url.pathname === '/health' && req.method === 'GET') return send(res, 200, { ok: true, mode: config.mode, version: '0.1.0', protocol: 'tbea-knowledge/v1' });
      // 演示入口仅在 mock 模式开放，不读取任何正式知识或密钥。
      if (config.mode === 'mock' && url.pathname.startsWith('/demo')) {
        if (req.method !== 'GET') return send(res, 405, { error: '不支持该方法' });
        if (url.pathname === '/demo/result') {
          const result = await service.search({ query: '演示产品设计资料查询' }, controller.signal);
          return send(res, 200, await service.snapshot(result.view.snapshotId));
        }
        if (url.pathname === '/demo/asset') { const image = await service.image(url.searchParams.get('snapshotId'), url.searchParams.get('imageId'), controller.signal); return send(res, 200, image.bytes, image.type); }
        const name = { '/demo': 'index.html', '/demo/': 'index.html', '/demo/demo.js': 'demo.js', '/demo/demo.css': 'demo.css' }[url.pathname];
        if (!name) return send(res, 404, { error: '未找到资源' });
        const root = options.demoDirectory || path.join(path.dirname(fileURLToPath(import.meta.url)), 'demo');
        const bytes = await fs.readFile(path.join(root, name));
        return send(res, 200, bytes, name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css' : 'text/javascript');
      }
      if (!authorized(req, config.serviceToken)) return send(res, 401, { error: '服务口令无效' });
      if (url.pathname === '/mcp') {
        if (req.method !== 'POST') return send(res, 405, { error: '无状态 MCP 端点仅支持 POST' });
        const mcp = new Server({ name: 'tbea-knowledge', version: '0.1.0' }, { capabilities: { tools: {} }, instructions: '查询公司标准或内部设计要求前先检索。资料不足应澄清或说明；引用返回的 citationId。图片由展示插件处理，不分析图片。工具只读，不执行外部业务操作。' });
        mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS.map(tool => ({ ...tool, description: tool.description + (tool.name === 'search_knowledge' ? ` 可用知识库：${config.knowledgeBases.map(k => `${k.name} (${k.id})`).join('；')}` : ''), annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } })) }));
        mcp.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
          try {
            const result = await service.call(request.params.name, request.params.arguments || {}, AbortSignal.any([extra.signal, controller.signal]));
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
      if (url.pathname === '/snapshot') return send(res, 200, await service.snapshot(url.searchParams.get('snapshotId')));
      if (url.pathname === '/asset') {
        const image = await service.image(url.searchParams.get('snapshotId'), url.searchParams.get('imageId'), controller.signal);
        return send(res, 200, image.bytes, image.type);
      }
      return send(res, 404, { error: '未找到接口' });
    } catch (error) {
      if (!res.headersSent) send(res, error.code?.includes('NOT_FOUND') ? 404 : error instanceof PlatformError ? 400 : 500, errorBody(error));
    }
  });
  return { service, server,
    async listen() { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, '127.0.0.1', resolve); }); return server.address(); },
    async close() { await Promise.allSettled([...activeMcp].map(mcp => mcp.close())); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}

export async function main() {
  const position = process.argv.indexOf('--config');
  const config = await readConfig(position >= 0 ? process.argv[position + 1] : 'config/local.json');
  const app = await createKnowledgeServer(config); await app.listen();
  console.log(`知识服务已启动：${config.mode}，http://127.0.0.1:${config.port}/health`);
  if (config.mode === 'mock') console.log(`演示页面：http://127.0.0.1:${config.port}/demo`);
  for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => { void app.close().then(() => process.exit(0)); });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof Error ? error.message : '启动失败'); process.exitCode = 1; });
