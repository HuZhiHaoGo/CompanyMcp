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
  console.log('Offline runtime OK without source node_modules or npm.');
} finally {
  const stopped = new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
  child.kill(); await stopped;
  if (directory.startsWith(path.join(os.tmpdir(), 'tbea-offline-'))) await fs.rm(directory, { recursive: true, force: true });
}
