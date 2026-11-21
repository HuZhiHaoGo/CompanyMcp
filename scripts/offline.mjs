import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'offline', 'dsh-mcp-tbea-knowledge');
const poppler = path.join(root, 'tools', 'poppler');
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build the Windows offline runtime on Windows x64');
if (await fs.stat(path.join(output, 'config/local.json')).catch(() => false) || await fs.stat(path.join(output, 'data')).catch(() => false)) throw new Error('Offline output contains local configuration or data. Move it aside before creating a clean distribution.');
for (const name of ['pdfinfo.exe', 'pdftoppm.exe', 'poppler.dll']) {
  const file = await fs.stat(path.join(poppler, 'Library', 'bin', name)).catch(() => undefined);
  if (!file?.isFile()) throw new Error(`Missing Poppler file tools/poppler/Library/bin/${name}`);
}
await fs.mkdir(output, { recursive: true });
for (const name of ['dist', 'plugin', 'config', 'docs', 'README.md', 'LICENSE-NOTICE.md']) {
  await fs.cp(path.join(root, name), path.join(output, name), { recursive: true, filter: source => !source.includes(`${path.sep}src`) && !source.endsWith('local.json') && !source.endsWith('cordis.patch.yml') && !source.endsWith('generated-profile.patch.yml') });
}
await fs.mkdir(path.join(output, 'scripts'), { recursive: true });
for (const name of ['Initialize.ps1', 'Start-Service.ps1', 'Stop-Service.ps1', 'Set-ServiceAutoStart.ps1', 'Install-Plugin.ps1', 'Uninstall-Plugin.ps1', 'Clear-LocalData.ps1', 'Doctor.ps1', 'common.ps1', 'init.mjs']) await fs.copyFile(path.join(root, 'scripts', name), path.join(output, 'scripts', name));
await fs.mkdir(path.join(output, 'runtime'), { recursive: true });
// 运行产物不依赖 node_modules；附带当前 Windows Node，内网无需下载运行时。
await fs.copyFile(process.execPath, path.join(output, 'runtime/node.exe'));
await fs.copyFile(path.join(path.dirname(process.execPath), 'LICENSE'), path.join(output, 'runtime/LICENSE'));
await fs.cp(poppler, path.join(output, 'tools', 'poppler'), { recursive: true });
console.log(`Offline runtime prepared: ${output}\nNo credentials or data were included. Run Initialize.ps1 after moving it.`);
