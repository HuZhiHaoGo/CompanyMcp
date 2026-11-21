import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const root = path.resolve(import.meta.dirname, '..', 'offline/dsh-mcp-tbea-knowledge');
for (const executable of ['pdfinfo.exe', 'pdftoppm.exe']) {
  const { stderr } = await promisify(execFile)(path.join(root, 'tools', 'poppler', 'Library', 'bin', executable), ['-v'], { windowsHide: true, timeout: 10000 });
  console.log(stderr.split(/\r?\n/, 1)[0]);
}
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
  // 先结束手动服务，再由打包后的 Host 自动启动，不能让手动进程掩盖自动启动缺陷。
  const manualStopped = new Promise(resolve => child.once('exit', resolve));
  const stop = spawn(node, [path.join(root, 'dist/service-control.mjs'), 'stop-manual', filename],
    { cwd: directory, windowsHide: true, stdio: 'inherit' });
  const stopCode = await new Promise((resolve, reject) => { stop.on('error', reject); stop.on('exit', resolve); });
  if (stopCode !== 0) throw new Error('Bundled shutdown command failed');
  await Promise.race([manualStopped, new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error('Standalone service did not exit after shutdown')), 5000);
    timer.unref();
  })]);
  const probe = path.join(directory, 'host-probe.mjs');
  await fs.writeFile(probe, `import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { apply } = await import(pathToFileURL(process.argv[2]).href);
let route, preStep; const effects = [];
await apply({ on: (_event, fn) => { preStep = fn; }, tools: { register() {} }, connection: { fetch: { register: value => { route = value; } } }, effect: fn => effects.push(fn()) }, { configFile: process.argv[3] });
try {
  const signal = new AbortController().signal;
  const fetchDisplay = (endpoint, args) => route.fetch(new Request('http://localhost' + route.path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, args }), signal,
  }));
  const request = async (endpoint, args) => (await fetchDisplay(endpoint, args)).json();
  assert.equal((await request('select', { sessionId: 'offline', selected: true })).ok, true);
  const decision = await preStep({ agent: { id: 'offline' }, signal }, async () => ({ kind: 'enter', messages: [{ id: 'offline-question', role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '设计要求' }] }] }));
  assert.equal(decision.messages[1].source.view.count, 2);
  const catalog = await request('library-catalog', {});
  const libraryId = catalog.value.libraries[0].id;
  const list = await request('library-documents', { libraryId });
  assert.equal(list.value.documents.length, 17);
  const preview = await request('library-open', { libraryId, documentId: 'sample-pdf' });
  const page = await fetchDisplay('library-page', { previewId: preview.value.previewId, page: 2 });
  assert.equal(page.headers.get('content-type'), 'image/png');
  assert.equal(new Uint8Array(await page.arrayBuffer())[0], 137);
  console.log('Bundled Host auto-start, selection, MCP prefetch and library preview OK.');
} finally { for (const effect of effects.reverse()) await effect(); }
`);
  const host = spawn(node, [probe, path.join(root, 'plugin/lib/index.js'), filename], { cwd: directory, windowsHide: true, stdio: 'inherit' });
  const hostCode = await new Promise((resolve, reject) => { host.on('error', reject); host.on('exit', resolve); });
  if (hostCode !== 0) throw new Error('Bundled offline Host failed');
  if(await fetch('http://127.0.0.1:17865/health',{ signal:AbortSignal.timeout(500) }).then(()=>true,()=>false)) throw new Error('Host exit left its MCP service running');
  console.log('Offline runtime OK without source node_modules or npm.');
} finally {
  const stopped = new Promise(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else child.once('exit', resolve); });
  if(child.exitCode===null && child.signalCode===null) child.kill();
  await stopped;
  if (directory.startsWith(path.join(os.tmpdir(), 'tbea-offline-'))) await fs.rm(directory, { recursive: true, force: true });
}
