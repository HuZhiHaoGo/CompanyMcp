import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const lock = JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'));
const notices = ['Third-party dependency notices (build and runtime dependencies).\nExact dependency tree: package-lock.json.\n'];
for (const [directory, entry] of Object.entries(lock.packages)) {
  if (!directory.startsWith('node_modules/')) continue;
  const packageRoot = path.join(root, directory);
  const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8').catch(() => '{}'));
  notices.push(`\n===== ${manifest.name || directory} @ ${entry.version} (${entry.license || manifest.license || 'see package'}) =====\n`);
  for (const name of (await fs.readdir(packageRoot).catch(() => [])).filter(name => /^(LICENSE|LICENCE|COPYING|NOTICE)(\.|$)/i.test(name))) {
    const filename = path.join(packageRoot, name);
    if ((await fs.stat(filename)).isFile()) notices.push(await fs.readFile(filename, 'utf8'));
  }
}
await fs.writeFile(path.join(root, 'docs/THIRD-PARTY-LICENSES.txt'), notices.join('\n'));
console.log('Third-party notices generated.');
