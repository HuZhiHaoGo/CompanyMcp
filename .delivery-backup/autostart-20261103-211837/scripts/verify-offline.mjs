import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..', 'offline/dsh-mcp-tbea-knowledge');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-offline-'));
const config = JSON.parse(await fs.readFile(path.join(root, 'config/example.json'), 'utf8'));
config.port = 17865; config.serviceToken = 'o'.repeat(64); config.dataDirectory = path.join(directory, 'data');
const filename = path.join(directory, 'config.json'); await fs.writeFile(filename, JSON.stringify(config));
const node = path.join(root, 'runtime/node.exe'); let output = '';
const child = spawn(node, [path.join(root, 'dist/server.mjs'), '--config', filename], { cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    ready = await fetch('http://127.0.0.1:17865/health').then(r => r.ok).catch(() => false);
    if (ready) break;
    if (child.exitCode !== null) throw new Error(output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Offline server did not start: ' + output);
  const doctor = spawn(node, [path.join(root, 'dist/doctor.mjs'), '--config', filename], { cwd: directory, windowsHide: true, stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => { doctor.on('error', reject); doctor.on('exit', resolve); });
  if (code !== 0) throw new Error('Bundled offline diagnostic failed');
  // 从独立临时目录加载已打包 Host，确认新增来源开关和预检索也不依赖 node_modules。
  const probe = path.join(directory, 'host-probe.mjs');
  await fs.writeFile(probe, `import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { apply } = await import(pathToFileURL(process.argv[2]).href);
let handle, preStep; const effects = [];
await apply({ on: (_event, fn) => { preStep = fn; }, tools: { register() {} }, connection: { rpc: { handle: (_channel, fn) => { handle = fn; } } }, effect: fn => effects.push(fn) }, { configFile: process.argv[3] });
try {
  const signal = new AbortController().signal;
  assert.equal((await handle('select', { sessionId: 'offline', selected: true }, signal, { principal: { kind: 'owner' } })).ok, true);
  const decision = await preStep({ agent: { id: 'offline' }, signal }, async () => ({ kind: 'enter', messages: [{ id: 'offline-question', role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '设计要求' }] }] }));
  assert.equal(decision.messages[1].source.view.count, 2);
  console.log('Bundled Host selection and real MCP prefetch OK.');
} finally { for (const effect of effects.reverse()) await effect(); }
`);
  const host = spawn(node, [probe, path.join(root, 'plugin/lib/index.js'), filename], { cwd: directory, windowsHide: true, stdio: 'inherit' });
  const hostCode = await new Promise((resolve, reject) => { host.on('error', reject); host.on('exit', resolve); });
  if (hostCode !== 0) throw new Error('Bundled offline Host failed');
  console.log('Offline runtime OK without source node_modules or npm.');
} finally {
  const stopped = new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
  child.kill(); await stopped;
  if (directory.startsWith(path.join(os.tmpdir(), 'tbea-offline-'))) await fs.rm(directory, { recursive: true, force: true });
}
