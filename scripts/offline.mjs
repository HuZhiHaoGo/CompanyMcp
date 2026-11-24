import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { DESKTOP_CONFIG_TEMPLATE, DESKTOP_DEPLOYMENT_CONFIG } from '../src/desktop-config.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'offline', 'with-libreoffice', 'dsh-mcp-tbea-knowledge');
const poppler = path.join(root, 'tools', 'poppler');
const libreoffice = path.join(root, 'tools', 'libreoffice');
const desktopPatch = '- insert:\n    - id: tbea-knowledge\n      name: dsh-plugin-tbea-knowledge\n';
const isDeploymentFile = filename => {
  const name = path.basename(filename).toLowerCase();
  return name === DESKTOP_DEPLOYMENT_CONFIG || name.startsWith(DESKTOP_DEPLOYMENT_CONFIG + '.');
};
const popplerFiles = ['pdfinfo.exe', 'pdftoppm.exe', 'poppler.dll'];
const officeFiles = [
  'program/soffice.com', 'program/soffice.bin', 'program/fundamental.ini', 'program/services.rdb',
  'program/msvcp140.dll', 'program/msvcp140_1.dll', 'program/msvcp140_2.dll', 'program/vcruntime140.dll', 'program/vcruntime140_1.dll',
  'license.txt', 'NOTICE', 'SOURCE.md',
];
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build the Windows offline runtime on Windows x64');
if (await fs.stat(path.join(output, 'config/local.json')).catch(() => false) || await fs.stat(path.join(output, 'data')).catch(() => false)) throw new Error('Offline output contains local configuration or data. Move it aside before creating a clean distribution.');
const previousPluginFiles = await fs.readdir(path.join(output, 'plugin')).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return [];
});
if (previousPluginFiles.some(isDeploymentFile)) throw new Error('通用离线包输出目录中已有公司部署配置，请将它移到单独解压的内网部署副本后重新打包。');
for (const name of popplerFiles) {
  const file = await fs.stat(path.join(poppler, 'Library', 'bin', name)).catch(() => undefined);
  if (!file?.isFile()) throw new Error(`Missing Poppler file tools/poppler/Library/bin/${name}`);
}
for (const name of officeFiles) {
  const file = await fs.stat(path.join(libreoffice, name)).catch(() => undefined);
  if (!file?.isFile()) throw new Error(`Missing LibreOffice file tools/libreoffice/${name}. See tools/LIBREOFFICE.md.`);
}
await fs.mkdir(output, { recursive: true });
for (const name of ['dist', 'plugin', 'config', 'docs', 'README.md', 'LICENSE-NOTICE.md']) {
  await fs.cp(path.join(root, name), path.join(output, name), { recursive: true, filter: source => !isDeploymentFile(source) && !source.includes(`${path.sep}src`) && !source.endsWith('local.json') && !source.endsWith('cordis.patch.yml') && !source.endsWith('generated-profile.patch.yml') });
}
await fs.writeFile(path.join(output, 'plugin/cordis.patch.yml'), desktopPatch);
await fs.cp(poppler, path.join(output, 'plugin/tools/poppler'), { recursive: true });
await fs.cp(libreoffice, path.join(output, 'plugin/tools/libreoffice'), { recursive: true });
await fs.cp(path.join(root, 'dist/demo'), path.join(output, 'plugin/dist/demo'), { recursive: true });
await fs.mkdir(path.join(output, 'tools'), { recursive: true });
await fs.copyFile(path.join(root, 'tools/LIBREOFFICE.md'), path.join(output, 'tools/LIBREOFFICE.md'));
await fs.mkdir(path.join(output, 'scripts'), { recursive: true });
for (const name of ['Initialize.ps1', 'Start-Service.ps1', 'Stop-Service.ps1', 'Set-ServiceAutoStart.ps1', 'Install-Plugin.ps1', 'Uninstall-Plugin.ps1', 'Clear-LocalData.ps1', 'Doctor.ps1', 'common.ps1']) await fs.copyFile(path.join(root, 'scripts', name), path.join(output, 'scripts', name));
await build({ entryPoints: [path.join(root, 'scripts/init.mjs')], outfile: path.join(output, 'scripts/init.mjs'), bundle: true, platform: 'node', target: 'node24', format: 'esm' });
await fs.mkdir(path.join(output, 'runtime'), { recursive: true });
// 运行产物不依赖 node_modules；附带当前 Windows Node，内网无需下载运行时。
await fs.copyFile(process.execPath, path.join(output, 'runtime/node.exe'));
await fs.copyFile(path.join(path.dirname(process.execPath), 'LICENSE'), path.join(output, 'runtime/LICENSE'));

const rootName = path.basename(output);
const releaseDir = path.dirname(output);
const archive = path.join(releaseDir, rootName + '-win-x64.zip');
const temporary = path.join(releaseDir, '.' + rootName + '-' + process.pid + '.zip');
const tar = path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe');
const run = promisify(execFile);
try {
  // 匠宝和独立 MCP 共用插件目录中的预览工具。
  await run(tar, ['-a', '-cf', temporary, '--exclude', `${rootName}/tools/poppler`, '-C', releaseDir, rootName], { windowsHide: true });
  const { stdout } = await run(tar, ['-tf', temporary], { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  const entries = new Set(stdout.trim().split(/\r?\n/));
  for (const name of [
    DESKTOP_CONFIG_TEMPLATE, `plugin/${DESKTOP_CONFIG_TEMPLATE}`, 'dist/server.mjs', 'plugin/package.json', 'plugin/lib/index.js', 'plugin/lib/client.js',
    'plugin/cordis.patch.yml', 'plugin/dist/demo/index.html', 'plugin/dist/demo/demo.js', 'scripts/init.mjs', 'runtime/node.exe',
    'plugin/lib/pdfjs/pdf.mjs', 'plugin/lib/pdfjs/pdf.worker.mjs', 'plugin/lib/pdfjs/LICENSE',
    'plugin/lib/pdfjs/cmaps/UniGB-UTF16-H.bcmap', 'plugin/lib/pdfjs/standard_fonts/FoxitFixed.pfb', 'plugin/lib/pdfjs/wasm/openjpeg.wasm',
    ...popplerFiles.map(name => `plugin/tools/poppler/Library/bin/${name}`),
    ...officeFiles.map(name => `plugin/tools/libreoffice/${name}`),
  ]) {
    if (!entries.has(rootName + '/' + name)) throw new Error('Offline archive is missing ' + name);
  }
  for (const entry of entries) {
    const relative = entry.slice(rootName.length + 1);
    if (!entry.startsWith(rootName + '/') || isDeploymentFile(relative) || /^(?:data(?:\/|$)|tools\/poppler(?:\/|$)|config\/(?:local\.json|generated-profile\.patch\.yml)$)/i.test(relative) || /(?:^|\/)dsh-mcp-tbea-knowledge\.json$/i.test(relative)) {
      throw new Error('Unexpected offline archive entry: ' + entry);
    }
  }
  await fs.rename(temporary, archive);
} finally {
  await fs.rm(temporary, { force: true });
}
console.log(`Offline runtime prepared: ${output}\n匠宝首次启用会使用包内 plugin/${DESKTOP_CONFIG_TEMPLATE} 初始化缺失的配置。`);
console.log('Offline ZIP prepared: ' + archive);
