import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function initialize(root) {
  const filename = path.join(root, 'config/local.json');
  const existing = await fs.readFile(filename, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (existing === null) {
    const config = JSON.parse(await fs.readFile(path.join(root, 'config/example.json'), 'utf8'));
    config.serviceToken = randomBytes(32).toString('hex');
    await fs.writeFile(filename, JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
  } else if (!JSON.parse(existing).serviceToken || JSON.parse(existing).serviceToken.length < 32) throw new Error('Existing local.json has no valid serviceToken; fix it manually. Existing configuration was not replaced.');
  // 安装包位置可以改变；每次初始化仅重建本项目的 bundle patch，不改用户 DSH profile。
  const patch = `- insert:\n    - id: tbea-knowledge\n      name: dsh-plugin-tbea-knowledge\n      config:\n        configFile: ${JSON.stringify(filename.replaceAll('\\', '/'))}\n`;
  await fs.writeFile(path.join(root, 'plugin/cordis.patch.yml'), patch);
  await fs.writeFile(path.join(root, 'config/generated-profile.patch.yml'), `# Only use if overriding the bundle's configFile.\n- id: tbea-knowledge\n  config:\n    configFile: ${JSON.stringify(filename.replaceAll('\\', '/'))}\n`);
  const config = JSON.parse(await fs.readFile(filename, 'utf8'));
  await fs.writeFile(path.join(root, 'config/generic-mcp.example.json'), JSON.stringify({ mcpServers: { tbea: { type: 'http', url: `http://127.0.0.1:${config.port}/mcp`, headers: { Authorization: 'Bearer <serviceToken from local.json>' } } } }, null, 2));
  console.log(`Initialized: ${filename}\nExisting credentials and mode are preserved.`);
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await initialize(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
