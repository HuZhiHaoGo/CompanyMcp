import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { SERVICE_VERSION } from '../src/runtime.ts';
import { DESKTOP_CONFIG_TEMPLATE, DESKTOP_DEPLOYMENT_CONFIG } from '../src/desktop-config.ts';

const archive = path.resolve(import.meta.dirname, '..', 'offline', SERVICE_VERSION, 'dsh-mcp-tbea-knowledge-win-x64.zip');
const tar = path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe');
const run = promisify(execFile);
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-offline-'));
let child;
try {
  await run(tar, ['-xf', archive, '-C', directory], { windowsHide: true });
  const root = path.join(directory, 'dsh-mcp-tbea-knowledge');
  const entries = await fs.readdir(root, { recursive: true });
  assert.ok(entries.every(entry => !/(?:^|[\\/])(?:libreoffice(?:\.md)?|poppler|soffice\.(?:bin|exe|com)|pdfinfo\.exe|pdftoppm\.exe|desktop-deployment\.json.*|local\.json)$/i.test(entry)));
  const sizes = await Promise.all(entries.map(entry => fs.stat(path.join(root, entry))));
  console.log('ZIP bytes:', (await fs.stat(archive)).size, 'Extracted bytes:', sizes.filter(entry => entry.isFile()).reduce((sum, entry) => sum + entry.size, 0));
  const config = JSON.parse(await fs.readFile(path.join(root, 'config/example.json'), 'utf8'));
  assert.equal(config.mode, 'mock');
  for (const key of ['accessKey', 'secretKey', 'projectId', 'assetApiKey']) assert.equal(config.platform[key], '');
  assert.equal(config.serviceToken, '');
  config.port = 17865; config.serviceToken = 'o'.repeat(64); config.dataDirectory = path.join(directory, 'data');
  config.documentPreview.enabled = true;
  config.documentPreview.allowPdfViewer = true;
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
  const deploymentFile = path.join(root, 'plugin', DESKTOP_DEPLOYMENT_CONFIG);
  await assert.rejects(fs.stat(deploymentFile), { code: 'ENOENT' });
  const pluginTemplate = path.join(root, 'plugin', DESKTOP_CONFIG_TEMPLATE);
  const template = JSON.parse(await fs.readFile(pluginTemplate, 'utf8'));
  assert.deepEqual(template, JSON.parse(await fs.readFile(path.join(root, DESKTOP_CONFIG_TEMPLATE), 'utf8')));
  assert.equal(template.documentPreview.enabled, true);
  assert.equal(template.documentPreview.allowPdfViewer, true);
  assert.equal(template.retrieval.diagnostics, true);
  assert.equal(template.retrieval.diagnosticExcerpts, true);
  template.port = config.port;
  template.platform.projectId = 'offline-template-test';
  await fs.writeFile(pluginTemplate, JSON.stringify(template));
  const desktopFilename = path.join(harnessHome, 'dsh-mcp-tbea-knowledge.json');
  await assert.rejects(fs.stat(desktopFilename), { code: 'ENOENT' });

  const { version } = JSON.parse(await fs.readFile(path.join(root, 'plugin/package.json'), 'utf8'));
  const installed = path.join(harnessHome, 'profiles/.generations/live', `${packageName}+${version}+0123456789ab`, 'node_modules', packageName);
  await fs.mkdir(path.dirname(installed), { recursive: true });
  const source = await fs.realpath(path.join(root, 'plugin'));
  const testRoot = await fs.realpath(directory);
  const destination = path.join(await fs.realpath(path.dirname(installed)), packageName);
  assert.ok(source.startsWith(testRoot + path.sep) && destination.startsWith(testRoot + path.sep));
  await fs.rename(source, destination);
  const entry = path.join(harnessHome, 'profiles/desktop/node_modules', packageName);
  await fs.mkdir(path.dirname(entry), { recursive: true });
  await fs.symlink(installed, entry, 'junction');
  assert.doesNotMatch(await fs.readFile(path.join(installed, 'cordis.patch.yml'), 'utf8'), /configFile|projectRoot/);
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
  assert.ok(preview.value.pdfBytes > 5);
  const range = await fetchDisplay('library-pdf-range', { previewId: preview.value.previewId, begin: 0, end: 5 });
  assert.equal(range.headers.get('content-type'), 'application/octet-stream');
  assert.equal(await range.text(), '%PDF-');
  assert.equal((await request('library-preview-result', { previewId: preview.value.previewId, status: 'ready', elapsedMs: 50 })).ok, true);
  const worker = await route.fetch(new Request('http://localhost' + route.path + '?asset=pdf.worker.mjs'));
  assert.match(worker.headers.get('content-type'), /javascript/);
  assert.ok((await worker.arrayBuffer()).byteLength > 1000);
  const spreadsheetWorker = await route.fetch(new Request('http://localhost' + route.path + '?asset=sheet.worker.mjs'));
  assert.match(spreadsheetWorker.headers.get('content-type'), /javascript/);
  assert.ok((await spreadsheetWorker.arrayBuffer()).byteLength > 1000);
  const demo = await fetch('http://127.0.0.1:17865/demo');
  assert.equal(demo.status, 200);
  const { stdout } = await promisify(execFile)(process.execPath, [process.argv[3], '--desktop'], { windowsHide: true });
  assert.ok(stdout.includes('Runtime identity OK'));
  assert.ok(stdout.includes('MCP handshake OK'));
  assert.ok(stdout.includes('profiles\\\\.generations\\\\live'));
  assert.ok(stdout.includes('External Office converter: not configured'));
  console.log('Installed Host, bundled demo, MCP, library preview and Desktop diagnostics OK.');
} finally { for (const effect of effects.reverse()) await effect(); }
`);
  const host = spawn(node, [probe, path.join(entry, 'lib/index.js'), path.join(root, 'dist/doctor.mjs')], { cwd: directory, env: { ...process.env, DSH_HOME: harnessHome }, windowsHide: true, stdio: 'inherit' });
  const hostCode = await new Promise((resolve, reject) => { host.on('error', reject); host.on('exit', resolve); });
  if (hostCode !== 0) throw new Error('Bundled offline Host failed');
  const desktopConfig = JSON.parse(await fs.readFile(desktopFilename, 'utf8'));
  assert.match(desktopConfig.serviceToken, /^[a-f0-9]{64}$/);
  assert.equal(desktopConfig.platform.projectId, 'offline-template-test');
  assert.equal(desktopConfig.dataDirectory, undefined);
  assert.equal(desktopConfig.documentPreview.enabled, true);
  assert.equal(desktopConfig.documentPreview.allowPdfViewer, true);
  assert.equal(desktopConfig.retrieval.diagnostics, true);
  assert.equal(desktopConfig.retrieval.diagnosticExcerpts, true);
  const diagnostics = await fs.readFile(path.join(harnessHome, 'logs/dsh-mcp-tbea-knowledge.jsonl'), 'utf8');
  assert.match(diagnostics, /tbea-preview-prepare/);
  assert.match(diagnostics, /tbea-preview-first-page/);
  if(await fetch('http://127.0.0.1:17865/health',{ signal:AbortSignal.timeout(500) }).then(()=>true,()=>false)) throw new Error('Host exit left its MCP service running');
  console.log('Packaged template generated the Desktop config at first activation. Offline runtime OK without source node_modules or npm.');
} finally {
  if (child) {
    const stopped = new Promise(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else child.once('close', resolve); });
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await stopped;
  }
  if (directory.startsWith(path.join(os.tmpdir(), 'tbea-offline-'))) await fs.rm(directory, { recursive: true, force: true });
}
