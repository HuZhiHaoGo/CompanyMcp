import fs from 'node:fs/promises';
import path from 'node:path';
import { isRecord } from './contracts.ts';
import type { DocumentPreviewConfig, EvidenceSynonym, KnowledgeBase, PlatformConfig, ServiceConfig } from './contracts.ts';

export const PLATFORM_ORIGIN = 'https://ai.tbea.com';
export const PLATFORM_SEARCH_PATH = '/openapi/v1/knowledgeBase?Action=QueryKnowledge';
export const PLATFORM_LIST_PATH = '/api/ai_apaas/v1/knowledgeBase?Action=DescribeKnowledgeBases';
export const PLATFORM_CHUNK_PATH = '/api/ai_apaas/v1/knowledgeBase?Action=DescribeChunk';
const LEGACY_SEARCH_PATH = '/api/ai_apaas/v1/knowledgebases/query';
export const RETRIEVAL_DEFAULTS = Object.freeze({ perLibraryTop: 3, libraryTimeoutMs: 8000, roundTimeoutMs: 30000 });

interface ConfigLocations {
  bundledOffice?: string;
  defaultDataDirectory?: string;
  defaultDiagnosticsDirectory?: string;
}

export function parseConfigJson(contents: string): Record<string, unknown> {
  let config: unknown;
  try { config=JSON.parse(contents.replace(/^\uFEFF/, '')); } catch { throw new Error('配置文件不是有效 JSON，请检查英文引号、逗号和括号'); }
  if (!isRecord(config)) throw new Error('配置文件的最外层必须为 JSON 对象');
  return config;
}

/** 配置只由服务端读取；AK/SK、图片鉴权和服务口令均不进入模型或浏览器。 */
export async function readConfig(filename: string, options?: ConfigLocations): Promise<ServiceConfig> {
  return validateConfig(parseConfigJson(await fs.readFile(filename, 'utf8')), filename, options);
}

export async function validateConfig(config: Record<string, unknown>, filename: string, options: ConfigLocations = {}): Promise<ServiceConfig> {
  const directoryPath = path.dirname(path.resolve(filename));
  const service = config.service;
  if (service !== undefined && !isRecord(service)) throw new Error('service 必须为对象');
  const autoStart = service?.autoStart;
  if (autoStart !== undefined && typeof autoStart !== 'boolean') throw new Error('service.autoStart 必须为 true 或 false');
  if (config.autoRetrieveKnowledge !== undefined && typeof config.autoRetrieveKnowledge !== 'boolean') throw new Error('autoRetrieveKnowledge 必须为 true 或 false');
  const { mode, port, serviceToken, platform: rawPlatform } = config;
  if (mode !== 'mock' && mode !== 'live') throw new Error('mode 必须为 mock 或 live');
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('port 必须在 1024～65535 之间');
  if (typeof serviceToken !== 'string' || serviceToken.length < 32) throw new Error('服务口令未初始化，请先运行初始化脚本');
  if (!isRecord(rawPlatform) || rawPlatform.baseUrl !== PLATFORM_ORIGIN) throw new Error('仅允许连接 https://ai.tbea.com');
  const platform = readPlatform(rawPlatform, mode);

  const entries: unknown = config.knowledgeBases ?? [];
  if (!Array.isArray(entries)) throw new Error('知识库 id 和名称必须为非空字符串');
  const knowledgeBases: KnowledgeBase[] = entries.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id.trim() || typeof entry.name !== 'string' || !entry.name.trim()) {
      throw new Error('知识库 id 和名称必须为非空字符串');
    }
    return { ...entry, id: entry.id, name: entry.name, description: typeof entry.description === 'string' ? entry.description : undefined };
  });
  if (new Set(knowledgeBases.map(k => k.id)).size !== knowledgeBases.length) throw new Error('知识库 id 不能重复');
  const directory = config.knowledgeDirectory ?? {};
  if (!isRecord(directory)) throw new Error('knowledgeDirectory 必须为对象');
  // 旧配置有静态清单时保留原授权范围，由管理员显式启用自动发现。
  const directoryMode = directory.mode ?? (knowledgeBases.length || mode === 'mock' ? 'static' : 'auto');
  if (directoryMode !== 'auto' && directoryMode !== 'static') throw new Error('knowledgeDirectory.mode 必须为 auto 或 static');
  const refreshSeconds = directory.refreshSeconds ?? 60;
  if (typeof refreshSeconds !== 'number' || !Number.isInteger(refreshSeconds) || refreshSeconds < 1 || refreshSeconds > 3600) throw new Error('knowledgeDirectory.refreshSeconds 必须为 1～3600 的整数');
  if ((mode === 'mock' || directoryMode === 'static') && !knowledgeBases.length) throw new Error('演示或静态模式需要配置至少一个知识库');
  if (mode === 'live' && directoryMode === 'static' && knowledgeBases.some(k => k.id.startsWith('demo-'))) throw new Error('正式静态模式不能使用演示知识库 ID');
  if (config.dataDirectory && typeof config.dataDirectory !== 'string') throw new Error('dataDirectory 必须为目录路径');
  const dataDirectory = path.resolve(directoryPath, typeof config.dataDirectory === 'string' && config.dataDirectory ? config.dataDirectory : options.defaultDataDirectory ?? '../data');
  const limits = { top: 10, maxEvidenceChunks: 5, maxQueryCharacters: 1024, maxTextCharacters: 30000, maxImageBytes: 15 * 1024 * 1024, maxCacheBytes: 512 * 1024 * 1024, maxSnapshots: 500, ...(isRecord(config.limits) ? config.limits : {}) };
  for (const [key, value] of Object.entries(limits)) if (!Number.isSafeInteger(value) || value < 1) throw new Error(`limits.${key} 必须为正整数`);
  if (limits.top > 20 || limits.maxEvidenceChunks > 20 || limits.maxSnapshots > 10000 || limits.maxQueryCharacters > 1024) throw new Error('检索数量、快照数量或 query 长度超过限制');
  const overrides = config.retrieval ?? {};
  if (!isRecord(overrides)) throw new Error('retrieval 必须为对象');
  const retrieval = { ...RETRIEVAL_DEFAULTS, ...overrides };
  for (const [key, max] of Object.entries({ perLibraryTop: 20, libraryTimeoutMs: 60000, roundTimeoutMs: 100000 }) as [keyof typeof retrieval, number][]) {
    const value = retrieval[key];
    if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`retrieval.${key} 必须为 1～${max} 的整数`);
  }
  if (retrieval.libraryTimeoutMs > retrieval.roundTimeoutMs) throw new Error('单库超时不能大于整轮检索超时');
  const evidenceThreshold = overrides.evidenceScoreThreshold;
  if (overrides.diagnostics !== undefined && typeof overrides.diagnostics !== 'boolean') throw new Error('retrieval.diagnostics 必须为 true 或 false');
  if (overrides.semanticReview !== undefined && typeof overrides.semanticReview !== 'boolean') throw new Error('retrieval.semanticReview 必须为 true 或 false');
  if (evidenceThreshold !== undefined && (typeof evidenceThreshold !== 'number' || !Number.isFinite(evidenceThreshold) || evidenceThreshold < 0 || evidenceThreshold > 1)) {
    throw new Error('retrieval.evidenceScoreThreshold 必须为 0～1 的数字');
  }

  return {
    ...config, mode, port, serviceToken, platform, knowledgeBases, dataDirectory, limits,
    diagnosticsDirectory: options.defaultDiagnosticsDirectory ?? path.join(dataDirectory, 'logs'),
    retrieval: { ...retrieval, evidenceScoreThreshold: evidenceThreshold, diagnostics: overrides.diagnostics, synonyms: readSynonyms(overrides.synonyms),
      semanticReview: overrides.semanticReview === false ? false : undefined, semanticModelOrigins: readModelOrigins(overrides.semanticModelOrigins) },
    documentPreview: await readDocumentPreview(config.documentPreview, directoryPath, options),
    service: service && { ...service, autoStart },
    knowledgeDirectory: { mode: directoryMode, refreshSeconds },
    // 未配置的旧版本继续允许模型按需检索。
    autoRetrieveKnowledge: config.autoRetrieveKnowledge ?? true,
  };
}

function readModelOrigins(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 10) throw new Error('retrieval.semanticModelOrigins 必须为至多 10 项的 HTTPS 内网来源数组');
  return [...new Set(value.map(origin => {
    try {
      if (typeof origin !== 'string') throw new Error();
      const url = new URL(origin);
      if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/') return url.origin;
    } catch { /* Report the same configuration error for malformed URLs. */ }
    throw new Error('retrieval.semanticModelOrigins 只接受 HTTPS 来源，例如 https://model.example.internal');
  }))];
}

function readSynonyms(value: unknown): EvidenceSynonym[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 50) throw new Error('retrieval.synonyms 必须为至多 50 项的数组');
  const valid = (text: unknown): text is string => typeof text === 'string' && text.trim().length >= 2 && text.trim().length <= 80;
  function words(input: unknown): string[] {
    if (!Array.isArray(input) || !input.length || input.length > 12 || !input.every(valid)) {
      throw new Error('retrieval.synonyms 的 aliases 和 context 必须各包含 1～12 个非空短语');
    }
    return input.map(text => text.trim());
  }
  return value.map(item => {
    if (!isRecord(item) || !valid(item.term)) throw new Error('retrieval.synonyms 的 term 必须为正式业务短语');
    return { term: item.term.trim(), aliases: words(item.aliases), context: words(item.context) };
  });
}

async function readDocumentPreview(value: unknown, directory: string, { bundledOffice }: ConfigLocations): Promise<DocumentPreviewConfig | undefined> {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.enabled !== 'boolean') throw new Error('documentPreview.enabled 必须为 true 或 false');
  const { allowPdfViewer } = value;
  if (allowPdfViewer !== undefined && typeof allowPdfViewer !== 'boolean') throw new Error('documentPreview.allowPdfViewer 必须为 true 或 false');
  function program(input: unknown, key: string) {
    if (input === undefined || input === '') return undefined;
    if (typeof input !== 'string' || !input.trim()) throw new Error(`documentPreview.${key} 必须为程序路径`);
    return path.resolve(directory, input);
  }
  const { office } = value;
  const converters: DocumentPreviewConfig['converters'] = {};
  if (value.converters !== undefined && !isRecord(value.converters)) throw new Error('documentPreview.converters 必须为对象');
  for (const [format, input] of Object.entries(value.converters ?? {})) {
    if (!/^[a-z0-9]{2,8}$/.test(format)) throw new Error('转换组件键必须为小写文件扩展名，例如 ofd');
    converters[format] = program(input, `converters.${format}`);
  }
  let officeProgram = program(office, 'office');
  let officeBundled: boolean | undefined;
  if (value.enabled && allowPdfViewer !== false && !officeProgram && process.platform === 'win32') {
    // 匠宝只查已安装插件，独立服务也能使用同一离线包中的组件。
    const relative = 'tools/libreoffice/program/soffice.com';
    for (const candidate of bundledOffice ? [bundledOffice] : [path.resolve(directory, '../plugin', relative), path.resolve(directory, '..', relative)]) {
      if ((await fs.stat(candidate).catch(() => undefined))?.isFile()) {
        officeProgram = candidate;
        officeBundled = true;
        break;
      }
    }
  }
  return { enabled: value.enabled, allowPdfViewer: allowPdfViewer ?? true, office: officeProgram, officeBundled, converters };
}

function readPlatform(raw: Record<string, unknown>, mode: ServiceConfig['mode']): PlatformConfig {
  function routeFor(key: 'searchPath' | 'listPath' | 'chunkPath', fallback: string) {
    const value = raw[key] ?? fallback;
    if (typeof value !== 'string' || !value.trim()) throw new Error(`platform.${key} 必须为有效的接口路径`);
    const url = new URL(value, PLATFORM_ORIGIN);
    if (url.origin !== PLATFORM_ORIGIN || url.username || url.password || url.hash) throw new Error(`platform.${key} 指向不允许的地址`);
    const route = url.pathname + url.search;
    // 旧 local.json 无需改写，也不会继续调用内网联调失败的旧检索地址。
    return key === 'searchPath' && route === LEGACY_SEARCH_PATH ? PLATFORM_SEARCH_PATH : route;
  }
  function text(key: string) {
    const value = raw[key];
    if (value != null && typeof value !== 'string') throw new Error(`platform.${key} 必须为字符串`);
    return value ?? undefined;
  }
  const threshold = raw.rankScoreThreshold ?? 0.4;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('platform.rankScoreThreshold 必须为 0～1 的数字');
  const timeout = raw.timeoutMs;
  if (timeout != null && (typeof timeout !== 'number' || !Number.isInteger(timeout) || timeout < 0 || timeout > 4294967295)) throw new Error('platform.timeoutMs 必须为有效的毫秒数');
  if (mode === 'live') {
    for (const key of ['accessKey', 'secretKey', 'projectId', 'rerankModelName']) {
      if (!text(key)?.trim()) throw new Error(`正式模式缺少 ${key}`);
    }
  }
  return {
    ...raw, baseUrl: PLATFORM_ORIGIN, rankScoreThreshold: threshold, timeoutMs: timeout ?? undefined,
    accessKey: text('accessKey'), secretKey: text('secretKey'), projectId: text('projectId'),
    rerankModelName: text('rerankModelName'), assetAuth: text('assetAuth'), assetApiKey: text('assetApiKey'),
    searchPath: routeFor('searchPath', PLATFORM_SEARCH_PATH), listPath: routeFor('listPath', PLATFORM_LIST_PATH), chunkPath: routeFor('chunkPath', PLATFORM_CHUNK_PATH),
  };
}
