import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';

const archive = path.resolve(import.meta.dirname, '..', 'offline/dsh-mcp-tbea-knowledge-win-x64.zip');
const tar = path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe');
const run = promisify(execFile);
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-offline-'));
let child;
try {
  await run(tar, ['-xf', archive, '-C', directory], { windowsHide: true });
  const root = path.join(directory, 'dsh-mcp-tbea-knowledge');
  await assert.rejects(fs.stat(path.join(root, 'tools', 'poppler')), { code: 'ENOENT' });
  for (const executable of ['pdfinfo.exe', 'pdftoppm.exe']) {
    const { stderr } = await run(path.join(root, 'plugin', 'tools', 'poppler', 'Library', 'bin', executable), ['-v'], { windowsHide: true, timeout: 10000 });
    console.log(stderr.split(/\r?\n/, 1)[0]);
  }
  const config = JSON.parse(await fs.readFile(path.join(root, 'config/example.json'), 'utf8'));
  config.port = 17865; config.serviceToken = 'o'.repeat(64); config.dataDirectory = path.join(directory, 'data');
  config.documentPreview.enabled = true;
  const filename = path.join(root, 'config', 'smoke-config.json');
  await fs.writeFile(filename, JSON.stringify(config));
  const node = path.join(root, 'runtime/node.exe'); let output = '';
  child = spawn(node, [path.join(root, 'dist/server.mjs'), '--config', filename], { cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
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
  const harnessHome = path.join(directory, 'Harness with spaces');
  const packageName = 'dsh-plugin-tbea-knowledge';
  const installed = path.join(harnessHome, 'profiles/.generations/live/fixture/node_modules', packageName);
  await fs.cp(path.join(root, 'plugin'), installed, { recursive: true });
  const entry = path.join(harnessHome, 'profiles/desktop/node_modules', packageName);
  await fs.mkdir(path.dirname(entry), { recursive: true });
  await fs.symlink(installed, entry, 'junction');
  assert.doesNotMatch(await fs.readFile(path.join(installed, 'cordis.patch.yml'), 'utf8'), /configFile|projectRoot/);
  const desktopSource = path.join(directory, 'desktop-source.json');
  await fs.writeFile(desktopSource, JSON.stringify({ ...config, dataDirectory: '../data', documentPreview: { ...config.documentPreview, enabled: true } }));
  await run(node, [path.join(root, 'scripts/init.mjs'), '--desktop', '--harness-home', harnessHome, '--config-source', desktopSource], { cwd: directory, windowsHide: true });
  const desktopConfig = JSON.parse(await fs.readFile(path.join(harnessHome, 'dsh-mcp-tbea-knowledge.json'), 'utf8'));
  assert.equal(desktopConfig.dataDirectory, undefined);
  assert.equal(desktopConfig.documentPreview.pdfInfo, undefined);
  const probe = path.join(directory, 'host-probe.mjs');
  await fs.writeFile(probe, `import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const { apply } = await import(pathToFileURL(process.argv[2]).href);
let route, preStep; const effects = [];
await apply({ on: (_event, fn) => { preStep = fn; }, tools: { register() {} }, connection: { fetch: { register: value => { route = value; } } }, effect: fn => effects.push(fn()) });
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
  const demo = await fetch('http://127.0.0.1:17865/demo');
  assert.equal(demo.status, 200);
  const { stdout } = await promisify(execFile)(process.execPath, [process.argv[3], '--desktop'], { windowsHide: true });
  assert.ok(stdout.includes('Runtime identity OK'));
  assert.ok(stdout.includes('MCP handshake OK'));
  assert.ok(stdout.includes('profiles\\\\.generations\\\\live'));
  console.log('Installed Host, bundled demo, MCP, library preview and Desktop diagnostics OK.');
} finally { for (const effect of effects.reverse()) await effect(); }
`);
  const host = spawn(node, [probe, path.join(entry, 'lib/index.js'), path.join(root, 'dist/doctor.mjs')], { cwd: directory, env: { ...process.env, DSH_HOME: harnessHome }, windowsHide: true, stdio: 'inherit' });
  const hostCode = await new Promise((resolve, reject) => { host.on('error', reject); host.on('exit', resolve); });
  if (hostCode !== 0) throw new Error('Bundled offline Host failed');
  if(await fetch('http://127.0.0.1:17865/health',{ signal:AbortSignal.timeout(500) }).then(()=>true,()=>false)) throw new Error('Host exit left its MCP service running');
  console.log('Offline runtime OK without source node_modules or npm.');
} finally {
  if (child) {
    const stopped = new Promise(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else child.once('close', resolve); });
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await stopped;
  }
  if (directory.startsWith(path.join(os.tmpdir(), 'tbea-offline-'))) await fs.rm(directory, { recursive: true, force: true });
}
