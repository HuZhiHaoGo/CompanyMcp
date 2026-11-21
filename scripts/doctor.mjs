import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig } from '../src/config.ts';
import { configIdentity,SERVICE_VERSION,RUNTIME_PROTOCOL } from '../src/runtime.ts';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function diagnose(filename) {
  const config = await readConfig(filename); const base = `http://127.0.0.1:${config.port}`;
  console.log(`Node: ${process.version}; mode: ${config.mode}; service: ${base}`);
  console.log(`DSH knowledge retrieval: ${config.autoRetrieveKnowledge ? 'on-demand' : 'manual-only'}`);
  const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error(`Health check HTTP ${health.status}`);
  const metadata=await health.json();
  if(metadata.name!=='tbea-knowledge' || metadata.version!==SERVICE_VERSION) throw new Error('Wrong service or old version on configured port. Stop the old service and restart DSH.');
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
  const at = process.argv.indexOf('--config');
  diagnose(at >= 0 ? process.argv[at + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../config/local.json')).catch(error => { console.error(`Diagnostic failed: ${error.message}`); process.exitCode = 1; });
}
