import fs from 'node:fs/promises';
import path from 'node:path';

export const PLATFORM_ORIGIN = 'https://ai.tbea.com';

/** 配置只由服务端读取；AK/SK、图片鉴权和服务口令均不进入模型或浏览器。 */
export async function readConfig(filename) {
  const absolute = path.resolve(filename);
  const config = JSON.parse(await fs.readFile(absolute, 'utf8'));
  if (!['mock', 'live'].includes(config.mode)) throw new Error('mode 必须为 mock 或 live');
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) throw new Error('port 必须在 1024～65535 之间');
  if (typeof config.serviceToken !== 'string' || config.serviceToken.length < 32) throw new Error('服务口令未初始化，请先运行初始化脚本');
  if (config.platform?.baseUrl !== PLATFORM_ORIGIN) throw new Error('仅允许连接 https://ai.tbea.com');
  for (const key of ['searchPath', 'chunkPath']) {
    const url = new URL(config.platform[key], PLATFORM_ORIGIN);
    if (url.origin !== PLATFORM_ORIGIN || !url.pathname.startsWith('/')) throw new Error('平台接口路径不合法');
  }
  if (!Array.isArray(config.knowledgeBases) || !config.knowledgeBases.length || config.knowledgeBases.some(k => !k.id || !k.name)) throw new Error('必须配置允许访问的知识库 id 和名称');
  if (new Set(config.knowledgeBases.map(k => k.id)).size !== config.knowledgeBases.length) throw new Error('知识库 id 不能重复');
  if (config.mode === 'live') {
    for (const key of ['accessKey', 'secretKey', 'projectId']) if (!config.platform[key]) throw new Error(`正式模式缺少 ${key}`);
    if (config.knowledgeBases.some(k => k.id.startsWith('demo-'))) throw new Error('正式模式不能使用演示知识库 ID');
  }
  config.dataDirectory = path.resolve(path.dirname(absolute), config.dataDirectory || '../data');
  config.limits = { top: 6, maxQueryCharacters: 1024, maxTextCharacters: 30000, maxImageBytes: 15 * 1024 * 1024, maxCacheBytes: 512 * 1024 * 1024, maxSnapshots: 500, ...config.limits };
  for (const [key, value] of Object.entries(config.limits)) if (!Number.isSafeInteger(value) || value < 1) throw new Error(`limits.${key} 必须为正整数`);
  if (config.limits.top > 20 || config.limits.maxSnapshots > 10000 || config.limits.maxQueryCharacters > 1024) throw new Error('检索数量、快照数量或 query 长度超过限制');
  return config;
}
