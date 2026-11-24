import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);

// scripts/service-control.mjs
import fs2 from "node:fs/promises";
import path2 from "node:path";
import { randomUUID } from "node:crypto";

// src/config.ts
import fs from "node:fs/promises";
import path from "node:path";

// src/contracts.ts
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// src/config.ts
var PLATFORM_ORIGIN = "https://ai.tbea.com";
var PLATFORM_SEARCH_PATH = "/openapi/v1/knowledgeBase?Action=QueryKnowledge";
var PLATFORM_LIST_PATH = "/api/ai_apaas/v1/knowledgeBase?Action=DescribeKnowledgeBases";
var PLATFORM_CHUNK_PATH = "/api/ai_apaas/v1/knowledgeBase?Action=DescribeChunk";
var LEGACY_SEARCH_PATH = "/api/ai_apaas/v1/knowledgebases/query";
var RETRIEVAL_DEFAULTS = Object.freeze({ perLibraryTop: 3, libraryTimeoutMs: 8e3, roundTimeoutMs: 3e4 });
function parseConfigJson(contents) {
  let config;
  try {
    config = JSON.parse(contents.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("\u914D\u7F6E\u6587\u4EF6\u4E0D\u662F\u6709\u6548 JSON\uFF0C\u8BF7\u68C0\u67E5\u82F1\u6587\u5F15\u53F7\u3001\u9017\u53F7\u548C\u62EC\u53F7");
  }
  if (!isRecord(config)) throw new Error("\u914D\u7F6E\u6587\u4EF6\u7684\u6700\u5916\u5C42\u5FC5\u987B\u4E3A JSON \u5BF9\u8C61");
  return config;
}
async function readConfig(filename2, options) {
  return validateConfig(parseConfigJson(await fs.readFile(filename2, "utf8")), filename2, options);
}
async function validateConfig(config, filename2, options = {}) {
  const directoryPath = path.dirname(path.resolve(filename2));
  const service = config.service;
  if (service !== void 0 && !isRecord(service)) throw new Error("service \u5FC5\u987B\u4E3A\u5BF9\u8C61");
  const autoStart = service?.autoStart;
  if (autoStart !== void 0 && typeof autoStart !== "boolean") throw new Error("service.autoStart \u5FC5\u987B\u4E3A true \u6216 false");
  if (config.autoRetrieveKnowledge !== void 0 && typeof config.autoRetrieveKnowledge !== "boolean") throw new Error("autoRetrieveKnowledge \u5FC5\u987B\u4E3A true \u6216 false");
  const { mode, port, serviceToken, platform: rawPlatform } = config;
  if (mode !== "mock" && mode !== "live") throw new Error("mode \u5FC5\u987B\u4E3A mock \u6216 live");
  if (typeof port !== "number" || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("port \u5FC5\u987B\u5728 1024\uFF5E65535 \u4E4B\u95F4");
  if (typeof serviceToken !== "string" || serviceToken.length < 32) throw new Error("\u670D\u52A1\u53E3\u4EE4\u672A\u521D\u59CB\u5316\uFF0C\u8BF7\u5148\u8FD0\u884C\u521D\u59CB\u5316\u811A\u672C");
  if (!isRecord(rawPlatform) || rawPlatform.baseUrl !== PLATFORM_ORIGIN) throw new Error("\u4EC5\u5141\u8BB8\u8FDE\u63A5 https://ai.tbea.com");
  const platform = readPlatform(rawPlatform, mode);
  const entries = config.knowledgeBases ?? [];
  if (!Array.isArray(entries)) throw new Error("\u77E5\u8BC6\u5E93 id \u548C\u540D\u79F0\u5FC5\u987B\u4E3A\u975E\u7A7A\u5B57\u7B26\u4E32");
  const knowledgeBases = entries.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id.trim() || typeof entry.name !== "string" || !entry.name.trim()) {
      throw new Error("\u77E5\u8BC6\u5E93 id \u548C\u540D\u79F0\u5FC5\u987B\u4E3A\u975E\u7A7A\u5B57\u7B26\u4E32");
    }
    return { ...entry, id: entry.id, name: entry.name, description: typeof entry.description === "string" ? entry.description : void 0 };
  });
  if (new Set(knowledgeBases.map((k) => k.id)).size !== knowledgeBases.length) throw new Error("\u77E5\u8BC6\u5E93 id \u4E0D\u80FD\u91CD\u590D");
  const directory = config.knowledgeDirectory ?? {};
  if (!isRecord(directory)) throw new Error("knowledgeDirectory \u5FC5\u987B\u4E3A\u5BF9\u8C61");
  const directoryMode = directory.mode ?? (knowledgeBases.length || mode === "mock" ? "static" : "auto");
  if (directoryMode !== "auto" && directoryMode !== "static") throw new Error("knowledgeDirectory.mode \u5FC5\u987B\u4E3A auto \u6216 static");
  const refreshSeconds = directory.refreshSeconds ?? 60;
  if (typeof refreshSeconds !== "number" || !Number.isInteger(refreshSeconds) || refreshSeconds < 1 || refreshSeconds > 3600) throw new Error("knowledgeDirectory.refreshSeconds \u5FC5\u987B\u4E3A 1\uFF5E3600 \u7684\u6574\u6570");
  if ((mode === "mock" || directoryMode === "static") && !knowledgeBases.length) throw new Error("\u6F14\u793A\u6216\u9759\u6001\u6A21\u5F0F\u9700\u8981\u914D\u7F6E\u81F3\u5C11\u4E00\u4E2A\u77E5\u8BC6\u5E93");
  if (mode === "live" && directoryMode === "static" && knowledgeBases.some((k) => k.id.startsWith("demo-"))) throw new Error("\u6B63\u5F0F\u9759\u6001\u6A21\u5F0F\u4E0D\u80FD\u4F7F\u7528\u6F14\u793A\u77E5\u8BC6\u5E93 ID");
  if (config.dataDirectory && typeof config.dataDirectory !== "string") throw new Error("dataDirectory \u5FC5\u987B\u4E3A\u76EE\u5F55\u8DEF\u5F84");
  const dataDirectory = path.resolve(directoryPath, typeof config.dataDirectory === "string" && config.dataDirectory ? config.dataDirectory : options.defaultDataDirectory ?? "../data");
  const limits = { top: 10, maxEvidenceChunks: 5, maxQueryCharacters: 1024, maxTextCharacters: 3e4, maxImageBytes: 15 * 1024 * 1024, maxCacheBytes: 512 * 1024 * 1024, maxSnapshots: 500, ...isRecord(config.limits) ? config.limits : {} };
  for (const [key, value] of Object.entries(limits)) if (!Number.isSafeInteger(value) || value < 1) throw new Error(`limits.${key} \u5FC5\u987B\u4E3A\u6B63\u6574\u6570`);
  if (limits.top > 20 || limits.maxEvidenceChunks > 20 || limits.maxSnapshots > 1e4 || limits.maxQueryCharacters > 1024) throw new Error("\u68C0\u7D22\u6570\u91CF\u3001\u5FEB\u7167\u6570\u91CF\u6216 query \u957F\u5EA6\u8D85\u8FC7\u9650\u5236");
  const overrides = config.retrieval ?? {};
  if (!isRecord(overrides)) throw new Error("retrieval \u5FC5\u987B\u4E3A\u5BF9\u8C61");
  const retrieval = { ...RETRIEVAL_DEFAULTS, ...overrides };
  for (const [key, max] of Object.entries({ perLibraryTop: 20, libraryTimeoutMs: 6e4, roundTimeoutMs: 1e5 })) {
    const value = retrieval[key];
    if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`retrieval.${key} \u5FC5\u987B\u4E3A 1\uFF5E${max} \u7684\u6574\u6570`);
  }
  if (retrieval.libraryTimeoutMs > retrieval.roundTimeoutMs) throw new Error("\u5355\u5E93\u8D85\u65F6\u4E0D\u80FD\u5927\u4E8E\u6574\u8F6E\u68C0\u7D22\u8D85\u65F6");
  const evidenceThreshold = overrides.evidenceScoreThreshold;
  if (overrides.diagnostics !== void 0 && typeof overrides.diagnostics !== "boolean") throw new Error("retrieval.diagnostics \u5FC5\u987B\u4E3A true \u6216 false");
  if (overrides.semanticReview !== void 0 && typeof overrides.semanticReview !== "boolean") throw new Error("retrieval.semanticReview \u5FC5\u987B\u4E3A true \u6216 false");
  if (evidenceThreshold !== void 0 && (typeof evidenceThreshold !== "number" || !Number.isFinite(evidenceThreshold) || evidenceThreshold < 0 || evidenceThreshold > 1)) {
    throw new Error("retrieval.evidenceScoreThreshold \u5FC5\u987B\u4E3A 0\uFF5E1 \u7684\u6570\u5B57");
  }
  return {
    ...config,
    mode,
    port,
    serviceToken,
    platform,
    knowledgeBases,
    dataDirectory,
    limits,
    diagnosticsDirectory: options.defaultDiagnosticsDirectory ?? path.join(dataDirectory, "logs"),
    retrieval: {
      ...retrieval,
      evidenceScoreThreshold: evidenceThreshold,
      diagnostics: overrides.diagnostics,
      synonyms: readSynonyms(overrides.synonyms),
      semanticReview: overrides.semanticReview === false ? false : void 0,
      semanticModelOrigins: readModelOrigins(overrides.semanticModelOrigins)
    },
    documentPreview: await readDocumentPreview(config.documentPreview, directoryPath, options),
    service: service && { ...service, autoStart },
    knowledgeDirectory: { mode: directoryMode, refreshSeconds },
    // 未配置的旧版本继续允许模型按需检索。
    autoRetrieveKnowledge: config.autoRetrieveKnowledge ?? true
  };
}
function readModelOrigins(value) {
  if (value === void 0) return void 0;
  if (!Array.isArray(value) || value.length > 10) throw new Error("retrieval.semanticModelOrigins \u5FC5\u987B\u4E3A\u81F3\u591A 10 \u9879\u7684 HTTPS \u5185\u7F51\u6765\u6E90\u6570\u7EC4");
  return [...new Set(value.map((origin) => {
    try {
      if (typeof origin !== "string") throw new Error();
      const url = new URL(origin);
      if (url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/") return url.origin;
    } catch {
    }
    throw new Error("retrieval.semanticModelOrigins \u53EA\u63A5\u53D7 HTTPS \u6765\u6E90\uFF0C\u4F8B\u5982 https://model.example.internal");
  }))];
}
function readSynonyms(value) {
  if (value === void 0) return void 0;
  if (!Array.isArray(value) || value.length > 50) throw new Error("retrieval.synonyms \u5FC5\u987B\u4E3A\u81F3\u591A 50 \u9879\u7684\u6570\u7EC4");
  const valid = (text) => typeof text === "string" && text.trim().length >= 2 && text.trim().length <= 80;
  function words(input) {
    if (!Array.isArray(input) || !input.length || input.length > 12 || !input.every(valid)) {
      throw new Error("retrieval.synonyms \u7684 aliases \u548C context \u5FC5\u987B\u5404\u5305\u542B 1\uFF5E12 \u4E2A\u975E\u7A7A\u77ED\u8BED");
    }
    return input.map((text) => text.trim());
  }
  return value.map((item) => {
    if (!isRecord(item) || !valid(item.term)) throw new Error("retrieval.synonyms \u7684 term \u5FC5\u987B\u4E3A\u6B63\u5F0F\u4E1A\u52A1\u77ED\u8BED");
    return { term: item.term.trim(), aliases: words(item.aliases), context: words(item.context) };
  });
}
async function readDocumentPreview(value, directory, { bundledOffice }) {
  if (value === void 0) return void 0;
  if (!isRecord(value) || typeof value.enabled !== "boolean") throw new Error("documentPreview.enabled \u5FC5\u987B\u4E3A true \u6216 false");
  const { allowPdfViewer } = value;
  if (allowPdfViewer !== void 0 && typeof allowPdfViewer !== "boolean") throw new Error("documentPreview.allowPdfViewer \u5FC5\u987B\u4E3A true \u6216 false");
  function program(input, key) {
    if (input === void 0 || input === "") return void 0;
    if (typeof input !== "string" || !input.trim()) throw new Error(`documentPreview.${key} \u5FC5\u987B\u4E3A\u7A0B\u5E8F\u8DEF\u5F84`);
    return path.resolve(directory, input);
  }
  const { office } = value;
  const converters = {};
  if (value.converters !== void 0 && !isRecord(value.converters)) throw new Error("documentPreview.converters \u5FC5\u987B\u4E3A\u5BF9\u8C61");
  for (const [format, input] of Object.entries(value.converters ?? {})) {
    if (!/^[a-z0-9]{2,8}$/.test(format)) throw new Error("\u8F6C\u6362\u7EC4\u4EF6\u952E\u5FC5\u987B\u4E3A\u5C0F\u5199\u6587\u4EF6\u6269\u5C55\u540D\uFF0C\u4F8B\u5982 ofd");
    converters[format] = program(input, `converters.${format}`);
  }
  let officeProgram = program(office, "office");
  let officeBundled;
  if (value.enabled && allowPdfViewer !== false && !officeProgram && process.platform === "win32") {
    const relative = "tools/libreoffice/program/soffice.com";
    for (const candidate of bundledOffice ? [bundledOffice] : [path.resolve(directory, "../plugin", relative), path.resolve(directory, "..", relative)]) {
      if ((await fs.stat(candidate).catch(() => void 0))?.isFile()) {
        officeProgram = candidate;
        officeBundled = true;
        break;
      }
    }
  }
  return { enabled: value.enabled, allowPdfViewer: allowPdfViewer ?? true, office: officeProgram, officeBundled, converters };
}
function readPlatform(raw, mode) {
  function routeFor(key, fallback) {
    const value = raw[key] ?? fallback;
    if (typeof value !== "string" || !value.trim()) throw new Error(`platform.${key} \u5FC5\u987B\u4E3A\u6709\u6548\u7684\u63A5\u53E3\u8DEF\u5F84`);
    const url = new URL(value, PLATFORM_ORIGIN);
    if (url.origin !== PLATFORM_ORIGIN || url.username || url.password || url.hash) throw new Error(`platform.${key} \u6307\u5411\u4E0D\u5141\u8BB8\u7684\u5730\u5740`);
    const route = url.pathname + url.search;
    return key === "searchPath" && route === LEGACY_SEARCH_PATH ? PLATFORM_SEARCH_PATH : route;
  }
  function text(key) {
    const value = raw[key];
    if (value != null && typeof value !== "string") throw new Error(`platform.${key} \u5FC5\u987B\u4E3A\u5B57\u7B26\u4E32`);
    return value ?? void 0;
  }
  const threshold = raw.rankScoreThreshold ?? 0.4;
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error("platform.rankScoreThreshold \u5FC5\u987B\u4E3A 0\uFF5E1 \u7684\u6570\u5B57");
  const timeout = raw.timeoutMs;
  if (timeout != null && (typeof timeout !== "number" || !Number.isInteger(timeout) || timeout < 0 || timeout > 4294967295)) throw new Error("platform.timeoutMs \u5FC5\u987B\u4E3A\u6709\u6548\u7684\u6BEB\u79D2\u6570");
  if (mode === "live") {
    for (const key of ["accessKey", "secretKey", "projectId", "rerankModelName"]) {
      if (!text(key)?.trim()) throw new Error(`\u6B63\u5F0F\u6A21\u5F0F\u7F3A\u5C11 ${key}`);
    }
  }
  return {
    ...raw,
    baseUrl: PLATFORM_ORIGIN,
    rankScoreThreshold: threshold,
    timeoutMs: timeout ?? void 0,
    accessKey: text("accessKey"),
    secretKey: text("secretKey"),
    projectId: text("projectId"),
    rerankModelName: text("rerankModelName"),
    assetAuth: text("assetAuth"),
    assetApiKey: text("assetApiKey"),
    searchPath: routeFor("searchPath", PLATFORM_SEARCH_PATH),
    listPath: routeFor("listPath", PLATFORM_LIST_PATH),
    chunkPath: routeFor("chunkPath", PLATFORM_CHUNK_PATH)
  };
}

// src/runtime.ts
import { createHmac } from "node:crypto";
var RUNTIME_PROTOCOL = "tbea-runtime/v1";
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function configIdentity(config) {
  const value = { ...config };
  delete value.service;
  delete value.autoRetrieveKnowledge;
  delete value.diagnosticsDirectory;
  if (!config.documentPreview?.enabled) delete value.documentPreview;
  return createHmac("sha256", config.serviceToken).update(JSON.stringify(canonical(value))).digest("hex");
}

// scripts/service-control.mjs
async function request(base, endpoint, options = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(new URL(endpoint, base), {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(2e3),
        headers: { Connection: "close", ...options.headers }
      });
    } catch (error) {
      if (error.cause?.code === "ECONNREFUSED") return null;
      if (!options.method && attempt === 0 && ["ECONNRESET", "EPIPE", "UND_ERR_SOCKET"].includes(error.cause?.code)) continue;
      throw new Error("\u65E0\u6CD5\u6838\u5BF9\u672C\u673A\u77E5\u8BC6\u670D\u52A1\u72B6\u6001\uFF0C\u8BF7\u68C0\u67E5\u672C\u673A\u7AEF\u53E3\u548C\u7F51\u7EDC\u6743\u9650");
    }
  }
}
async function runtime(base, authorization, identity) {
  const health = await request(base, "/health");
  if (!health) return null;
  const service = await health.json().catch(() => null);
  if (!health.ok || service?.name !== "tbea-knowledge" || service.protocol !== "tbea-knowledge/v1") {
    throw new Error("\u8BE5\u7AEF\u53E3\u5E76\u975E\u672C\u9879\u76EE\u7684\u77E5\u8BC6\u670D\u52A1\uFF0C\u672A\u6267\u884C\u5173\u505C");
  }
  const response = await request(base, "/runtime", { headers: { Authorization: authorization } });
  if (!response) return null;
  const info = await response.json().catch(() => null);
  if (!response.ok || info?.schema !== RUNTIME_PROTOCOL || info.configIdentity !== identity || !["dsh", "manual"].includes(info.owner)) {
    throw new Error("\u77E5\u8BC6\u670D\u52A1\u8EAB\u4EFD\u4E0E\u5F53\u524D\u914D\u7F6E\u4E0D\u5339\u914D\uFF0C\u8BF7\u6838\u5BF9\u7AEF\u53E3\u53CA\u914D\u7F6E\uFF0C\u6216\u9000\u51FA\u5320\u5B9D\u3001\u5728\u539F\u624B\u52A8\u7A97\u53E3\u6309 Ctrl+C");
  }
  return info;
}
async function setAutoStart(file, enabled) {
  const raw = JSON.parse((await fs2.readFile(file, "utf8")).replace(/^\uFEFF/, ""));
  raw.service = { ...raw.service, autoStart: enabled };
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs2.writeFile(temporary, JSON.stringify(raw, null, 2) + "\n", { flag: "wx" });
    await fs2.rename(temporary, file);
  } finally {
    await fs2.unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  console.log(`\u5320\u5B9D\u968F\u542F\u52A8\u8BBE\u7F6E\u5DF2${enabled ? "\u542F\u7528" : "\u5173\u95ED"}\uFF0C\u5B8C\u5168\u9000\u51FA\u5E76\u91CD\u65B0\u6253\u5F00\u5320\u5B9D\u540E\u751F\u6548\u3002`);
}
async function main(action2, filename2) {
  const file = path2.resolve(filename2);
  const config = await readConfig(file);
  if (action2 === "enable-auto-start" || action2 === "disable-auto-start") {
    await setAutoStart(file, action2 === "enable-auto-start");
    return;
  }
  const base = `http://127.0.0.1:${config.port}`;
  const identity = configIdentity(config);
  const authorization = `Bearer ${config.serviceToken}`;
  const info = await runtime(base, authorization, identity);
  if (!info) {
    console.log("\u5F53\u524D\u914D\u7F6E\u7684\u77E5\u8BC6\u670D\u52A1\u672A\u8FD0\u884C\u3002");
    return;
  }
  if (action2 === "check-stopped") throw new Error("\u8BF7\u5148\u5B8C\u5168\u9000\u51FA\u5320\u5B9D\u5E76\u5173\u505C\u72EC\u7ACB MCP\uFF0C\u518D\u6E05\u7406\u6570\u636E");
  if (action2 === "stop-for-uninstall" && info.owner === "manual") {
    console.log("\u63D2\u4EF6\u5DF2\u79FB\u9664\u3002\u72EC\u7ACB MCP \u4ECD\u5728\u8FD0\u884C\uFF0C\u53EF\u5728\u539F\u7A97\u53E3\u6309 Ctrl+C \u5355\u72EC\u5173\u505C\u3002");
    return;
  }
  const owner = action2 === "stop-manual" ? "manual" : "dsh";
  if (info.owner !== owner) {
    throw new Error(info.owner === "manual" ? "\u5F53\u524D\u4E3A\u72EC\u7ACB MCP\u3002\u5982\u9700\u5173\u505C\uFF0C\u8BF7\u4F7F\u7528 Stop-Service.ps1 -Manual\uFF0C\u6216\u5728\u539F\u7A97\u53E3\u6309 Ctrl+C" : "\u5F53\u524D\u670D\u52A1\u7531\u5320\u5B9D\u6258\u7BA1\uFF0C\u8BF7\u8FD0\u884C\u4E0D\u5E26 -Manual \u7684 Stop-Service.ps1");
  }
  const stopped = await request(base, "/shutdown", {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ configIdentity: identity, owner })
  });
  if (stopped && stopped.status !== 202) throw new Error("\u670D\u52A1\u672A\u63A5\u53D7\u5173\u505C\uFF0C\u8BF7\u68C0\u67E5\u7248\u672C\u3002\u65E7\u7248\u672C\u53EF\u901A\u8FC7\u5B8C\u5168\u9000\u51FA\u5320\u5B9D\u6216\u5728\u72EC\u7ACB\u7A97\u53E3\u6309 Ctrl+C \u5173\u95ED");
  const deadline = Date.now() + 5e3;
  while (Date.now() < deadline) {
    if (!await request(base, "/health")) {
      console.log(owner === "dsh" ? "\u516C\u53F8\u77E5\u8BC6\u670D\u52A1\u5DF2\u6682\u505C\u3002\u5B8C\u5168\u9000\u51FA\u5E76\u91CD\u65B0\u6253\u5F00\u5320\u5B9D\u540E\uFF0C\u6309\u73B0\u6709\u81EA\u52A8\u542F\u52A8\u8BBE\u7F6E\u6062\u590D\u3002" : "\u72EC\u7ACB MCP \u5DF2\u5173\u505C\u3002");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("\u672A\u786E\u8BA4\u77E5\u8BC6\u670D\u52A1\u7AEF\u53E3\u91CA\u653E\uFF0C\u8BF7\u5B8C\u5168\u9000\u51FA\u62E5\u6709\u8BE5\u670D\u52A1\u7684\u7A0B\u5E8F");
}
var [action, filename] = process.argv.slice(2);
if (!["stop-managed", "stop-manual", "stop-for-uninstall", "check-stopped", "enable-auto-start", "disable-auto-start"].includes(action) || !filename) {
  console.error("\u7528\u6CD5\uFF1Aservice-control.mjs <\u64CD\u4F5C> <\u914D\u7F6E\u6587\u4EF6>");
  process.exitCode = 1;
} else {
  await main(action, filename).catch((error) => {
    console.error(error.code === "ENOENT" ? "\u672A\u627E\u5230\u672C\u5730\u914D\u7F6E\uFF0C\u8BF7\u5728\u5B9E\u9645\u5B89\u88C5\u76EE\u5F55\u8FD0\u884C\u811A\u672C" : error.message);
    process.exitCode = 1;
  });
}
//# sourceMappingURL=service-control.mjs.map
