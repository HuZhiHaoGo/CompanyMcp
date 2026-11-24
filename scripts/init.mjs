import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DESKTOP_DEPLOYMENT_CONFIG, commandHarnessHome, desktopConfigLocations } from '../src/desktop-config.ts';
import { initializeDesktopConfig, prepareDesktopDeployment } from '../src/desktop-initialization.ts';

export async function initialize(root) {
  root=path.resolve(root);
  const parse=text=>{
    let value; try { value=JSON.parse(text.replace(/^\uFEFF/,'')); } catch { throw new Error('Configuration JSON is invalid. Check quotes, commas and braces; existing configuration was not replaced.'); }
    if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Configuration must be a JSON object.');
    return value;
  };
  const filename = path.join(root, 'config/local.json');
  const existing = await fs.readFile(filename, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (existing === null) {
    const config = parse(await fs.readFile(path.join(root, 'config/example.json'), 'utf8'));
    config.serviceToken = randomBytes(32).toString('hex');
    await fs.writeFile(filename, JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
  } else if (typeof parse(existing).serviceToken!=='string' || parse(existing).serviceToken.length < 32) throw new Error('Existing local.json has no valid serviceToken; fix it manually. Existing configuration was not replaced.');
  // 安装包位置可以改变；每次初始化仅重建本项目的 bundle patch，不改用户 DSH profile。
  const patch = `- insert:\n    - id: tbea-knowledge\n      name: dsh-plugin-tbea-knowledge\n      config:\n        configFile: ${JSON.stringify(filename.replaceAll('\\', '/'))}\n        projectRoot: ${JSON.stringify(root.replaceAll('\\','/'))}\n`;
  await fs.writeFile(path.join(root, 'plugin/cordis.patch.yml'), patch);
  await fs.writeFile(path.join(root, 'config/generated-profile.patch.yml'), `# Only use if overriding the bundle configuration.\n- id: tbea-knowledge\n  config:\n    configFile: ${JSON.stringify(filename.replaceAll('\\', '/'))}\n    projectRoot: ${JSON.stringify(root.replaceAll('\\','/'))}\n`);
  const config = parse(await fs.readFile(filename, 'utf8'));
  await fs.writeFile(path.join(root, 'config/generic-mcp.example.json'), JSON.stringify({ mcpServers: { tbea: { type: 'http', url: `http://127.0.0.1:${config.port}/mcp`, headers: { Authorization: 'Bearer <serviceToken from local.json>' } } } }, null, 2));
  console.log(`Initialized: ${filename}\nExisting credentials and mode are preserved.`);
}

export async function initializeDesktop(root, { harnessHome, configSource, replaceConfig, prepareDesktopPackage } = {}) {
  const locations = desktopConfigLocations(commandHarnessHome(harnessHome), path.join(root, 'plugin'));
  if (prepareDesktopPackage) {
    if (!configSource) throw new Error('请通过 -ConfigSource 指定管理员准备的 JSON 配置文件');
    const destination = path.join(root, 'plugin', DESKTOP_DEPLOYMENT_CONFIG);
    await prepareDesktopDeployment(locations, configSource, destination, replaceConfig);
    console.log(`已准备部署配置：${destination}\n请在匠宝「插件管理」中添加并启用这个 plugin 目录。`);
    return;
  }
  const { written } = await initializeDesktopConfig(locations, configSource ? [configSource] : [], replaceConfig);
  console.log(`${written ? 'Initialized' : 'Kept existing'} Desktop configuration: ${locations.filename}`);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      desktop: { type: 'boolean' }, 'harness-home': { type: 'string' },
      'config-source': { type: 'string' }, 'replace-config': { type: 'boolean' },
      'prepare-desktop-package': { type: 'boolean' },
    } });
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    if (values.desktop || values['prepare-desktop-package']) {
      await initializeDesktop(root, {
        harnessHome: values['harness-home'], configSource: values['config-source'], replaceConfig: values['replace-config'],
        prepareDesktopPackage: values['prepare-desktop-package'],
      });
    } else {
      if (Object.keys(values).length) throw new Error('Harness 配置参数需要 -Desktop');
      await initialize(root);
    }
  } catch (error) {
    console.error(`Initialization failed: ${error.message}`);
    process.exitCode = 1;
  }
}
