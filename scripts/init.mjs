import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseConfigJson, validateConfig } from '../src/config.ts';
import { isRecord } from '../src/contracts.ts';
import { commandHarnessHome, desktopConfigLocations } from '../src/desktop-config.ts';

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

export async function initializeDesktop(root, { harnessHome, configSource, replaceConfig } = {}) {
  const locations = desktopConfigLocations(commandHarnessHome(harnessHome), path.join(root, 'plugin'));
  const { filename, options } = locations;
  const existing = await fs.readFile(filename, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (existing !== undefined && !replaceConfig) {
    await validateConfig(parseConfigJson(existing), filename, options);
    console.log(`Kept existing Desktop configuration: ${filename}`);
    return;
  }
  if (!configSource) throw new Error('请通过 -ConfigSource 指定管理员准备的 JSON 配置文件');

  const config = parseConfigJson(await fs.readFile(configSource, 'utf8'));
  if (config.serviceToken === undefined || config.serviceToken === '') config.serviceToken = randomBytes(32).toString('hex');
  // 旧模板的相对路径基于 config/。桌面安装改用独立数据位置和随包的 Poppler。
  if (typeof config.dataDirectory === 'string' && config.dataDirectory.replaceAll('\\', '/') === '../data') delete config.dataDirectory;
  if (isRecord(config.documentPreview)) {
    for (const [key, executable] of [['pdfInfo', 'pdfinfo.exe'], ['pdfToPpm', 'pdftoppm.exe']]) {
      const setting = config.documentPreview[key];
      if (typeof setting === 'string' && setting.replaceAll('\\', '/') === `../tools/poppler/Library/bin/${executable}`) {
        delete config.documentPreview[key];
      }
    }
  }
  await validateConfig(config, filename, options);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const contents = JSON.stringify(config, null, 2) + '\n';
  if (replaceConfig) {
    const temporary = `${filename}.${randomBytes(8).toString('hex')}.tmp`;
    try {
      await fs.writeFile(temporary, contents, { flag: 'wx' });
      await fs.rename(temporary, filename);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  } else {
    await fs.writeFile(filename, contents, { flag: 'wx' });
  }
  console.log(`Initialized Desktop configuration: ${filename}`);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      desktop: { type: 'boolean' }, 'harness-home': { type: 'string' },
      'config-source': { type: 'string' }, 'replace-config': { type: 'boolean' },
    } });
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    if (values.desktop) {
      await initializeDesktop(root, {
        harnessHome: values['harness-home'], configSource: values['config-source'], replaceConfig: values['replace-config'],
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
