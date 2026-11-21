// scripts/init.mjs
import fs2 from "node:fs/promises";
import path3 from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

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
async function validateConfig(config, filename, options = {}) {
  const directoryPath = path.dirname(path.resolve(filename));
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
    retrieval: {
      ...retrieval,
      evidenceScoreThreshold: evidenceThreshold,
      diagnostics: overrides.diagnostics,
      synonyms: readSynonyms(overrides.synonyms),
      semanticReview: overrides.semanticReview === false ? false : void 0,
      semanticModelOrigins: readModelOrigins(overrides.semanticModelOrigins)
    },
    documentPreview: await readDocumentPreview(config.documentPreview, directoryPath, options.bundledPopplerBin),
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
async function readDocumentPreview(value, directory, bundledPopplerBin) {
  if (value === void 0) return void 0;
  if (!isRecord(value) || typeof value.enabled !== "boolean") throw new Error("documentPreview.enabled \u5FC5\u987B\u4E3A true \u6216 false");
  function program(input, key) {
    if (input === void 0 || input === "") return void 0;
    if (typeof input !== "string" || !input.trim()) throw new Error(`documentPreview.${key} \u5FC5\u987B\u4E3A\u7A0B\u5E8F\u8DEF\u5F84`);
    return path.resolve(directory, input);
  }
  const { pdfInfo, pdfToPpm, office } = value;
  const converters = {};
  if (value.converters !== void 0 && !isRecord(value.converters)) throw new Error("documentPreview.converters \u5FC5\u987B\u4E3A\u5BF9\u8C61");
  for (const [format, input] of Object.entries(value.converters ?? {})) {
    if (!/^[a-z0-9]{2,8}$/.test(format)) throw new Error("\u8F6C\u6362\u7EC4\u4EF6\u952E\u5FC5\u987B\u4E3A\u5C0F\u5199\u6587\u4EF6\u6269\u5C55\u540D\uFF0C\u4F8B\u5982 ofd");
    converters[format] = program(input, `converters.${format}`);
  }
  let info = program(pdfInfo, "pdfInfo");
  let ppm = program(pdfToPpm, "pdfToPpm");
  if (value.enabled && process.platform === "win32") {
    const legacyBin = path.resolve(directory, "../tools/poppler/Library/bin");
    const offlineBin = path.resolve(directory, "../plugin/tools/poppler/Library/bin");
    async function bundledProgram(name, configured, original) {
      const legacyDefault = !bundledPopplerBin && typeof original === "string" && !path.isAbsolute(original) && configured === path.join(legacyBin, name);
      if (configured && !legacyDefault) return configured;
      for (const bin of bundledPopplerBin ? [bundledPopplerBin] : [legacyBin, offlineBin]) {
        const filename = path.join(bin, name);
        if ((await fs.stat(filename).catch(() => void 0))?.isFile()) return filename;
      }
      return configured;
    }
    [info, ppm] = await Promise.all([bundledProgram("pdfinfo.exe", info, pdfInfo), bundledProgram("pdftoppm.exe", ppm, pdfToPpm)]);
  }
  if (value.enabled && (!info || !ppm)) throw new Error("\u542F\u7528\u6B63\u5F0F\u539F\u6587\u9884\u89C8\u9700\u8981\u914D\u7F6E pdfInfo \u548C pdfToPpm");
  return { enabled: value.enabled, pdfInfo: info, pdfToPpm: ppm, office: program(office, "office"), converters };
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

// src/desktop-config.ts
import path2 from "node:path";
var DESKTOP_CONFIG = "dsh-mcp-tbea-knowledge.json";
function desktopConfigLocations(harnessHome, packageRoot) {
  if (!harnessHome || !path2.isAbsolute(harnessHome)) {
    throw new Error("\u65E0\u6CD5\u5B9A\u4F4D\u5320\u5B9D Harness \u76EE\u5F55\uFF0C\u8BF7\u68C0\u67E5 DSH_HOME \u6216\u6307\u5B9A Harness \u7684\u7EDD\u5BF9\u8DEF\u5F84");
  }
  return {
    filename: path2.join(harnessHome, DESKTOP_CONFIG),
    options: {
      bundledPopplerBin: path2.join(packageRoot, "tools", "poppler", "Library", "bin"),
      defaultDataDirectory: path2.join(harnessHome, "dsh-mcp-tbea-knowledge-data")
    }
  };
}
function commandHarnessHome(override) {
  return override ?? process.env.DSH_HOME ?? (process.platform === "win32" && process.env.APPDATA ? path2.join(process.env.APPDATA, "dsh-desktop", "harness") : void 0);
}

// scripts/init.mjs
async function initialize(root) {
  root = path3.resolve(root);
  const parse = (text) => {
    let value;
    try {
      value = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
      throw new Error("Configuration JSON is invalid. Check quotes, commas and braces; existing configuration was not replaced.");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Configuration must be a JSON object.");
    return value;
  };
  const filename = path3.join(root, "config/local.json");
  const existing = await fs2.readFile(filename, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (existing === null) {
    const config2 = parse(await fs2.readFile(path3.join(root, "config/example.json"), "utf8"));
    config2.serviceToken = randomBytes(32).toString("hex");
    await fs2.writeFile(filename, JSON.stringify(config2, null, 2) + "\n", { flag: "wx" });
  } else if (typeof parse(existing).serviceToken !== "string" || parse(existing).serviceToken.length < 32) throw new Error("Existing local.json has no valid serviceToken; fix it manually. Existing configuration was not replaced.");
  const patch = `- insert:
    - id: tbea-knowledge
      name: dsh-plugin-tbea-knowledge
      config:
        configFile: ${JSON.stringify(filename.replaceAll("\\", "/"))}
        projectRoot: ${JSON.stringify(root.replaceAll("\\", "/"))}
`;
  await fs2.writeFile(path3.join(root, "plugin/cordis.patch.yml"), patch);
  await fs2.writeFile(path3.join(root, "config/generated-profile.patch.yml"), `# Only use if overriding the bundle configuration.
- id: tbea-knowledge
  config:
    configFile: ${JSON.stringify(filename.replaceAll("\\", "/"))}
    projectRoot: ${JSON.stringify(root.replaceAll("\\", "/"))}
`);
  const config = parse(await fs2.readFile(filename, "utf8"));
  await fs2.writeFile(path3.join(root, "config/generic-mcp.example.json"), JSON.stringify({ mcpServers: { tbea: { type: "http", url: `http://127.0.0.1:${config.port}/mcp`, headers: { Authorization: "Bearer <serviceToken from local.json>" } } } }, null, 2));
  console.log(`Initialized: ${filename}
Existing credentials and mode are preserved.`);
}
async function initializeDesktop(root, { harnessHome, configSource, replaceConfig } = {}) {
  const locations = desktopConfigLocations(commandHarnessHome(harnessHome), path3.join(root, "plugin"));
  const { filename, options } = locations;
  const existing = await fs2.readFile(filename, "utf8").catch((error) => {
    if (error.code === "ENOENT") return void 0;
    throw error;
  });
  if (existing !== void 0 && !replaceConfig) {
    await validateConfig(parseConfigJson(existing), filename, options);
    console.log(`Kept existing Desktop configuration: ${filename}`);
    return;
  }
  if (!configSource) throw new Error("\u8BF7\u901A\u8FC7 -ConfigSource \u6307\u5B9A\u7BA1\u7406\u5458\u51C6\u5907\u7684 JSON \u914D\u7F6E\u6587\u4EF6");
  const config = parseConfigJson(await fs2.readFile(configSource, "utf8"));
  if (config.serviceToken === void 0 || config.serviceToken === "") config.serviceToken = randomBytes(32).toString("hex");
  if (typeof config.dataDirectory === "string" && config.dataDirectory.replaceAll("\\", "/") === "../data") delete config.dataDirectory;
  if (isRecord(config.documentPreview)) {
    for (const [key, executable] of [["pdfInfo", "pdfinfo.exe"], ["pdfToPpm", "pdftoppm.exe"]]) {
      const setting = config.documentPreview[key];
      if (typeof setting === "string" && setting.replaceAll("\\", "/") === `../tools/poppler/Library/bin/${executable}`) {
        delete config.documentPreview[key];
      }
    }
  }
  await validateConfig(config, filename, options);
  await fs2.mkdir(path3.dirname(filename), { recursive: true });
  const contents = JSON.stringify(config, null, 2) + "\n";
  if (replaceConfig) {
    const temporary = `${filename}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      await fs2.writeFile(temporary, contents, { flag: "wx" });
      await fs2.rename(temporary, filename);
    } finally {
      await fs2.rm(temporary, { force: true });
    }
  } else {
    await fs2.writeFile(filename, contents, { flag: "wx" });
  }
  console.log(`Initialized Desktop configuration: ${filename}`);
}
if (path3.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      desktop: { type: "boolean" },
      "harness-home": { type: "string" },
      "config-source": { type: "string" },
      "replace-config": { type: "boolean" }
    } });
    const root = path3.resolve(path3.dirname(fileURLToPath(import.meta.url)), "..");
    if (values.desktop) {
      await initializeDesktop(root, {
        harnessHome: values["harness-home"],
        configSource: values["config-source"],
        replaceConfig: values["replace-config"]
      });
    } else {
      if (Object.keys(values).length) throw new Error("Harness \u914D\u7F6E\u53C2\u6570\u9700\u8981 -Desktop");
      await initialize(root);
    }
  } catch (error) {
    console.error(`Initialization failed: ${error.message}`);
    process.exitCode = 1;
  }
}
export {
  initialize,
  initializeDesktop
};
