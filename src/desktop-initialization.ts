import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseConfigJson, readConfig, validateConfig } from './config.ts';
import { hasCode, isRecord } from './contracts.ts';
import type { desktopConfigLocations } from './desktop-config.ts';

type DesktopLocations = ReturnType<typeof desktopConfigLocations>;

async function readDeploymentSource(configSource: string) {
  const config = parseConfigJson(await fs.readFile(configSource, 'utf8'));
  // 兼容位于旧运行目录 config/ 下的配置模板。
  if (typeof config.dataDirectory === 'string' && config.dataDirectory.replaceAll('\\', '/') === '../data') delete config.dataDirectory;
  if (isRecord(config.documentPreview)) {
    for (const [key, executable] of [['pdfInfo', 'pdfinfo.exe'], ['pdfToPpm', 'pdftoppm.exe']]) {
      const setting = config.documentPreview[key];
      if (typeof setting === 'string' && setting.replaceAll('\\', '/') === `../tools/poppler/Library/bin/${executable}`) {
        delete config.documentPreview[key];
      }
    }
  }
  return config;
}

function withServiceToken(config: Record<string, unknown>) {
  return config.serviceToken === undefined || config.serviceToken === ''
    ? { ...config, serviceToken: randomBytes(32).toString('hex') }
    : config;
}

async function writeConfig(filename: string, config: Record<string, unknown>, replace: boolean) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomBytes(8).toString('hex')}.tmp`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  try {
    try { await handle.writeFile(JSON.stringify(config, null, 2) + '\n'); }
    finally { await handle.close(); }
    if (replace) await fs.rename(temporary, filename);
    // 完整写入后才发布，并由文件系统保证并发启用时只创建一次。
    else await fs.link(temporary, filename);
    return true;
  } catch (error) {
    if (!replace && hasCode(error, 'EEXIST')) return false;
    throw error;
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

export async function initializeDesktopConfig({ filename, options }: DesktopLocations, configSources: readonly string[], replace = false) {
  if (!replace) {
    const existing = await readConfig(filename, options).catch(error => {
      if (!hasCode(error, 'ENOENT')) throw error;
    });
    if (existing) return { config: existing, written: false };
  }
  if (!configSources.length) throw new Error('请通过 -ConfigSource 指定管理员准备的 JSON 配置文件');
  let source;
  for (const configSource of configSources) {
    source = await readDeploymentSource(configSource).catch(error => {
      if (!hasCode(error, 'ENOENT')) throw error;
    });
    if (source) break;
  }
  if (!source) throw new Error(`知识库配置文件不存在：${filename}，也找不到初始化来源：${configSources.join('、')}`);
  const raw = withServiceToken(source);
  const config = await validateConfig(raw, filename, options);
  if (await writeConfig(filename, raw, replace)) return { config, written: true };
  return { config: await readConfig(filename, options), written: false };
}

export async function prepareDesktopDeployment({ filename, options }: DesktopLocations, configSource: string, destination: string, replace: boolean) {
  const config = await readDeploymentSource(configSource);
  await validateConfig(withServiceToken(config), filename, options);
  if (!await writeConfig(destination, config, replace)) {
    throw new Error(`插件目录已存在部署配置：${destination}。要更换它，请添加 -ReplaceConfig。`);
  }
}
