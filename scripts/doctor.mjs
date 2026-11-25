import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readConfig } from '../src/config.ts';
import { commandHarnessHome, desktopConfigLocations } from '../src/desktop-config.ts';
import { previewEnabled } from '../src/contracts.ts';
import { diagnosticFilename } from '../src/diagnostics.ts';
import { configIdentity,SERVICE_VERSION,RUNTIME_PROTOCOL } from '../src/runtime.ts';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function checkDesktopPlugin(harnessHome) {
  const name = 'dsh-plugin-tbea-knowledge';
  const entry = path.join(harnessHome, 'profiles/desktop/node_modules', name);
  const restart = '请从匠宝托盘完全退出后重开。';
  const reinstall = `如果问题持续，请在「插件管理」里重新安装 ${SERVICE_VERSION}。`;
  const packageRoot = await fs.realpath(entry).catch(async error => {
    if (error.code !== 'ENOENT') throw error;
    const target = await fs.readlink(entry).catch(() => undefined);
    const problem = target ? `匠宝 desktop 插件入口仍指向缺失的安装目录 ${target}。`
      : `未找到匠宝 desktop 插件入口 ${entry}。`;
    throw new Error(`${problem}${restart}${reinstall}`, { cause: error });
  });
  const manifestPath = path.join(packageRoot, 'package.json');
  const text = await fs.readFile(manifestPath, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    throw new Error(`匠宝 desktop 插件缺少清单文件 ${manifestPath}。${restart}${reinstall}`, { cause: error });
  });
  const manifest = JSON.parse(text);
  if (manifest?.name !== name) throw new Error(`匠宝 desktop 插件清单中的包名不匹配（${manifestPath}）。${reinstall}`);
  console.log(`Desktop plugin: ${manifest.version}; ${packageRoot}`);
  if (manifest.version !== SERVICE_VERSION) {
    throw new Error(`匠宝 desktop 当前安装目录的版本为 ${manifest.version ?? '未知'}，本离线包版本为 ${SERVICE_VERSION}。${restart}${reinstall}`);
  }
}

export async function diagnose(filename, options) {
  console.log(`Configuration: ${path.resolve(filename)}`);
  const config = await readConfig(filename, options); const base = `http://127.0.0.1:${config.port}`;
  if (previewEnabled(config.documentPreview)) {
    console.log('PDF.js: enabled');
    console.log(`External Office converter: ${config.documentPreview?.office ?? 'not configured'}`);
  }
  console.log(`Knowledge diagnostics: ${diagnosticFilename(config)}`);
  console.log(`Node: ${process.version}; mode: ${config.mode}; service: ${base}`);
  console.log(`DSH knowledge retrieval: ${config.autoRetrieveKnowledge ? 'on-demand' : 'manual-only'}`);
  const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error(`Health check HTTP ${health.status}`);
  const metadata=await health.json();
  if (metadata.name !== 'tbea-knowledge') throw new Error(`端口 ${config.port} 当前由其他服务使用。请停止该服务，或检查知识库配置中的端口。`);
  if (metadata.version !== SERVICE_VERSION) {
    throw new Error(`端口 ${config.port} 的知识服务版本为 ${metadata.version ?? '未知'}，本离线包版本为 ${SERVICE_VERSION}。请停止旧服务并从匠宝托盘完全退出后重开。`);
  }
  const runtime=await fetch(base+'/runtime',{ headers:{ Authorization:`Bearer ${config.serviceToken}` },signal:AbortSignal.timeout(5000) });
  if(!runtime.ok) throw new Error(`Runtime authentication HTTP ${runtime.status}`);
  const identity=await runtime.json();
  if(identity.schema!==RUNTIME_PROTOCOL || identity.configIdentity!==configIdentity(config)) throw new Error('Running service configuration does not match local.json.');
  console.log(`Runtime identity OK; version: ${SERVICE_VERSION}`);
  const client = new Client({ name:'tbea-doctor',version:SERVICE_VERSION });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('/mcp',base),{ requestInit:{ headers:{ Authorization:`Bearer ${config.serviceToken}` } },fetch:(url,init)=>fetch(url,{ ...init,signal:AbortSignal.any([init?.signal,AbortSignal.timeout(10000)].filter(Boolean)) }) }),{ signal:AbortSignal.timeout(10000),timeout:10000 });
    const { tools } = await client.listTools();
    console.log(`MCP handshake OK; tools: ${tools.map(t => t.name).join(', ')}`);
    if (tools.length !== 2) throw new Error('Unexpected tool list');
    if (config.mode === 'mock') {
      const result = await client.callTool({ name: 'search_knowledge', arguments: { query: '演示设计要求' } });
      if (result.isError) throw new Error('Mock search failed');
      console.log('Mock search OK. No private content or credentials were printed.');
    } else console.log('Live search was not sent. Test with a real question in DSH after installing the plugin.');
  } finally { await client.close(); }
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      config: { type: 'string' }, desktop: { type: 'boolean' }, 'harness-home': { type: 'string' },
    } });
    if (values.desktop) {
      if (values.config) throw new Error('--desktop 使用 Harness 根目录配置，不能同时传入 --config');
      const harnessHome = commandHarnessHome(values['harness-home']);
      if (!harnessHome || !path.isAbsolute(harnessHome)) throw new Error('请提供 Harness 的绝对路径');
      await checkDesktopPlugin(harnessHome);
      const { filename, options } = desktopConfigLocations(harnessHome);
      await diagnose(filename, options);
    } else {
      if (values['harness-home']) throw new Error('--harness-home 需要 --desktop');
      const filename = values.config ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../config/local.json');
      await diagnose(filename);
    }
  } catch (error) {
    console.error(`Diagnostic failed: ${error.message}`);
    process.exitCode = 1;
  }
}
