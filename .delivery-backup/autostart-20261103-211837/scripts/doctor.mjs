import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig } from '../src/config.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function diagnose(filename) {
  const config = await readConfig(filename); const base = `http://127.0.0.1:${config.port}`;
  console.log(`Node: ${process.version}; mode: ${config.mode}; service: ${base}`);
  const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error(`Health check HTTP ${health.status}`);
  const client = new Client({ name: 'tbea-doctor', version: '0.1.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', base), { requestInit: { headers: { Authorization: `Bearer ${config.serviceToken}` } } }));
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
