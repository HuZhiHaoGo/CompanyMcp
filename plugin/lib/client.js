window.__ModuleLoader__.load({id:"dsh-plugin-tbea-knowledge",factory:(require)=>{var module={exports:{}};var exports=module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/contracts.ts
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function hasCode(error, code) {
  return isRecord(error) && error.code === code;
}
var init_contracts = __esm({
  "src/contracts.ts"() {
    "use strict";
  }
});

// plugin/src/pdf-range.ts
function retryAfter(ms, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", cancel, { once: true });
  });
}
function createPdfRangeReader(bridge, previewId, signal, onData, onError) {
  const queue = [];
  let active = 0;
  let stopped = false;
  signal.addEventListener("abort", () => {
    queue.length = 0;
  }, { once: true });
  async function readChunk(begin, end) {
    for (let retries = 0; ; retries++) {
      signal.throwIfAborted();
      try {
        const chunk = await bridge("library-pdf-range", { previewId, begin, end }, signal);
        if (chunk.bytes.length !== end - begin) {
          throw Object.assign(new Error("PDF \u6570\u636E\u8BFB\u53D6\u4E0D\u5B8C\u6574\u3002"), { code: "PDF_RANGE_INCOMPLETE" });
        }
        return chunk.bytes;
      } catch (error) {
        signal.throwIfAborted();
        const delay = retryDelays[retries];
        if (!hasCode(error, "SERVICE_BUSY") || delay === void 0) throw new PdfRangeError(error, begin, end, retries);
        await retryAfter(delay, signal);
      }
    }
  }
  async function read(begin, end) {
    const result = new Uint8Array(end - begin);
    for (let offset = begin; offset < end; offset += requestBytes) {
      const limit = Math.min(end, offset + requestBytes);
      result.set(await readChunk(offset, limit), offset - begin);
    }
    if (!signal.aborted && !stopped) onData(begin, result);
  }
  function drain() {
    while (!signal.aborted && !stopped && active < maxReads && queue.length) {
      const range = queue.shift();
      active++;
      void read(range.begin, range.end).catch((error) => {
        if (signal.aborted || stopped) return;
        stopped = true;
        queue.length = 0;
        onError(error);
      }).finally(() => {
        active--;
        drain();
      });
    }
  }
  return (begin, end) => {
    if (signal.aborted || stopped) return;
    queue.push({ begin, end });
    drain();
  };
}
var requestBytes, maxReads, retryDelays, PdfRangeError;
var init_pdf_range = __esm({
  "plugin/src/pdf-range.ts"() {
    "use strict";
    init_contracts();
    requestBytes = 1024 * 1024;
    maxReads = 2;
    retryDelays = [150, 300];
    PdfRangeError = class extends Error {
      code;
      begin;
      end;
      retries;
      constructor(error, begin, end, retries) {
        super(hasCode(error, "SERVICE_BUSY") ? "PDF \u8BFB\u53D6\u7E41\u5FD9\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002" : error instanceof Error ? error.message : "PDF \u6570\u636E\u8BFB\u53D6\u5931\u8D25\u3002", { cause: error });
        this.code = isRecord(error) && typeof error.code === "string" ? error.code : "PDF_RANGE_FAILED";
        this.begin = begin;
        this.end = end;
        this.retries = retries;
      }
    };
  }
});

// plugin/src/pdf-viewer.tsx
function PreviewMeter({ label, elapsedMs, received, total }) {
  const [seconds, setSeconds] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
    if (elapsedMs !== void 0) return;
    const start = performance.now();
    const timer = setInterval(() => setSeconds(Math.floor((performance.now() - start) / 1e3)), 1e3);
    return () => clearInterval(timer);
  }, [elapsedMs]);
  const value = total && received !== void 0 ? Math.min(100, Math.floor(received / total * 100)) : void 0;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-preview-progress" }, /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement("span", { role: "status" }, label), /* @__PURE__ */ import_react3.default.createElement("span", null, value === void 0 ? `\u5DF2\u7528 ${elapsedMs === void 0 ? seconds : Math.floor(elapsedMs / 1e3)} \u79D2` : `${value}%`)), /* @__PURE__ */ import_react3.default.createElement("progress", { "aria-label": label, max: 100, value }));
}
function assetUrl(base, name) {
  const url = new URL(base, document.baseURI);
  url.searchParams.set("asset", name);
  return url.href;
}
function pdfError(error) {
  if (error instanceof Error && error.name === "PasswordException") return "\u6B64 PDF \u53D7\u5BC6\u7801\u4FDD\u62A4\uFF0C\u65E0\u6CD5\u9884\u89C8\u3002";
  return error instanceof Error ? error.message : "PDF \u67E5\u770B\u5668\u52A0\u8F7D\u5931\u8D25\u3002";
}
function PdfViewer({ bridge, previewId, bytes, assetPath, restart }) {
  const [documentPdf, setDocumentPdf] = (0, import_react3.useState)();
  const [failure, setFailure] = (0, import_react3.useState)();
  const [attempt, setAttempt] = (0, import_react3.useState)(0);
  const [firstPageReady, setFirstPageReady] = (0, import_react3.useState)(false);
  const scrollRoot = (0, import_react3.useRef)(null);
  const metric = (0, import_react3.useRef)({
    started: performance.now(),
    sent: false
  });
  const report = (0, import_react3.useCallback)((status, failure2) => {
    const afterFirstPage = metric.current.sent;
    if (afterFirstPage && failure2?.phase !== "range") return;
    metric.current.sent = true;
    const { started, assetReady, documentReady } = metric.current;
    const elapsedMs = Math.round(performance.now() - started);
    const assetMs = assetReady === void 0 ? elapsedMs : Math.round(assetReady - started);
    const loadedMs = documentReady === void 0 ? elapsedMs : Math.round(documentReady - started);
    void bridge(
      "library-preview-result",
      {
        previewId,
        status: afterFirstPage ? "range-failed" : status,
        elapsedMs,
        pdfAssetMs: assetMs,
        ...assetReady !== void 0 && { pdfLoadMs: loadedMs - assetMs },
        ...documentReady !== void 0 && !afterFirstPage && { pdfRenderMs: elapsedMs - loadedMs },
        ...failure2 && { pdfFailure: JSON.stringify(failure2) }
      },
      AbortSignal.timeout(5e3)
    ).catch(() => {
    });
  }, [bridge, previewId]);
  const firstPage = (0, import_react3.useCallback)((error) => {
    if (metric.current.sent) return;
    if (error) {
      setFailure({ message: error });
      report("render-failed", { phase: "render", errorCode: "PDF_RENDER_FAILED" });
    } else {
      setFirstPageReady(true);
      report("ready");
    }
  }, [report]);
  (0, import_react3.useEffect)(() => {
    const controller = new AbortController();
    metric.current = { started: performance.now(), sent: false };
    setFirstPageReady(false);
    setDocumentPdf(void 0);
    setFailure(void 0);
    let loading;
    const dispose = () => {
      controller.abort();
      void loading?.destroy().catch(() => {
      });
      loading = void 0;
    };
    const fail = (error) => {
      if (controller.signal.aborted) return;
      const name = error instanceof Error ? error.name : "";
      const status = name === "PasswordException" ? "password" : name === "InvalidPDFException" ? "invalid-pdf" : "load-failed";
      const failure2 = error instanceof PdfRangeError ? { phase: "range", errorCode: error.code, begin: error.begin, end: error.end, retries: error.retries } : metric.current.assetReady === void 0 ? { phase: "asset", errorCode: "PDF_ASSET_FAILED" } : { phase: "load", errorCode: status === "invalid-pdf" ? "INVALID_PDF" : status === "password" ? "PDF_PASSWORD" : "PDF_LOAD_FAILED" };
      setFailure({ message: pdfError(error), reopen: failure2.errorCode === "PREVIEW_NOT_FOUND" });
      report(status, failure2);
      dispose();
    };
    async function loadPdf() {
      const engine = await import(assetUrl(assetPath, "pdf.mjs"));
      if (controller.signal.aborted) return;
      metric.current.assetReady = performance.now();
      engine.GlobalWorkerOptions.workerSrc = assetUrl(assetPath, "pdf.worker.mjs");
      const transport = new engine.PDFDataRangeTransport(bytes, null, true);
      transport.requestDataRange = createPdfRangeReader(
        bridge,
        previewId,
        controller.signal,
        (begin, data) => transport.onDataRange(begin, data),
        fail
      );
      transport.abort = () => controller.abort();
      loading = engine.getDocument({
        range: transport,
        disableStream: true,
        disableAutoFetch: true,
        cMapUrl: `${assetUrl(assetPath, "cmaps")}/`,
        standardFontDataUrl: `${assetUrl(assetPath, "standard_fonts")}/`,
        wasmUrl: `${assetUrl(assetPath, "wasm")}/`,
        enableXfa: false,
        maxImageSize: 32 * 1024 * 1024
      });
      const pdf = await loading.promise;
      if (controller.signal.aborted) return;
      metric.current.documentReady = performance.now();
      if (pdf.numPages < 1 || pdf.numPages > 3e3) throw new Error("\u6587\u6863\u9884\u89C8\u652F\u6301 1 \u81F3 3000 \u9875");
      setDocumentPdf({ pdf, disableAnnotations: engine.AnnotationMode.DISABLE });
    }
    void loadPdf().catch(fail);
    return dispose;
  }, [bridge, previewId, bytes, assetPath, attempt, report]);
  if (failure) return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-state tbea-library-error", role: "alert" }, /* @__PURE__ */ import_react3.default.createElement("span", null, failure.message), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: () => failure.reopen ? restart() : setAttempt((value) => value + 1) }, "\u91CD\u8BD5"));
  return /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, !firstPageReady && /* @__PURE__ */ import_react3.default.createElement(PreviewMeter, { label: "\u6B63\u5728\u52A0\u8F7D\u9996\u9875\u2026" }), documentPdf && /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-pages", ref: scrollRoot, tabIndex: 0, "aria-label": "PDF \u67E5\u770B\u5668\uFF0C\u6EDA\u52A8\u8FDE\u7EED\u9605\u8BFB" }, Array.from({ length: firstPageReady ? documentPdf.pdf.numPages : 1 }, (_, index2) => /* @__PURE__ */ import_react3.default.createElement(PdfPage, { key: index2, ...documentPdf, number: index2 + 1, root: scrollRoot, onFirstPage: index2 === 0 ? firstPage : void 0 }))));
}
function PdfPage({ pdf, disableAnnotations, number, root, onFirstPage }) {
  const element2 = (0, import_react3.useRef)(null);
  const surface = (0, import_react3.useRef)(null);
  const [near, setNear] = (0, import_react3.useState)(number === 1);
  const [ratio, setRatio] = (0, import_react3.useState)("1 / 1.414");
  const [error, setError] = (0, import_react3.useState)("");
  (0, import_react3.useEffect)(() => {
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root: root.current, rootMargin: "650px 0px" });
    if (element2.current) observer.observe(element2.current);
    return () => observer.disconnect();
  }, [root]);
  (0, import_react3.useEffect)(() => {
    const canvas = surface.current;
    if (!near || !canvas) return;
    let cancelled = false;
    let task;
    void pdf.getPage(number).then(async (page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 1800 / Math.max(base.width, base.height) });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      setRatio(`${base.width} / ${base.height}`);
      task = page.render({ canvas, viewport, annotationMode: disableAnnotations });
      await task.promise;
      page.cleanup();
      if (!cancelled) onFirstPage?.();
    }).catch((failure) => {
      if (!cancelled) {
        const message = pdfError(failure);
        setError(message);
        onFirstPage?.(message);
      }
    });
    return () => {
      cancelled = true;
      task?.cancel();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [near, number, pdf, disableAnnotations, onFirstPage]);
  return /* @__PURE__ */ import_react3.default.createElement("figure", { className: "tbea-library-page", ref: element2 }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-sheet", style: { aspectRatio: ratio } }, error ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-state tbea-library-error", role: "alert" }, error) : near && /* @__PURE__ */ import_react3.default.createElement("canvas", { ref: surface, className: "tbea-library-pdf-page", role: "img", "aria-label": `\u539F\u6587\u7B2C ${number} \u9875` })), /* @__PURE__ */ import_react3.default.createElement("figcaption", null, "\u7B2C ", number, " \u9875"));
}
var import_react3;
var init_pdf_viewer = __esm({
  "plugin/src/pdf-viewer.tsx"() {
    "use strict";
    import_react3 = __toESM(require("react"), 1);
    init_pdf_range();
  }
});

// plugin/src/spreadsheet-viewer.tsx
var spreadsheet_viewer_exports = {};
__export(spreadsheet_viewer_exports, {
  SpreadsheetViewer: () => SpreadsheetViewer
});
function SpreadsheetViewer({ bridge, previewId, bytes, format, assetPath, restart }) {
  const [sheets, setSheets] = (0, import_react4.useState)();
  const [selected, setSelected] = (0, import_react4.useState)(0);
  const [ready, setReady] = (0, import_react4.useState)(false);
  const [failure, setFailure] = (0, import_react4.useState)("");
  const [parsed, setParsed] = (0, import_react4.useState)();
  (0, import_react4.useEffect)(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const started = performance.now();
    let worker;
    let timer;
    const fail = (category, parseMs, message) => {
      if (signal.aborted) return;
      worker?.terminate();
      clearTimeout(timer);
      setFailure(message ?? messages[category]);
      void bridge(
        "library-preview-result",
        { previewId, status: category, parseMs, elapsedMs: Math.round(performance.now() - started) },
        AbortSignal.timeout(5e3)
      ).catch(() => {
      });
    };
    async function load() {
      const buffer = new Uint8Array(bytes);
      for (let begin = 0; begin < bytes; begin += requestBytes2) {
        const end = Math.min(bytes, begin + requestBytes2);
        const chunk = await bridge("library-sheet-range", { previewId, begin, end }, signal);
        if (chunk.bytes.length !== end - begin) throw new Error(messages["load-failed"]);
        buffer.set(chunk.bytes, begin);
      }
      signal.throwIfAborted();
      worker = new Worker(assetUrl(assetPath, "sheet.worker.mjs"), { type: "module" });
      worker.onerror = () => fail("load-failed");
      worker.onmessage = ({ data }) => {
        if (signal.aborted) return;
        clearTimeout(timer);
        worker?.terminate();
        if ("error" in data) fail(data.error, data.parseMs);
        else {
          setSheets(data.sheets);
          setParsed({ started, parseMs: data.parseMs });
        }
      };
      const parsingStarted = performance.now();
      timer = setTimeout(() => fail("sheet-timeout", Math.round(performance.now() - parsingStarted)), 2e4);
      worker.postMessage({ bytes: buffer, format }, [buffer.buffer]);
    }
    void load().catch((error) => fail("load-failed", void 0, error instanceof Error ? error.message : void 0));
    return () => {
      controller.abort();
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [bridge, previewId, bytes, format, assetPath]);
  (0, import_react4.useEffect)(() => {
    if (!parsed) return;
    let displayed = 0;
    const committed = requestAnimationFrame(() => {
      displayed = requestAnimationFrame(() => {
        setReady(true);
        void bridge("library-preview-result", {
          previewId,
          status: "ready",
          parseMs: parsed.parseMs,
          elapsedMs: Math.round(performance.now() - parsed.started)
        }, AbortSignal.timeout(5e3)).catch(() => {
        });
      });
    });
    return () => {
      cancelAnimationFrame(committed);
      cancelAnimationFrame(displayed);
    };
  }, [bridge, parsed, previewId]);
  if (failure) return /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-library-state tbea-library-error", role: "alert" }, /* @__PURE__ */ import_react4.default.createElement("span", null, failure), /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: restart }, "\u91CD\u8BD5"));
  return /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, !ready && /* @__PURE__ */ import_react4.default.createElement(PreviewMeter, { label: "\u6B63\u5728\u8BFB\u53D6\u5DE5\u4F5C\u8868\u2026" }), sheets && /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-sheet" }, /* @__PURE__ */ import_react4.default.createElement("label", null, "\u5DE5\u4F5C\u8868 ", /* @__PURE__ */ import_react4.default.createElement("select", { value: selected, onChange: (event) => setSelected(Number(event.target.value)) }, sheets.map((sheet, index2) => /* @__PURE__ */ import_react4.default.createElement("option", { key: index2, value: index2 }, sheet.name)))), /* @__PURE__ */ import_react4.default.createElement(SheetTable, { key: selected, sheet: sheets[selected] })));
}
function columnName(index2) {
  let label = "";
  for (let column = index2 + 1; column > 0; column = Math.floor((column - 1) / 26)) {
    label = String.fromCharCode(65 + (column - 1) % 26) + label;
  }
  return label;
}
function SheetTable({ sheet }) {
  const [page, setPage] = (0, import_react4.useState)(0);
  const first = page * rowsPerPage;
  const last = Math.min(sheet.rows, first + rowsPerPage);
  const grid = /* @__PURE__ */ new Map();
  for (const merge of sheet.merges) {
    const top = Math.max(first, merge.row);
    const bottom = Math.min(last, merge.row + merge.rows);
    if (bottom <= top) continue;
    const index2 = top * sheet.columns + merge.column;
    let overlaps = false;
    for (let row = top; row < bottom && !overlaps; row++) {
      for (let col = merge.column; col < merge.column + merge.columns; col++) {
        if (grid.has(row * sheet.columns + col)) {
          overlaps = true;
          break;
        }
      }
    }
    if (overlaps) continue;
    for (let row = top; row < bottom; row++) {
      for (let col = merge.column; col < merge.column + merge.columns; col++) grid.set(row * sheet.columns + col, null);
    }
    grid.set(index2, { rows: bottom - top, columns: merge.columns, value: sheet.cells[merge.row * sheet.columns + merge.column] });
  }
  return /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, sheet.rows > rowsPerPage && /* @__PURE__ */ import_react4.default.createElement("nav", { className: "tbea-sheet-rows", "aria-label": "\u5DE5\u4F5C\u8868\u884C\u8303\u56F4" }, /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "tbea-library-button", disabled: !page, onClick: () => setPage(page - 1) }, "\u4E0A\u4E00\u7EC4"), /* @__PURE__ */ import_react4.default.createElement("span", null, "\u7B2C ", sheet.startRow + first + 1, " \u81F3 ", sheet.startRow + last, " \u884C"), /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "tbea-library-button", disabled: last >= sheet.rows, onClick: () => setPage(page + 1) }, "\u4E0B\u4E00\u7EC4")), /* @__PURE__ */ import_react4.default.createElement("div", { key: page, className: "tbea-sheet-scroll", tabIndex: 0, "aria-label": "\u6EDA\u52A8\u67E5\u770B\u5DE5\u4F5C\u8868" }, /* @__PURE__ */ import_react4.default.createElement("table", { "aria-label": sheet.name }, /* @__PURE__ */ import_react4.default.createElement("thead", null, /* @__PURE__ */ import_react4.default.createElement("tr", null, /* @__PURE__ */ import_react4.default.createElement("th", { "aria-label": "\u884C\u53F7" }), Array.from({ length: sheet.columns }, (_, col) => /* @__PURE__ */ import_react4.default.createElement("th", { key: col, scope: "col" }, columnName(sheet.startColumn + col))))), /* @__PURE__ */ import_react4.default.createElement("tbody", null, Array.from({ length: last - first }, (_, relative) => {
    const row = first + relative;
    return /* @__PURE__ */ import_react4.default.createElement("tr", { key: row }, /* @__PURE__ */ import_react4.default.createElement("th", { scope: "row" }, sheet.startRow + row + 1), Array.from({ length: sheet.columns }, (_2, col) => {
      const index2 = row * sheet.columns + col;
      const merge = grid.get(index2);
      if (merge === null) return null;
      const value = merge ? merge.value : sheet.cells[index2];
      return /* @__PURE__ */ import_react4.default.createElement("td", { key: col, rowSpan: merge?.rows, colSpan: merge?.columns, title: value }, value);
    }));
  })))));
}
var import_react4, requestBytes2, rowsPerPage, messages;
var init_spreadsheet_viewer = __esm({
  "plugin/src/spreadsheet-viewer.tsx"() {
    "use strict";
    import_react4 = __toESM(require("react"), 1);
    init_pdf_viewer();
    requestBytes2 = 1024 * 1024;
    rowsPerPage = 50;
    messages = {
      "invalid-sheet": "Excel \u6587\u4EF6\u635F\u574F\u6216\u683C\u5F0F\u4E0D\u53D7\u652F\u6301\uFF0C\u65E0\u6CD5\u9884\u89C8\u3002",
      password: "\u6B64 Excel \u6587\u4EF6\u53D7\u5BC6\u7801\u4FDD\u62A4\uFF0C\u65E0\u6CD5\u9884\u89C8\u3002",
      "sheet-too-large": "\u5DE5\u4F5C\u7C3F\u8D85\u8FC7\u9884\u89C8\u7684\u89E3\u538B\u3001\u5DE5\u4F5C\u8868\u6216\u5355\u5143\u683C\u4E0A\u9650\u3002",
      "sheet-timeout": "\u8BFB\u53D6\u5DE5\u4F5C\u8868\u8D85\u65F6\uFF0C\u5DE5\u4F5C\u7C3F\u53EF\u80FD\u8FC7\u5927\u3002",
      "load-failed": "\u5DE5\u4F5C\u8868\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u6216\u91CD\u8BD5\u3002"
    };
  }
});

// plugin/src/client.jsx
var client_exports = {};
__export(client_exports, {
  KnowledgeSelection: () => KnowledgeSelection,
  KnowledgeTool: () => KnowledgeTool,
  PrefetchedKnowledge: () => PrefetchedKnowledge,
  Sources: () => Sources,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react7 = __toESM(require("react"), 1);

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var import_react2 = require("react");

// node_modules/lucide-react/dist/esm/shared/src/utils.js
var toKebabCase = (string3) => string3.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var mergeClasses = (...classes) => classes.filter((className, index2, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index2;
}).join(" ").trim();

// node_modules/lucide-react/dist/esm/Icon.js
var import_react = require("react");

// node_modules/lucide-react/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// node_modules/lucide-react/dist/esm/Icon.js
var Icon = (0, import_react.forwardRef)(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => {
    return (0, import_react.createElement)(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: mergeClasses("lucide", className),
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    );
  }
);

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var createLucideIcon = (iconName, iconNode) => {
  const Component = (0, import_react2.forwardRef)(
    ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
      ...props
    })
  );
  Component.displayName = `${iconName}`;
  return Component;
};

// node_modules/lucide-react/dist/esm/icons/arrow-left.js
var ArrowLeft = createLucideIcon("ArrowLeft", [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
]);

// node_modules/lucide-react/dist/esm/icons/book-open.js
var BookOpen = createLucideIcon("BookOpen", [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
]);

// node_modules/lucide-react/dist/esm/icons/check.js
var Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);

// node_modules/lucide-react/dist/esm/icons/chevron-down.js
var ChevronDown = createLucideIcon("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);

// node_modules/lucide-react/dist/esm/icons/chevron-right.js
var ChevronRight = createLucideIcon("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);

// node_modules/lucide-react/dist/esm/icons/copy.js
var Copy = createLucideIcon("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);

// node_modules/lucide-react/dist/esm/icons/download.js
var Download = createLucideIcon("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);

// node_modules/lucide-react/dist/esm/icons/file-text.js
var FileText = createLucideIcon("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);

// node_modules/lucide-react/dist/esm/icons/image.js
var Image = createLucideIcon("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);

// node_modules/lucide-react/dist/esm/icons/loader-circle.js
var LoaderCircle = createLucideIcon("LoaderCircle", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);

// node_modules/lucide-react/dist/esm/icons/refresh-cw.js
var RefreshCw = createLucideIcon("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);

// node_modules/lucide-react/dist/esm/icons/rotate-ccw.js
var RotateCcw = createLucideIcon("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);

// node_modules/lucide-react/dist/esm/icons/search.js
var Search = createLucideIcon("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);

// node_modules/lucide-react/dist/esm/icons/x.js
var X = createLucideIcon("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);

// node_modules/lucide-react/dist/esm/icons/zoom-in.js
var ZoomIn = createLucideIcon("ZoomIn", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "11", x2: "11", y1: "8", y2: "14", key: "1vmskp" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
]);

// node_modules/lucide-react/dist/esm/icons/zoom-out.js
var ZoomOut = createLucideIcon("ZoomOut", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
]);

// plugin/src/style.css
var style_default = "/* \u8DDF\u968F Harness 0.2.2-alpha.2 \u7684\u4E3B\u9898\u53D8\u91CF\uFF1B\u540E\u5907\u503C\u4EC5\u7528\u4E8E\u72EC\u7ACB\u6F14\u793A\u3002\n   \u4E0D\u5199\u5165\u5BBF\u4E3B\u53D8\u91CF\uFF0C\u4E0D\u4EE5\u7CFB\u7EDF\u6DF1\u8272\u5A92\u4F53\u67E5\u8BE2\u8986\u76D6 DSH \u7684\u624B\u52A8\u4E3B\u9898\u3002 */\n:where(.tbea-sources,.tbea-selection,.tbea-prefetched,.tbea-image-modal,.tbea-status,.tbea-error,.tbea-fallback) {\n  --tbea-fg:var(--dsw-alias-label-primary,#0f1115);\n  --tbea-muted:var(--dsw-alias-label-secondary,#61666b);\n  --tbea-subtle:var(--dsw-alias-label-tertiary,#81858c);\n  --tbea-surface:var(--dsw-alias-bg-layer-1,#fff);\n  --tbea-soft:var(--dsw-alias-markdown-code-block,#f9fafb);\n  --tbea-border:var(--dsw-alias-border-l2,rgba(0,0,0,.1));\n  --tbea-hover:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06));\n  --tbea-active:var(--dsw-alias-interactive-bg-active,rgba(38,49,72,.1));\n  --tbea-accent:var(--dsw-alias-state-business-primary,#4176e6);\n  --tbea-accent-bg:var(--dsw-alias-state-business-tertiary,#e4edfd);\n  --tbea-danger:var(--dsw-alias-state-error-primary,#ec1313);\n  box-sizing:border-box; min-width:0;\n  font-family:var(--dsw-font-family,system-ui,sans-serif);\n  font-size:var(--dsh-content-font-size,14px);\n  line-height:calc(24px + var(--dsh-content-font-delta,0px));\n  color:var(--tbea-fg);\n}\nbody[data-ds-dark-theme] :where(.tbea-sources,.tbea-selection,.tbea-prefetched,.tbea-image-modal,.tbea-status,.tbea-error,.tbea-fallback) {\n  --tbea-fg:var(--dsw-alias-label-primary,#f9fafb);\n  --tbea-muted:var(--dsw-alias-label-secondary,#adb2b8);\n  --tbea-subtle:var(--dsw-alias-label-tertiary,#81858c);\n  --tbea-surface:var(--dsw-alias-bg-layer-1,#232324);\n  --tbea-soft:var(--dsw-alias-markdown-code-block,#1b1b1c);\n  --tbea-border:var(--dsw-alias-border-l2,rgba(255,255,255,.12));\n  --tbea-hover:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));\n  --tbea-active:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.14));\n  --tbea-accent:var(--dsw-alias-state-business-primary,#7aaaff);\n  --tbea-accent-bg:var(--dsw-alias-state-business-tertiary,#34415b);\n  --tbea-danger:var(--dsw-alias-state-error-primary,#f25a5a);\n}\n.tbea-sources *,.tbea-image-modal *,.tbea-selection * { box-sizing:border-box; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) :where(button,a) { font-family:inherit; font-size:inherit; line-height:inherit; -webkit-app-region:no-drag; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) button { appearance:none; cursor:pointer; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) :where(button,a):focus-visible,\n.tbea-table-scroll:focus-visible,.tbea-modal-image:focus-visible { outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--tbea-accent)); outline-offset:-2px; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) button:disabled { opacity:.4; cursor:not-allowed; }\n.tbea-sources svg,.tbea-selection svg,.tbea-image-modal svg { flex:none; stroke-width:1.7; }\n\n/* \u4E0E\u539F\u751F PlanChip / Button.sm \u5171\u7528 28px \u9AD8\u5EA6\u548C 8px \u5706\u89D2\u5C42\u7EA7\u3002 */\n.tbea-selection { display:flex; align-items:center; flex-wrap:wrap; gap:6px 8px; padding:4px 0; }\n/* \u590D\u7528\u8F93\u5165\u5361\u7247\u7684\u4E24\u4FA7\u7559\u767D\u548C\u5BBD\u5EA6\u4E0A\u9650\uFF0C\u5185\u7F29\u81F3\u7F16\u8F91\u533A\u7684\u6587\u5B57\u8D77\u70B9\u3002 */\n[data-composer-seat] .tbea-selection-dock {\n  padding-inline:var(--dsh-composer-side-clearance,0px);\n}\n[data-composer-seat] .tbea-selection {\n  max-inline-size:var(--dsh-composer-card-max-width,100%);\n  margin-inline:auto;\n  padding-inline:14px;\n}\n.tbea-selection-chip { display:inline-flex; align-items:center; flex:none; gap:4px; height:28px; padding:0 4px 0 8px; border:0; border-radius:var(--dsw-radius-sm,8px); font-size:13px; font-weight:500; line-height:20px; color:var(--tbea-accent); background:var(--tbea-accent-bg); }\n.tbea-selection-chip button { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; padding:0; border:0; border-radius:var(--dsw-radius-xs,4px); background:transparent; color:inherit; }\n.tbea-selection-status,.tbea-selection-error { display:inline-flex; align-items:center; gap:6px; min-width:0; font-size:12px; line-height:18px; color:var(--tbea-muted); overflow-wrap:anywhere; }\n.tbea-selection-error { color:var(--tbea-danger); }\n.tbea-selection-error { flex-wrap:wrap; }\n.tbea-prefetched { width:100%; padding:4px 0; }\n.tbea-prefetched-label { font-size:var(--dsh-content-font-size-secondary,13px); color:var(--tbea-subtle); }\n\n.tbea-sources { width:100%; margin:8px 0; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-md,12px); background:transparent; }\n.tbea-source-toggle { display:flex; align-items:center; gap:6px; width:100%; min-height:36px; padding:4px 10px; border:0; border-radius:inherit; background:transparent; color:var(--tbea-muted); text-align:left; font-size:var(--dsh-content-font-size-secondary,13px); }\n.tbea-source-toggle strong { flex:none; font-weight:500; }\n.tbea-count,.tbea-demo { flex:none; padding:0 6px; border-radius:var(--dsw-radius-xs,4px); font-size:12px; line-height:20px; background:var(--tbea-hover); color:var(--tbea-muted); }\n.tbea-query { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--tbea-subtle); font-size:12px; }\n.tbea-source-body { padding:0 12px; border-top:1px solid var(--tbea-border); }\n.tbea-citation-group:not(:last-child) { border-bottom:1px solid var(--tbea-border); }\n.tbea-citation { min-width:0; padding:12px 0; }\n.tbea-related-sources { margin:0 0 10px; color:var(--tbea-muted); }\n.tbea-related-sources>summary { width:fit-content; max-width:100%; min-height:28px; padding:4px; font-size:var(--dsh-content-font-size-secondary,13px); cursor:pointer; }\n.tbea-related-sources>.tbea-citation { border-top:1px solid var(--tbea-border); }\n.tbea-citation-head { display:grid; grid-template-columns:16px minmax(0,1fr) 28px; align-items:start; gap:6px; min-height:28px; }\n.tbea-citation-head>svg { margin-top:6px; color:var(--tbea-subtle); }\n.tbea-citation-head strong { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-width:0; padding-top:3px; overflow:hidden; font-size:var(--dsh-content-font-size-secondary,13px); font-weight:500; line-height:22px; overflow-wrap:anywhere; }\n.tbea-citation-id { color:var(--tbea-subtle); font:12px/18px var(--ds-font-family-code,Consolas,monospace); overflow-wrap:anywhere; }\n.tbea-meta { display:flex; flex-wrap:wrap; gap:2px 12px; margin-top:4px; color:var(--tbea-subtle); font-size:12px; line-height:18px; overflow-wrap:anywhere; }\n.tbea-content { margin:10px 0 4px; white-space:pre-wrap; overflow-wrap:anywhere; user-select:text; }\n.tbea-content.tbea-collapsed { display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical; overflow:hidden; }\n.tbea-text-button { display:inline-flex; align-items:center; justify-content:center; min-height:28px; padding:0 8px; border:0; border-radius:var(--dsw-radius-sm,8px); color:var(--tbea-muted); background:transparent; font-size:12px; line-height:18px; text-decoration:none; }\n.tbea-icon { display:inline-flex; align-items:center; justify-content:center; flex:none; width:28px; height:28px; padding:0; border:0; border-radius:var(--dsw-radius-sm,8px); color:var(--tbea-muted); background:transparent; text-decoration:none; }\n.tbea-icon svg { width:16px; height:16px; }\n.tbea-citation-actions { display:flex; flex-wrap:wrap; align-items:center; gap:4px; margin:6px -8px 0; }\n@media (hover:hover) {\n  .tbea-source-toggle:hover,.tbea-icon:hover:not(:disabled),.tbea-text-button:hover:not(:disabled),.tbea-selection-chip button:hover:not(:disabled) { background:var(--tbea-hover); color:var(--tbea-fg); }\n  .tbea-image-button:hover:not(:disabled) { border-color:var(--tbea-accent); }\n}\n.tbea-icon:active:not(:disabled),.tbea-text-button:active:not(:disabled),.tbea-source-toggle:active { background:var(--tbea-active); }\n\n.tbea-table-scroll { max-width:100%; max-height:360px; overflow:auto; overscroll-behavior:contain; margin:12px 0; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-sm,8px); }\n.tbea-table { min-width:100%; border-collapse:collapse; font-size:var(--dsh-content-font-size-secondary,13px); line-height:calc(22px + var(--dsh-content-font-delta-secondary,0px)); color:var(--tbea-fg); }\n.tbea-table th,.tbea-table td { min-width:90px; max-width:500px; padding:8px 12px; border:1px solid var(--tbea-border); text-align:left; vertical-align:top; white-space:pre-wrap; overflow-wrap:anywhere; }\n.tbea-table th { background:var(--tbea-soft); font-weight:500; }\n.tbea-gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; margin:12px 0; }\n.tbea-image { min-width:0; margin:0; }\n.tbea-image-button { display:grid; place-items:center; position:relative; overflow:hidden; width:100%; height:160px; padding:8px; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-sm,8px); background:var(--tbea-soft); color:var(--tbea-muted); }\n.tbea-image-button:not(:disabled) { cursor:zoom-in; }\n.tbea-image-button img { display:block; position:absolute; inset:8px; width:calc(100% - 16px); height:calc(100% - 16px); object-fit:contain; }\n.tbea-image figcaption { margin-top:4px; color:var(--tbea-subtle); font-size:12px; line-height:18px; overflow-wrap:anywhere; }\n.tbea-details { display:grid; grid-template-columns:72px minmax(0,1fr); gap:6px 8px; padding:12px; margin:8px 0; border-radius:var(--dsw-radius-sm,8px); background:var(--tbea-soft); font-size:12px; line-height:20px; }\n.tbea-details dt { color:var(--tbea-subtle); }\n.tbea-details dd { margin:0; overflow-wrap:anywhere; user-select:text; }\n.tbea-error { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 0; color:var(--tbea-danger); font-size:12px; line-height:20px; overflow-wrap:anywhere; }\n.tbea-status { display:flex; align-items:center; gap:6px; padding:8px 0; color:var(--tbea-subtle); font-size:var(--dsh-content-font-size-secondary,13px); }\n.tbea-empty { margin:12px 0; color:var(--tbea-muted); }\n.tbea-fallback { max-height:300px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; font-family:var(--ds-font-family-code,Consolas,monospace); }\n.tbea-sr-only { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }\n.tbea-spin { animation:tbea-spin 1s linear infinite; }\n@keyframes tbea-spin { to { transform:rotate(360deg); } }\n@media (prefers-reduced-motion:reduce) { .tbea-spin { animation-duration:2s; } }\n\n/* \u6807\u9898\u6362\u884C\u548C\u5B57\u4F53\u653E\u5927\u65F6\uFF0C\u7531\u5B9E\u9645\u9AD8\u5EA6\u5206\u914D\u56FE\u7247\u7A7A\u95F4\uFF0C\u4E0D\u5199\u6B7B\u51CF\u6CD5\u3002 */\n.tbea-image-modal { position:fixed; inset:var(--dsh-frame-chrome-top,0px) 0 0; width:min(1100px,calc(100vw - 32px)); max-width:calc(100vw - 32px); height:min(800px,calc(100dvh - var(--dsh-frame-chrome-top,0px) - 32px)); max-height:calc(100dvh - var(--dsh-frame-chrome-top,0px) - 32px); margin:auto; padding:0; overflow:hidden; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-lg,16px); background:var(--tbea-surface); }\n.tbea-image-modal[open] { display:flex; flex-direction:column; }\n.tbea-image-modal::backdrop { background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.5)); }\n.tbea-modal-head { display:flex; flex:none; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; min-height:48px; padding:8px 12px; border-bottom:1px solid var(--tbea-border); }\n.tbea-modal-head strong { flex:1 1 100px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:var(--dsh-content-font-size-secondary,13px); font-weight:500; }\n.tbea-modal-tools { display:flex; align-items:center; flex:none; gap:4px; }\n.tbea-zoom-label { min-width:40px; text-align:center; color:var(--tbea-subtle); font-size:12px; line-height:20px; font-variant-numeric:tabular-nums; }\n.tbea-modal-image { flex:1; min-height:0; width:100%; padding:16px; overflow:auto; overscroll-behavior:contain; background:var(--tbea-soft); }\n.tbea-modal-canvas { display:flex; align-items:center; justify-content:center; min-width:100%; min-height:100%; width:max-content; }\n.tbea-modal-image img { display:block; flex:none; height:auto; max-width:none; object-fit:contain; }\n@media(max-width:480px) {\n  .tbea-source-toggle { flex-wrap:wrap; }\n  .tbea-query { flex-basis:100%; order:1; padding-left:22px; }\n  .tbea-source-body { padding:0 10px; }\n  .tbea-modal-head strong { flex-basis:100%; }\n  .tbea-modal-tools { width:100%; justify-content:flex-end; }\n}\n.tbea-library {\n  --tbea-lib-fg: var(--dsw-alias-label-primary, #20242a);\n  --tbea-lib-muted: var(--dsw-alias-label-secondary, #61666b);\n  --tbea-lib-surface: var(--dsw-alias-bg-layer-1, #fff);\n  --tbea-lib-soft: var(--dsw-alias-markdown-code-block, #f7f8fa);\n  --tbea-lib-border: var(--dsw-alias-border-l2, #e3e6ea);\n  --tbea-lib-active: var(--dsw-alias-interactive-bg-active, #edf3ff);\n  --tbea-lib-hover: var(--dsw-alias-interactive-bg-hover, #f4f6f9);\n  --tbea-lib-accent: var(--dsw-alias-state-business-primary, #4176e6);\n  display: flex; flex-direction: column; min-width: 0; min-height: 0; flex: 1; height: 100%;\n  color: var(--tbea-lib-fg); background: var(--tbea-lib-surface); font-size: 13px;\n  container-type: inline-size;\n}\n[data-ds-dark-theme] .tbea-library {\n  --tbea-lib-fg: var(--dsw-alias-label-primary, #ededf1);\n  --tbea-lib-muted: var(--dsw-alias-label-secondary, #b4b7c2);\n  --tbea-lib-surface: var(--dsw-alias-bg-layer-1, #202128);\n  --tbea-lib-soft: var(--dsw-alias-markdown-code-block, #17181e);\n  --tbea-lib-border: var(--dsw-alias-border-l2, #3b3e49);\n  --tbea-lib-active: var(--dsw-alias-interactive-bg-active, #353e53);\n  --tbea-lib-hover: var(--dsw-alias-interactive-bg-hover, #2e303b);\n}\n.tbea-library h1,.tbea-library h2,.tbea-library p { margin: 0; }\n.tbea-library-title { display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:13px 18px;min-height:46px;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-library-title h1 { font-size:15px;font-weight:600; }\n.tbea-library-title span,.tbea-library-count { color:var(--tbea-lib-muted);font-size:12px; }\n.tbea-library-title span { margin-inline-start:auto; }\n.tbea-library-layout { display:grid;grid-template-columns:minmax(208px,27%) minmax(0,1fr);min-height:0;flex:1; }\n.tbea-library-list { min-width:0;min-height:0;overflow:auto;border-right:1px solid var(--tbea-lib-border); }\n.tbea-library-filters { display:grid;gap:9px;padding:13px 12px 9px;position:sticky;top:0;background:var(--tbea-lib-surface);z-index:1;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-library-field { display:grid;gap:5px;font-weight:600; }\n.tbea-library-field select,.tbea-library-search { color:var(--tbea-lib-fg);background:var(--tbea-lib-surface);border:1px solid var(--tbea-lib-border);border-radius:6px;min-width:0;min-height:32px; }\n.tbea-library-field select { width:100%;padding:3px 8px;font:inherit;font-weight:400; }\n@supports (appearance:base-select) and selector(select::picker(select)) {\n  .tbea-library-field select,.tbea-library-field select::picker(select) { appearance:base-select; }\n  .tbea-library-field select { align-items:center;gap:8px;padding:4px 10px;cursor:pointer; }\n  .tbea-library-field select::picker-icon { color:var(--tbea-lib-muted); }\n  .tbea-library-field select:open::picker-icon { rotate:180deg; }\n  .tbea-library-field select::picker(select) {\n    box-sizing:border-box;\n    inline-size:anchor-size(width);\n    min-inline-size:0;\n    max-block-size:min(280px,60dvh);\n    margin-block:4px;\n    padding:4px;\n    overflow-y:auto;\n    color:var(--tbea-lib-fg);\n    background:var(--tbea-lib-surface);\n    border:1px solid var(--tbea-lib-border);\n    border-radius:var(--dsw-radius-md,10px);\n    box-shadow:var(--dsw-elevation-panel,0 8px 24px rgba(0,0,0,.14));\n  }\n  .tbea-library-field option {\n    align-items:center;\n    gap:8px;\n    min-height:32px;\n    padding:6px 8px;\n    border-radius:var(--dsw-radius-sm,6px);\n    overflow-wrap:anywhere;\n    white-space:normal;\n    line-height:1.4;\n    cursor:pointer;\n  }\n  .tbea-library-field option:is(:hover,:focus-visible) { background:var(--tbea-lib-hover); }\n  .tbea-library-field option:checked { background:var(--tbea-lib-active);font-weight:600; }\n  .tbea-library-field option:focus-visible { outline:2px solid var(--tbea-lib-accent);outline-offset:-2px; }\n  .tbea-library-field option::checkmark { order:1;margin-inline-start:auto;color:var(--tbea-lib-accent); }\n}\n.tbea-library-description { color:var(--tbea-lib-muted);overflow-wrap:anywhere;max-height:5em;overflow:auto;font-size:12px;line-height:1.5; }\n.tbea-library-search { display:flex;gap:6px;align-items:center;padding:0 8px;color:var(--tbea-lib-muted); }\n.tbea-library-search input { color:var(--tbea-lib-fg);font:inherit;min-width:0;width:100%;min-height:28px;border:0;background:transparent; }\n.tbea-library-search input:focus { outline:none; }\n.tbea-library-search:focus-within,.tbea-library button:focus-visible,.tbea-library select:focus-visible,.tbea-library-pages:focus-visible { outline:2px solid var(--tbea-lib-accent);outline-offset:-2px; }\n.tbea-library-items { list-style:none;margin:0;padding:5px; }\n.tbea-library-items button { width:100%;text-align:left;display:flex;align-items:flex-start;gap:8px;padding:8px 7px;color:inherit;background:transparent;border:0;border-radius:6px;min-height:40px;cursor:pointer; }\n.tbea-library-items button svg { flex:none;margin-top:2px;color:var(--tbea-lib-muted); }\n.tbea-library-items button span { min-width:0; }\n.tbea-library-items button strong { display:block;font-size:13px;line-height:1.35;font-weight:500;overflow-wrap:anywhere; }\n.tbea-library-items button small { display:block;margin-top:3px;font-size:11px;color:var(--tbea-lib-muted); }\n.tbea-library-items button:hover,.tbea-library-button:hover { background:var(--tbea-lib-hover); }\n.tbea-library-items button[aria-current] { background:var(--tbea-lib-active); }\n.tbea-library-reader { display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--tbea-lib-surface); }\n.tbea-library-empty { align-items:center;justify-content:center;gap:8px;color:var(--tbea-lib-muted);text-align:center;padding:20px; }\n.tbea-library-reader-heading { display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-library-reader-heading div { min-width:0;flex:1; }\n.tbea-library-reader-heading h2 { font-size:14px;font-weight:600;overflow-wrap:anywhere;line-height:1.4; }\n.tbea-library-reader-heading p { color:var(--tbea-lib-muted);font-size:12px;line-height:1.5; }\n.tbea-preview-progress { padding:12px;color:var(--tbea-lib-muted); }\n.tbea-preview-progress div { display:flex;justify-content:space-between;gap:12px; }\n.tbea-preview-progress progress { display:block;width:100%;height:8px;margin-top:8px;accent-color:var(--tbea-lib-accent); }\n.tbea-library-text { flex:1;min-height:0;overflow:auto;padding:12px clamp(10px,3%,24px);line-height:1.6;overflow-wrap:anywhere; }\n.tbea-library-text pre { white-space:pre-wrap; }\n.tbea-library-text img { max-width:100%;height:auto; }\n.tbea-library-text table { border-collapse:collapse; }\n.tbea-library-pdf-page { display:block;width:100%;height:auto;background:#fff; }\n.tbea-library-state { display:flex;gap:7px;align-items:center;padding:11px 12px;color:var(--tbea-lib-muted);line-height:1.5;overflow-wrap:anywhere; }\n.tbea-library-state svg { flex:none; }\n.tbea-library-error { flex-wrap:wrap; }\n.tbea-library-button { min-height:30px;min-width:30px;display:inline-flex;align-items:center;justify-content:center;gap:5px;background:transparent;color:inherit;border:1px solid var(--tbea-lib-border);border-radius:6px;padding:0 6px;cursor:pointer;font:inherit;flex:none; }\n.tbea-library-pages { flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;background:var(--tbea-lib-soft);padding:14px clamp(7px,2.5cqw,24px); }\n.tbea-library-page { width:min(100%,960px);margin:0 auto 15px;text-align:center; }\n.tbea-library-page figcaption { padding-top:7px;font-size:11px;color:var(--tbea-lib-muted); }\n.tbea-library-sheet { display:grid;place-items:center;background:#fff;border:1px solid var(--tbea-lib-border);overflow:hidden;color:#24262d; }\n.tbea-library-sheet .tbea-library-state { color:#40444c; }\n.tbea-cited-documents { width:min(100%, 960px);margin-inline:auto;padding:12px clamp(10px,3%,24px);box-sizing:border-box;height:auto; }\n.tbea-cited-list { margin:0;padding:0;list-style:none; }\n.tbea-cited-row { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 16px;align-items:start;padding:10px 4px;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-cited-document p { padding-inline-start:24px;color:var(--tbea-lib-muted);font-size:12px;overflow-wrap:anywhere; }\n.tbea-cited-name { display:flex;align-items:flex-start;gap:8px;padding:4px 0;color:var(--tbea-lib-accent);background:none;border:0;text-align:start;font:inherit;font-weight:600;cursor:pointer;overflow-wrap:anywhere; }\n.tbea-cited-name:hover span { text-decoration:underline; }\n.tbea-cited-name svg { flex:none;margin-top:1px; }\n.tbea-cited-turns summary { list-style:none;user-select:none; }\n.tbea-cited-turns summary::-webkit-details-marker { display:none; }\n.tbea-cited-turns ul { list-style:none;display:grid;gap:4px;margin:5px 0 0;padding:0;max-height:160px;overflow:auto; }\n.tbea-cited-turns li button { width:100%; }\n.tbea-cited-preview { display:flex;flex-direction:column;block-size:min(68dvh, 900px);min-height:0;border:1px solid var(--tbea-lib-border);border-radius:8px;overflow:hidden; }\n.tbea-cited-preview .tbea-library-reader { flex:1; }\n.tbea-cited-status { display:inline-block;margin-inline-start:7px;padding:1px 5px;border-radius:5px;background:var(--tbea-lib-active);color:var(--tbea-lib-fg); }\n.tbea-citation-dialog { border:0;padding:0;border-radius:10px;width:min(900px,calc(100vw - 28px));height:min(760px,82dvh);overflow:hidden; }\n.tbea-citation-dialog::backdrop { background:rgba(0,0,0,.45); }\n.tbea-citation-dialog-header { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:10px 12px; }\n.tbea-citation-dialog-header h2 { flex:1 1 240px; margin:0; font-size:inherit; overflow-wrap:anywhere; }\n.tbea-citation-evidence { min-height:0; flex:1; overflow:auto; padding:0 12px 12px; }\n.tbea-citation-focused { border-inline-start:3px solid currentColor; }\n@container (max-width: 590px) {\n  .tbea-library-layout { grid-template-columns:minmax(0,1fr); }\n  .tbea-library-list { border-right:0; }\n  .tbea-library-empty,.tbea-library-has-selection .tbea-library-list { display:none; }\n}\n.tbea-sheet { min-width: 0; min-height: 0; display: flex; flex: 1; flex-direction: column; gap: 8px; padding: 0 12px 12px; }\n.tbea-sheet label, .tbea-sheet-rows { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n.tbea-sheet select { max-width: 100%; color: inherit; background: var(--tbea-surface, Canvas); font: inherit; }\n.tbea-sheet-scroll { overflow: auto; min-height: 0; max-height: 65vh; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); }\n.tbea-sheet table { border-collapse: separate; border-spacing: 0; font-size: 0.9em; }\n.tbea-sheet th, .tbea-sheet td { border-bottom: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-right: 1px solid color-mix(in srgb, currentColor 18%, transparent); padding: 4px 8px; }\n.tbea-sheet th { background: var(--tbea-surface, Canvas); }\n.tbea-sheet thead th { position: sticky; top: 0; z-index: 1; }\n.tbea-sheet td { min-width: 96px; max-width: 300px; overflow-wrap: anywhere; white-space: pre-wrap; }\n.tbea-sheet-rows button:disabled { opacity: .5; }\r\n";

// plugin/src/composer.mjs
function createSelectionClient(rpc) {
  const sessions = /* @__PURE__ */ new Map();
  function entry(id) {
    if (!sessions.has(id)) sessions.set(id, { value: { selected: false, loading: true, error: "" }, listeners: /* @__PURE__ */ new Set(), revision: 0 });
    return sessions.get(id);
  }
  function publish(row, patch) {
    row.value = { ...row.value, ...patch };
    for (const listener of row.listeners) listener();
  }
  async function refresh(id) {
    const row = entry(id);
    if (row.pending || row.refreshing) return;
    row.refreshing = true;
    const revision = row.revision;
    try {
      const value = await rpc("selection", { sessionId: id });
      if (revision === row.revision) publish(row, { ...value, loading: false, error: row.selectError || "" });
    } catch (error) {
      if (revision === row.revision) publish(row, { loading: false, error: error.message });
    } finally {
      row.refreshing = false;
    }
  }
  return {
    get: (id) => entry(id).value,
    subscribe(id, listener) {
      const row = entry(id);
      row.listeners.add(listener);
      if (row.listeners.size === 1) {
        void refresh(id);
        row.timer = setInterval(() => {
          void refresh(id);
        }, 800);
      }
      return () => {
        row.listeners.delete(listener);
        if (!row.listeners.size) clearInterval(row.timer);
      };
    },
    async select(id, selected) {
      const row = entry(id);
      if (row.pending) return;
      row.pending = true;
      row.revision++;
      row.selectError = "";
      publish(row, { pending: true, pendingAction: "select", error: "" });
      try {
        const value = await rpc("select", { sessionId: id, selected });
        publish(row, { ...value, loading: false, phase: "", message: "", error: "" });
      } catch (error) {
        row.selectError = `\u516C\u53F8\u77E5\u8BC6\u5E93\u5F00\u5173\u4FDD\u5B58\u5931\u8D25\uFF1A${error.message}`;
        publish(row, { loading: false, error: row.selectError });
      } finally {
        row.pending = false;
        publish(row, { pending: false, pendingAction: "" });
      }
    },
    async retry(id) {
      const row = entry(id);
      if (row.pending) return;
      row.pending = true;
      row.revision++;
      row.selectError = "";
      publish(row, { pending: true, pendingAction: "service", error: "" });
      try {
        const value = await rpc("service-retry", {});
        publish(row, { ...value, error: "", loading: false });
      } catch (error) {
        row.selectError = error.message;
        publish(row, { servicePhase: "error", error: error.message });
      } finally {
        row.pending = false;
        publish(row, { pending: false, pendingAction: "" });
      }
    }
  };
}
var prefetchDefinition = {
  kind: "tbea-knowledge-prefetch",
  target: "chat",
  match: (event) => event.type === "user/message" && event.data.source?.kind === "tbea-knowledge-prefetch" ? { id: String(event.data.id), role: "start", exclusive: true } : null,
  start: (_context, match) => match.event.data.source,
  update: (context) => context.state,
  buildViewNode(context) {
    const start = context.start ?? context.matches[0];
    if (!start || !context.state) return null;
    return {
      key: context.key,
      kind: "tbea-knowledge-prefetch",
      id: context.id,
      target: "chat",
      anchorSeq: start.event.seq,
      location: start.location,
      visibility: "visible",
      groupTree: "input",
      data: context.state
    };
  }
};
function registerKnowledgeEntries(ctx, store) {
  const name = "\u516C\u53F8\u77E5\u8BC6\u5E93";
  ctx.effect(() => ctx.commandUi.register({
    name,
    label: () => name,
    description: () => "\u5148\u68C0\u7D22\u5F53\u524D\u9879\u76EE\u53EF\u7528\u7684\u77E5\u8BC6\u5E93\uFF0C\u518D\u56DE\u7B54\u3002\u6301\u7EED\u5230\u624B\u52A8\u53D6\u6D88",
    available: () => true,
    ui: { kind: "action", run: (session) => {
      void store.select(session.sessionId, true);
    } }
  }), "tbea: company knowledge command");
}

// plugin/src/library-browser.tsx
var import_react5 = __toESM(require("react"), 1);

// plugin/src/display-transport.mjs
var displayPath = "/api/tbea-knowledge";

// plugin/src/library-browser.tsx
init_pdf_viewer();

// src/preview-messages.ts
var officeUnavailable = "\u5F53\u524D\u5320\u5B9D\u73AF\u5883\u672A\u63D0\u4F9B Word/PPT \u5185\u7F6E\u8F6C\u6362\uFF0C\u8BF7\u4F7F\u7528\u652F\u6301\u8BE5\u529F\u80FD\u7684\u5320\u5B9D\uFF0C\u6216\u8054\u7CFB\u7BA1\u7406\u5458\u914D\u7F6E\u8F6C\u6362\u7A0B\u5E8F";

// plugin/src/library-browser.tsx
var SpreadsheetViewer2 = (0, import_react5.lazy)(() => Promise.resolve().then(() => (init_spreadsheet_viewer(), spreadsheet_viewer_exports)).then((module2) => ({ default: module2.SpreadsheetViewer })));
var states = { disabled: "\u539F\u6587\u9884\u89C8\u672A\u542F\u7528", "converter-required": "\u5F85\u914D\u7F6E\u4E13\u7528\u8F6C\u6362\u7EC4\u4EF6", "office-unavailable": "\u5185\u7F6E Word/PPT \u8F6C\u6362\u4E0D\u53EF\u7528", unsupported: "\u5F53\u524D\u683C\u5F0F\u6682\u4E0D\u652F\u6301\u9884\u89C8" };
var statusLabels = { available: "\u53EF\u7528", enabled: "\u53EF\u7528", queuing: "\u6392\u961F\u4E2D", parsing: "\u89E3\u6790\u4E2D", indexing: "\u5904\u7406\u4E2D", parseError: "\u89E3\u6790\u5931\u8D25", error: "\u5904\u7406\u5931\u8D25", paused: "\u5DF2\u6682\u505C" };
function errorMessage(error) {
  return error instanceof Error ? error.message : "\u77E5\u8BC6\u5E93\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002";
}
function useLibraryRequest(bridge, action, args, key) {
  const [state, setState] = (0, import_react5.useState)();
  const [revision, setRevision] = (0, import_react5.useState)(0);
  (0, import_react5.useEffect)(() => {
    if (key === void 0) return;
    const controller = new AbortController();
    setState({ key, revision, loading: true });
    bridge(action, args, controller.signal).then((value) => {
      if (!controller.signal.aborted) setState({ key, revision, value });
    }, (error) => {
      if (!controller.signal.aborted) setState({ key, revision, error: errorMessage(error) });
    });
    return () => controller.abort();
  }, [bridge, action, key, revision]);
  return { ...state?.key === key && state?.revision === revision ? state : { loading: key !== void 0 }, retry: () => setRevision((value) => value + 1) };
}
function Wait({ children }) {
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-state", role: "status" }, /* @__PURE__ */ import_react5.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), children);
}
function Failure({ children, retry }) {
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-state tbea-library-error", role: "alert" }, /* @__PURE__ */ import_react5.default.createElement("span", null, children), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: retry }, /* @__PURE__ */ import_react5.default.createElement(RotateCcw, { size: 14 }), "\u91CD\u8BD5"));
}
function LibraryBrowser({ bridge, pdfAssetPath }) {
  const directory = useLibraryRequest(bridge, "library-catalog", {}, "catalog");
  const libraries = directory.value?.libraries ?? [];
  const [selection, setSelection] = (0, import_react5.useState)("");
  const active = libraries.find((entry) => entry.id === selection) ?? libraries[0];
  return /* @__PURE__ */ import_react5.default.createElement("section", { className: "tbea-library", "aria-label": "\u77E5\u8BC6\u5E93\u76EE\u5F55" }, /* @__PURE__ */ import_react5.default.createElement("header", { className: "tbea-library-title" }, /* @__PURE__ */ import_react5.default.createElement(BookOpen, { size: 18, "aria-hidden": "true" }), /* @__PURE__ */ import_react5.default.createElement("h1", null, "\u77E5\u8BC6\u5E93\u76EE\u5F55"), directory.value?.demo && /* @__PURE__ */ import_react5.default.createElement("span", null, "\u6F14\u793A")), directory.loading ? /* @__PURE__ */ import_react5.default.createElement(Wait, null, "\u6B63\u5728\u8BFB\u53D6\u77E5\u8BC6\u5E93\u2026") : directory.error ? /* @__PURE__ */ import_react5.default.createElement(Failure, { retry: directory.retry }, directory.error) : !active ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-state" }, "\u5F53\u524D\u9879\u76EE\u6CA1\u6709\u53EF\u67E5\u770B\u7684\u77E5\u8BC6\u5E93\u3002") : /* @__PURE__ */ import_react5.default.createElement(LibraryContents, { key: active.id, library: active, libraries, select: setSelection, bridge, pdfAssetPath }));
}
function LibraryContents({ library, libraries, select, bridge, pdfAssetPath }) {
  const [filter, setFilter] = (0, import_react5.useState)("");
  const [selected, setSelected] = (0, import_react5.useState)();
  const listing = useLibraryRequest(bridge, "library-documents", { libraryId: library.id }, library.id);
  const documents = listing.value?.documents ?? [];
  const visible = documents.filter((item) => item.name.toLowerCase().includes(filter.trim().toLowerCase()));
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: `tbea-library-layout${selected ? " tbea-library-has-selection" : ""}` }, /* @__PURE__ */ import_react5.default.createElement("aside", { className: "tbea-library-list", "aria-label": "\u77E5\u8BC6\u5E93\u6587\u6863" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-filters" }, /* @__PURE__ */ import_react5.default.createElement("label", { className: "tbea-library-field" }, /* @__PURE__ */ import_react5.default.createElement("span", null, "\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react5.default.createElement("select", { value: library.id, onChange: (event) => select(event.target.value) }, libraries.map((entry) => /* @__PURE__ */ import_react5.default.createElement("option", { key: entry.id, value: entry.id }, entry.name)))), library.description && /* @__PURE__ */ import_react5.default.createElement("p", { className: "tbea-library-description" }, library.description), /* @__PURE__ */ import_react5.default.createElement("label", { className: "tbea-library-search" }, /* @__PURE__ */ import_react5.default.createElement(Search, { size: 15, "aria-hidden": "true" }), /* @__PURE__ */ import_react5.default.createElement("input", { type: "search", value: filter, onChange: (event) => setFilter(event.target.value), placeholder: "\u641C\u7D22\u6587\u6863\u540D\u79F0", "aria-label": "\u641C\u7D22\u6587\u6863\u540D\u79F0" })), listing.value && /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-library-count" }, filter.trim() ? `\u627E\u5230 ${visible.length} \u4EFD\u6587\u6863` : `${documents.length} \u4EFD\u6587\u6863`)), listing.loading && /* @__PURE__ */ import_react5.default.createElement(Wait, null, "\u6B63\u5728\u8BFB\u53D6\u6587\u6863\u76EE\u5F55\u2026"), listing.error && /* @__PURE__ */ import_react5.default.createElement(Failure, { retry: listing.retry }, listing.error), listing.value && !listing.value.complete && /* @__PURE__ */ import_react5.default.createElement(Failure, { retry: listing.retry }, `\u5E73\u53F0\u76EE\u5F55\u672A\u53D6\u5168\uFF0C\u5DF2\u663E\u793A ${documents.length}${listing.value.total == null ? "" : `/${listing.value.total}`} \u4EFD\u6587\u6863\u3002`), listing.value && !visible.length && /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-state" }, filter.trim() ? "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u6587\u6863\u3002" : "\u5F53\u524D\u6CA1\u6709\u53EF\u663E\u793A\u7684\u6587\u6863\u3002"), /* @__PURE__ */ import_react5.default.createElement("ul", { className: "tbea-library-items" }, visible.map((item) => /* @__PURE__ */ import_react5.default.createElement("li", { key: item.id }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", "aria-current": selected?.id === item.id ? "true" : void 0, title: item.name, onClick: () => setSelected(item) }, /* @__PURE__ */ import_react5.default.createElement(FileText, { size: 16, "aria-hidden": "true" }), /* @__PURE__ */ import_react5.default.createElement("span", null, /* @__PURE__ */ import_react5.default.createElement("strong", null, item.name), /* @__PURE__ */ import_react5.default.createElement("small", null, [item.format?.toUpperCase() || "\u672A\u77E5\u683C\u5F0F", item.preview !== "available" ? states[item.preview] : void 0].filter(Boolean).join(" \xB7 ")))))))), selected ? /* @__PURE__ */ import_react5.default.createElement(DocumentReader, { key: selected.id, bridge, libraryId: library.id, documentInfo: selected, close: () => setSelected(void 0), pdfAssetPath }) : /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-reader tbea-library-empty" }, /* @__PURE__ */ import_react5.default.createElement(FileText, { size: 24, "aria-hidden": "true" }), "\u9009\u62E9\u4E00\u4EFD\u6587\u6863\u67E5\u770B\u57FA\u672C\u4FE1\u606F\u548C\u539F\u6587\u3002"));
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function DocumentReader({ bridge, libraryId, documentInfo, close, requestPreview, pdfAssetPath = displayPath.slice(1), backLabel = "\u8FD4\u56DE\u6587\u6863\u76EE\u5F55" }) {
  const { id, name, format, status, createdAt, bytes, preview } = documentInfo;
  const canOpen = requestPreview ?? preview === "available";
  const state = useLibraryRequest(bridge, "library-open", { libraryId, documentId: id }, canOpen ? JSON.stringify([libraryId, id]) : void 0);
  const opened = state.value;
  const [progress, setProgress] = (0, import_react5.useState)(null);
  (0, import_react5.useEffect)(() => {
    if (!state.loading) return;
    setProgress(null);
    const controller = new AbortController();
    let timer;
    const poll = async () => {
      try {
        const update = await bridge("library-preview-progress", { libraryId, documentId: id }, controller.signal);
        if (!controller.signal.aborted) setProgress(update);
      } catch {
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 400);
    };
    timer = setTimeout(poll, 150);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [bridge, libraryId, id, state.loading]);
  const progressLabel = {
    queued: "\u7B49\u5F85\u9884\u89C8\u8D44\u6E90\u2026",
    details: "\u6B63\u5728\u8BFB\u53D6\u6587\u6863\u8BE6\u60C5\u2026",
    downloading: "\u6B63\u5728\u4E0B\u8F7D\u539F\u4EF6\u2026",
    converting: "\u6B63\u5728\u8F6C\u6362\u6587\u6863\u2026",
    "preparing-text": "\u6B63\u5728\u6392\u7248\u539F\u6587\u2026"
  };
  const facts = [format?.toUpperCase(), bytes != null ? formatSize(bytes) : void 0, createdAt ? new Date(createdAt).toLocaleDateString("zh-CN") : void 0, status ? statusLabels[status] ?? status : void 0].filter(Boolean);
  return /* @__PURE__ */ import_react5.default.createElement("article", { className: "tbea-library-reader", "aria-label": "\u539F\u6587\u9884\u89C8" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-reader-heading" }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "tbea-library-button", "aria-label": backLabel, onClick: close }, /* @__PURE__ */ import_react5.default.createElement(ArrowLeft, { size: 16 })), /* @__PURE__ */ import_react5.default.createElement("div", null, /* @__PURE__ */ import_react5.default.createElement("h2", null, name), facts.length > 0 && /* @__PURE__ */ import_react5.default.createElement("p", null, facts.join(" \xB7 ")))), state.loading && /* @__PURE__ */ import_react5.default.createElement(
    PreviewMeter,
    {
      key: progress?.phase,
      label: progress ? progressLabel[progress.phase] : "\u6B63\u5728\u51C6\u5907\u539F\u6587\u9884\u89C8\u2026",
      elapsedMs: progress?.elapsedMs,
      received: progress?.received,
      total: progress?.total
    }
  ), state.error && /* @__PURE__ */ import_react5.default.createElement(Failure, { retry: state.retry }, state.error), preview && preview !== "available" && /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-library-state" }, preview === "office-unavailable" ? officeUnavailable : states[preview], "\u3002"), opened && (opened.pdfBytes ? /* @__PURE__ */ import_react5.default.createElement(PdfViewer, { key: opened.previewId, bridge, previewId: opened.previewId, bytes: opened.pdfBytes, assetPath: pdfAssetPath, restart: state.retry }) : opened.sheetBytes && opened.sheetFormat ? /* @__PURE__ */ import_react5.default.createElement(import_react5.Suspense, { fallback: /* @__PURE__ */ import_react5.default.createElement(PreviewMeter, { label: "\u6B63\u5728\u8BFB\u53D6\u5DE5\u4F5C\u8868\u2026" }) }, /* @__PURE__ */ import_react5.default.createElement(SpreadsheetViewer2, { key: opened.previewId, bridge, previewId: opened.previewId, bytes: opened.sheetBytes, format: opened.sheetFormat, assetPath: pdfAssetPath, restart: state.retry })) : opened.html !== void 0 && /* @__PURE__ */ import_react5.default.createElement(TextPreview, { key: opened.previewId, bridge, previewId: opened.previewId, html: opened.html })));
}
function TextPreview({ bridge, previewId, html }) {
  const started = (0, import_react5.useRef)(performance.now());
  (0, import_react5.useEffect)(() => {
    const frame = requestAnimationFrame(() => {
      void bridge("library-preview-result", { previewId, status: "ready", elapsedMs: Math.round(performance.now() - started.current) }, AbortSignal.timeout(5e3)).catch(() => {
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [bridge, previewId]);
  return /* @__PURE__ */ import_react5.default.createElement("div", { "aria-label": "\u6587\u672C\u539F\u6587\u9884\u89C8", className: "tbea-library-text", tabIndex: 0, dangerouslySetInnerHTML: { __html: html } });
}

// plugin/src/cited-documents-view.tsx
var import_react6 = __toESM(require("react"), 1);

// plugin/src/cited-documents.ts
init_contracts();

// node_modules/mdast-util-to-string/lib/index.js
var emptyOptions = {};
function toString(value, options) {
  const settings = options || emptyOptions;
  const includeImageAlt = typeof settings.includeImageAlt === "boolean" ? settings.includeImageAlt : true;
  const includeHtml = typeof settings.includeHtml === "boolean" ? settings.includeHtml : true;
  return one(value, includeImageAlt, includeHtml);
}
function one(value, includeImageAlt, includeHtml) {
  if (node(value)) {
    if ("value" in value) {
      return value.type === "html" && !includeHtml ? "" : value.value;
    }
    if (includeImageAlt && "alt" in value && value.alt) {
      return value.alt;
    }
    if ("children" in value) {
      return all(value.children, includeImageAlt, includeHtml);
    }
  }
  if (Array.isArray(value)) {
    return all(value, includeImageAlt, includeHtml);
  }
  return "";
}
function all(values, includeImageAlt, includeHtml) {
  const result = [];
  let index2 = -1;
  while (++index2 < values.length) {
    result[index2] = one(values[index2], includeImageAlt, includeHtml);
  }
  return result.join("");
}
function node(value) {
  return Boolean(value && typeof value === "object");
}

// node_modules/decode-named-character-reference/index.dom.js
var element = document.createElement("i");
function decodeNamedCharacterReference(value) {
  const characterReference2 = "&" + value + ";";
  element.innerHTML = characterReference2;
  const character = element.textContent;
  if (character.charCodeAt(character.length - 1) === 59 && value !== "semi") {
    return false;
  }
  return character === characterReference2 ? false : character;
}

// node_modules/micromark-util-chunked/index.js
function splice(list2, start, remove, items) {
  const end = list2.length;
  let chunkStart = 0;
  let parameters;
  if (start < 0) {
    start = -start > end ? 0 : end + start;
  } else {
    start = start > end ? end : start;
  }
  remove = remove > 0 ? remove : 0;
  if (items.length < 1e4) {
    parameters = Array.from(items);
    parameters.unshift(start, remove);
    list2.splice(...parameters);
  } else {
    if (remove) list2.splice(start, remove);
    while (chunkStart < items.length) {
      parameters = items.slice(chunkStart, chunkStart + 1e4);
      parameters.unshift(start, 0);
      list2.splice(...parameters);
      chunkStart += 1e4;
      start += 1e4;
    }
  }
}
function push(list2, items) {
  if (list2.length > 0) {
    splice(list2, list2.length, 0, items);
    return list2;
  }
  return items;
}

// node_modules/micromark-util-combine-extensions/index.js
var hasOwnProperty = {}.hasOwnProperty;
function combineExtensions(extensions) {
  const all2 = {};
  let index2 = -1;
  while (++index2 < extensions.length) {
    syntaxExtension(all2, extensions[index2]);
  }
  return all2;
}
function syntaxExtension(all2, extension2) {
  let hook;
  for (hook in extension2) {
    const maybe = hasOwnProperty.call(all2, hook) ? all2[hook] : void 0;
    const left = maybe || (all2[hook] = {});
    const right = extension2[hook];
    let code;
    if (right) {
      for (code in right) {
        if (!hasOwnProperty.call(left, code)) left[code] = [];
        const value = right[code];
        constructs(
          // @ts-expect-error Looks like a list.
          left[code],
          Array.isArray(value) ? value : value ? [value] : []
        );
      }
    }
  }
}
function constructs(existing, list2) {
  let index2 = -1;
  const before = [];
  while (++index2 < list2.length) {
    ;
    (list2[index2].add === "after" ? existing : before).push(list2[index2]);
  }
  splice(existing, 0, 0, before);
}

// node_modules/micromark-util-decode-numeric-character-reference/index.js
function decodeNumericCharacterReference(value, base) {
  const code = Number.parseInt(value, base);
  if (
    // C0 except for HT, LF, FF, CR, space.
    code < 9 || code === 11 || code > 13 && code < 32 || // Control character (DEL) of C0, and C1 controls.
    code > 126 && code < 160 || // Lone high surrogates and low surrogates.
    code > 55295 && code < 57344 || // Noncharacters.
    code > 64975 && code < 65008 || /* eslint-disable no-bitwise */
    (code & 65535) === 65535 || (code & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    code > 1114111
  ) {
    return "\uFFFD";
  }
  return String.fromCodePoint(code);
}

// node_modules/micromark-util-normalize-identifier/index.js
function normalizeIdentifier(value) {
  return value.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}

// node_modules/micromark-util-character/index.js
var asciiAlpha = regexCheck(/[A-Za-z]/);
var asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
var asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
function asciiControl(code) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    code !== null && (code < 32 || code === 127)
  );
}
var asciiDigit = regexCheck(/\d/);
var asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
var asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
function markdownLineEnding(code) {
  return code !== null && code < -2;
}
function markdownLineEndingOrSpace(code) {
  return code !== null && (code < 0 || code === 32);
}
function markdownSpace(code) {
  return code === -2 || code === -1 || code === 32;
}
var unicodePunctuation = regexCheck(new RegExp("\\p{P}|\\p{S}", "u"));
var unicodeWhitespace = regexCheck(/\s/);
function regexCheck(regex) {
  return check;
  function check(code) {
    return code !== null && code > -1 && regex.test(String.fromCharCode(code));
  }
}

// node_modules/micromark-factory-space/index.js
function factorySpace(effects, ok, type, max) {
  const limit = max ? max - 1 : Infinity;
  let size = 0;
  return start;
  function start(code) {
    if (markdownSpace(code)) {
      effects.enter(type);
      return prefix(code);
    }
    return ok(code);
  }
  function prefix(code) {
    if (markdownSpace(code) && size++ < limit) {
      effects.consume(code);
      return prefix;
    }
    effects.exit(type);
    return ok(code);
  }
}
function factorySpaceMinMax(effects, ok, nok, type, min, max) {
  let size = 0;
  return start;
  function start(code) {
    if (max > 0 && markdownSpace(code)) {
      effects.enter(type);
      return prefix(code);
    }
    return after(code);
  }
  function prefix(code) {
    if (markdownSpace(code) && size < max) {
      effects.consume(code);
      size++;
      return prefix;
    }
    effects.exit(type);
    return after(code);
  }
  function after(code) {
    return size >= min ? ok(code) : nok(code);
  }
}

// node_modules/micromark/lib/initialize/content.js
var content = {
  tokenize: initializeContent
};
function initializeContent(effects) {
  const contentStart = effects.attempt(this.parser.constructs.contentInitial, afterContentStartConstruct, paragraphInitial);
  let previous2;
  return contentStart;
  function afterContentStartConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, contentStart, "linePrefix");
  }
  function paragraphInitial(code) {
    effects.enter("paragraph");
    return lineStart(code);
  }
  function lineStart(code) {
    const token = effects.enter("chunkText", {
      contentType: "text",
      previous: previous2
    });
    if (previous2) {
      previous2.next = token;
    }
    previous2 = token;
    return data(code);
  }
  function data(code) {
    if (code === null) {
      effects.exit("chunkText");
      effects.exit("paragraph");
      effects.consume(code);
      return;
    }
    if (markdownLineEnding(code)) {
      effects.consume(code);
      effects.exit("chunkText");
      return lineStart;
    }
    effects.consume(code);
    return data;
  }
}

// node_modules/micromark-util-edit-map/index.js
var EditMap = class {
  /**
   * Create a new edit map.
   *
   * @returns
   *   New instance.
   */
  constructor() {
    this.index = /* @__PURE__ */ new Map();
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   *   Index at which to apply the edit.
   * @param {number} remove
   *   Count of items to remove at the index.
   * @param {Array<Event>} add
   *   Items to add at the index.
   * @returns {undefined}
   *   Nothing.
   */
  add(index2, remove, add) {
    addImplementation(this, index2, remove, add, false);
  }
  /**
   * Create an edit: but insert `add` before existing additions, instead of
   * after them.
   *
   * @param {number} index
   *   Index at which to apply the edit.
   * @param {number} remove
   *   Count of items to remove at the index.
   * @param {Array<Event>} add
   *   Items to add at the index.
   * @returns {undefined}
   *   Nothing.
   */
  addBefore(index2, remove, add) {
    addImplementation(this, index2, remove, add, true);
  }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   *   List of events to apply the edits to.
   * @returns {undefined}
   *   Nothing.
   */
  consume(events) {
    this.map.sort(function(a, b) {
      return a[0] - b[0];
    });
    if (this.map.length === 0) {
      return;
    }
    let index2 = this.map.length;
    const vecs = [];
    while (index2 > 0) {
      index2 -= 1;
      vecs.push(events.slice(this.map[index2][0] + this.map[index2][1]), this.map[index2][2]);
      events.length = this.map[index2][0];
    }
    vecs.push(events.slice());
    events.length = 0;
    let slice = vecs.pop();
    while (slice) {
      for (const element2 of slice) {
        events.push(element2);
      }
      slice = vecs.pop();
    }
    this.map.length = 0;
    this.index.clear();
  }
};
function addImplementation(editMap, at, remove, add, before) {
  if (remove === 0 && add.length === 0) {
    return;
  }
  const existing = editMap.index.get(at);
  if (existing) {
    existing[1] += remove;
    if (before) {
      add.push(...existing[2]);
      existing[2] = add;
    } else {
      existing[2].push(...add);
    }
    return;
  }
  const change = [at, remove, add];
  editMap.map.push(change);
  editMap.index.set(at, change);
}

// node_modules/micromark/lib/initialize/document.js
var document2 = {
  tokenize: initializeDocument
};
var containerConstruct = {
  tokenize: tokenizeContainer
};
function initializeDocument(effects) {
  const self = this;
  const stack = [];
  let continued = 0;
  let childFlow;
  let childToken;
  let lineStartOffset;
  return start;
  function start(code) {
    if (continued < stack.length) {
      const item = stack[continued];
      self.containerState = item[1];
      return effects.attempt(item[0].continuation, documentContinue, checkNewContainers)(code);
    }
    return checkNewContainers(code);
  }
  function documentContinue(code) {
    continued++;
    if (self.containerState._closeFlow) {
      self.containerState._closeFlow = void 0;
      if (childFlow) {
        closeFlow();
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          point3 = self.events[indexBeforeFlow][1].end;
          break;
        }
      }
      exitContainers(continued);
      let index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      const editMap = new EditMap();
      editMap.add(indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      editMap.add(indexBeforeExits, index2 - indexBeforeExits, []);
      editMap.consume(self.events);
      return checkNewContainers(code);
    }
    return start(code);
  }
  function checkNewContainers(code) {
    if (continued === stack.length) {
      if (!childFlow) {
        return documentContinued(code);
      }
      if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) {
        return flowStart(code);
      }
      self.interrupt = Boolean(childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack);
    }
    self.containerState = {};
    return effects.check(containerConstruct, thereIsANewContainer, thereIsNoNewContainer)(code);
  }
  function thereIsANewContainer(code) {
    if (childFlow) {
      closeFlow();
    }
    exitContainers(continued);
    return documentContinued(code);
  }
  function thereIsNoNewContainer(code) {
    self.parser.lazy[self.now().line] = continued !== stack.length;
    lineStartOffset = self.now().offset;
    return flowStart(code);
  }
  function documentContinued(code) {
    self.containerState = {};
    return effects.attempt(containerConstruct, containerContinue, flowStart)(code);
  }
  function containerContinue(code) {
    continued++;
    stack.push([self.currentConstruct, self.containerState]);
    return documentContinued(code);
  }
  function flowStart(code) {
    if (code === null) {
      if (childFlow) {
        closeFlow();
      }
      exitContainers(0);
      effects.consume(code);
      return;
    }
    childFlow = childFlow || self.parser.flow(self.now());
    effects.enter("chunkFlow", {
      _tokenizer: childFlow,
      contentType: "flow",
      previous: childToken
    });
    return flowContinue(code);
  }
  function flowContinue(code) {
    if (code === null) {
      writeToChild(effects.exit("chunkFlow"), true);
      exitContainers(0);
      effects.consume(code);
      return;
    }
    if (markdownLineEnding(code)) {
      effects.consume(code);
      writeToChild(effects.exit("chunkFlow"));
      continued = 0;
      self.interrupt = void 0;
      return start;
    }
    effects.consume(code);
    return flowContinue;
  }
  function writeToChild(token, endOfFile) {
    const stream = self.sliceStream(token);
    if (endOfFile) {
      stream.push(null);
    }
    token.previous = childToken;
    if (childToken) {
      childToken.next = token;
    }
    childToken = token;
    childFlow.defineSkip(token.start);
    childFlow.write(stream);
    if (self.parser.lazy[token.start.line]) {
      let index2 = childFlow.events.length;
      while (index2--) {
        if (
          // The token starts before the line ending…
          childFlow.events[index2][1].start.offset < lineStartOffset && // …and either is not ended yet…
          (!childFlow.events[index2][1].end || // …or ends after it.
          childFlow.events[index2][1].end.offset > lineStartOffset)
        ) {
          return;
        }
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let seen;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          if (seen) {
            point3 = self.events[indexBeforeFlow][1].end;
            break;
          }
          seen = true;
        }
      }
      exitContainers(continued);
      index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      const editMap = new EditMap();
      editMap.add(indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      editMap.add(indexBeforeExits, index2 - indexBeforeExits, []);
      editMap.consume(self.events);
    }
  }
  function exitContainers(size) {
    let index2 = stack.length;
    while (index2-- > size) {
      const entry = stack[index2];
      self.containerState = entry[1];
      entry[0].exit.call(self, effects);
    }
    stack.length = size;
  }
  function closeFlow() {
    childFlow.write([null]);
    childToken = void 0;
    childFlow = void 0;
    self.containerState._closeFlow = void 0;
  }
}
function tokenizeContainer(effects, ok, nok) {
  return factorySpace(effects, effects.attempt(this.parser.constructs.document, ok, nok), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}

// node_modules/micromark-util-classify-character/index.js
function classifyCharacter(code) {
  if (code === null || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
    return 1;
  }
  if (unicodePunctuation(code)) {
    return 2;
  }
}

// node_modules/micromark-util-resolve-all/index.js
function resolveAll(constructs2, events, context) {
  const called = [];
  let index2 = -1;
  while (++index2 < constructs2.length) {
    const resolve = constructs2[index2].resolveAll;
    if (resolve && !called.includes(resolve)) {
      events = resolve(events, context);
      called.push(resolve);
    }
  }
  return events;
}

// node_modules/micromark-core-commonmark/lib/attention.js
var attention = {
  name: "attention",
  resolveAll: resolveAllAttention,
  tokenize: tokenizeAttention
};
function resolveAllAttention(events, context) {
  let index2 = -1;
  let nextEvents;
  while (++index2 < events.length) {
    if (events[index2][0] === "enter" && events[index2][1].type === "attentionSequence" && events[index2][1]._close) {
      let open = index2;
      while (open--) {
        if (events[open][0] === "exit" && events[open][1].type === "attentionSequence" && events[open][1]._open && // If the markers are the same:
        context.sliceSerialize(events[open][1]).charCodeAt(0) === context.sliceSerialize(events[index2][1]).charCodeAt(0)) {
          if ((events[open][1]._close || events[index2][1]._open) && (events[index2][1].end.offset - events[index2][1].start.offset) % 3 && !((events[open][1].end.offset - events[open][1].start.offset + events[index2][1].end.offset - events[index2][1].start.offset) % 3)) {
            continue;
          }
          const use = events[open][1].end.offset - events[open][1].start.offset > 1 && events[index2][1].end.offset - events[index2][1].start.offset > 1 ? 2 : 1;
          const start = {
            ...events[open][1].end
          };
          const end = {
            ...events[index2][1].start
          };
          movePoint(start, -use);
          movePoint(end, use);
          const openingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start,
            end: {
              ...events[open][1].end
            }
          };
          const closingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...events[index2][1].start
            },
            end
          };
          const text3 = {
            type: use > 1 ? "strongText" : "emphasisText",
            start: {
              ...events[open][1].end
            },
            end: {
              ...events[index2][1].start
            }
          };
          const group = {
            type: use > 1 ? "strong" : "emphasis",
            start: {
              ...openingSequence.start
            },
            end: {
              ...closingSequence.end
            }
          };
          events[open][1].end = {
            ...openingSequence.start
          };
          events[index2][1].start = {
            ...closingSequence.end
          };
          nextEvents = [];
          if (events[open][1].end.offset - events[open][1].start.offset) {
            nextEvents = push(nextEvents, [["enter", events[open][1], context], ["exit", events[open][1], context]]);
          }
          nextEvents = push(nextEvents, [["enter", group, context], ["enter", openingSequence, context], ["exit", openingSequence, context], ["enter", text3, context]]);
          nextEvents = push(nextEvents, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + 1, index2), context));
          nextEvents = push(nextEvents, [["exit", text3, context], ["enter", closingSequence, context], ["exit", closingSequence, context], ["exit", group, context]]);
          let offset = 0;
          if (events[index2][1].end.offset - events[index2][1].start.offset) {
            offset = 2;
            nextEvents = push(nextEvents, [["enter", events[index2][1], context], ["exit", events[index2][1], context]]);
          }
          splice(events, open - 1, index2 - open + 3, nextEvents);
          index2 = open + nextEvents.length - offset - 2;
          break;
        }
      }
    }
  }
  index2 = -1;
  while (++index2 < events.length) {
    if (events[index2][1].type === "attentionSequence") {
      events[index2][1].type = "data";
    }
  }
  return events;
}
function tokenizeAttention(effects, ok) {
  const attentionMarkers2 = this.parser.constructs.attentionMarkers.null;
  const previous2 = this.previous;
  const before = classifyCharacter(previous2);
  let marker;
  return start;
  function start(code) {
    marker = code;
    effects.enter("attentionSequence");
    return inside(code);
  }
  function inside(code) {
    if (code === marker) {
      effects.consume(code);
      return inside;
    }
    const token = effects.exit("attentionSequence");
    const after = classifyCharacter(code);
    const open = !after || after === 2 && before || attentionMarkers2.includes(code) && code !== 42 && code !== 95;
    const close = !before || before === 2 && after || attentionMarkers2.includes(previous2) && previous2 !== 42 && previous2 !== 95;
    token._open = Boolean(marker === 42 ? open : open && (before || !close));
    token._close = Boolean(marker === 42 ? close : close && (after || !open));
    return ok(code);
  }
}
function movePoint(point3, offset) {
  point3.column += offset;
  point3.offset += offset;
  point3._bufferIndex += offset;
}

// node_modules/micromark-core-commonmark/lib/autolink.js
var autolink = {
  name: "autolink",
  tokenize: tokenizeAutolink
};
function tokenizeAutolink(effects, ok, nok) {
  let size = 0;
  return start;
  function start(code) {
    effects.enter("autolink");
    effects.enter("autolinkMarker");
    effects.consume(code);
    effects.exit("autolinkMarker");
    effects.enter("autolinkProtocol");
    return open;
  }
  function open(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return schemeOrEmailAtext;
    }
    if (code === 64) {
      return nok(code);
    }
    return emailAtext(code);
  }
  function schemeOrEmailAtext(code) {
    if (code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) {
      size = 1;
      return schemeInsideOrEmailAtext(code);
    }
    return emailAtext(code);
  }
  function schemeInsideOrEmailAtext(code) {
    if (code === 58) {
      effects.consume(code);
      size = 0;
      return urlInside;
    }
    if ((code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) && size++ < 32) {
      effects.consume(code);
      return schemeInsideOrEmailAtext;
    }
    size = 0;
    return emailAtext(code);
  }
  function urlInside(code) {
    if (code === 62) {
      effects.exit("autolinkProtocol");
      effects.enter("autolinkMarker");
      effects.consume(code);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok;
    }
    if (code === null || code === 32 || code === 60 || asciiControl(code)) {
      return nok(code);
    }
    effects.consume(code);
    return urlInside;
  }
  function emailAtext(code) {
    if (code === 64) {
      effects.consume(code);
      return emailAtSignOrDot;
    }
    if (asciiAtext(code)) {
      effects.consume(code);
      return emailAtext;
    }
    return nok(code);
  }
  function emailAtSignOrDot(code) {
    return asciiAlphanumeric(code) ? emailLabel(code) : nok(code);
  }
  function emailLabel(code) {
    if (code === 46) {
      effects.consume(code);
      size = 0;
      return emailAtSignOrDot;
    }
    if (code === 62) {
      effects.exit("autolinkProtocol").type = "autolinkEmail";
      effects.enter("autolinkMarker");
      effects.consume(code);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok;
    }
    return emailValue(code);
  }
  function emailValue(code) {
    if ((code === 45 || asciiAlphanumeric(code)) && size++ < 63) {
      const next = code === 45 ? emailValue : emailLabel;
      effects.consume(code);
      return next;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/blank-line.js
var blankLine = {
  partial: true,
  tokenize: tokenizeBlankLine
};
function tokenizeBlankLine(effects, ok, nok) {
  return start;
  function start(code) {
    return markdownSpace(code) ? factorySpace(effects, after, "linePrefix")(code) : after(code);
  }
  function after(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/block-quote.js
var blockQuote = {
  continuation: {
    tokenize: tokenizeBlockQuoteContinuation
  },
  exit,
  name: "blockQuote",
  tokenize: tokenizeBlockQuoteStart
};
function tokenizeBlockQuoteStart(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (code === 62) {
      const state = self.containerState;
      if (!state.open) {
        effects.enter("blockQuote", {
          _container: true
        });
        state.open = true;
      }
      effects.enter("blockQuotePrefix");
      effects.enter("blockQuoteMarker");
      effects.consume(code);
      effects.exit("blockQuoteMarker");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    if (markdownSpace(code)) {
      effects.enter("blockQuotePrefixWhitespace");
      effects.consume(code);
      effects.exit("blockQuotePrefixWhitespace");
      effects.exit("blockQuotePrefix");
      return ok;
    }
    effects.exit("blockQuotePrefix");
    return ok(code);
  }
}
function tokenizeBlockQuoteContinuation(effects, ok, nok) {
  const self = this;
  return contStart;
  function contStart(code) {
    if (markdownSpace(code)) {
      return factorySpace(effects, contBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
    }
    return contBefore(code);
  }
  function contBefore(code) {
    return effects.attempt(blockQuote, ok, nok)(code);
  }
}
function exit(effects) {
  effects.exit("blockQuote");
}

// node_modules/micromark-core-commonmark/lib/character-escape.js
var characterEscape = {
  name: "characterEscape",
  tokenize: tokenizeCharacterEscape
};
function tokenizeCharacterEscape(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("characterEscape");
    effects.enter("escapeMarker");
    effects.consume(code);
    effects.exit("escapeMarker");
    return inside;
  }
  function inside(code) {
    if (asciiPunctuation(code)) {
      effects.enter("characterEscapeValue");
      effects.consume(code);
      effects.exit("characterEscapeValue");
      effects.exit("characterEscape");
      return ok;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/character-reference.js
var characterReference = {
  name: "characterReference",
  tokenize: tokenizeCharacterReference
};
function tokenizeCharacterReference(effects, ok, nok) {
  const self = this;
  let size = 0;
  let max;
  let test;
  return start;
  function start(code) {
    effects.enter("characterReference");
    effects.enter("characterReferenceMarker");
    effects.consume(code);
    effects.exit("characterReferenceMarker");
    return open;
  }
  function open(code) {
    if (code === 35) {
      effects.enter("characterReferenceMarkerNumeric");
      effects.consume(code);
      effects.exit("characterReferenceMarkerNumeric");
      return numeric;
    }
    effects.enter("characterReferenceValue");
    max = 31;
    test = asciiAlphanumeric;
    return value(code);
  }
  function numeric(code) {
    if (code === 88 || code === 120) {
      effects.enter("characterReferenceMarkerHexadecimal");
      effects.consume(code);
      effects.exit("characterReferenceMarkerHexadecimal");
      effects.enter("characterReferenceValue");
      max = 6;
      test = asciiHexDigit;
      return value;
    }
    effects.enter("characterReferenceValue");
    max = 7;
    test = asciiDigit;
    return value(code);
  }
  function value(code) {
    if (code === 59 && size) {
      const token = effects.exit("characterReferenceValue");
      if (test === asciiAlphanumeric && !decodeNamedCharacterReference(self.sliceSerialize(token))) {
        return nok(code);
      }
      effects.enter("characterReferenceMarker");
      effects.consume(code);
      effects.exit("characterReferenceMarker");
      effects.exit("characterReference");
      return ok;
    }
    if (test(code) && size++ < max) {
      effects.consume(code);
      return value;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/partial-non-lazy-continuation.js
var nonLazyContinuation = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation
};
function tokenizeNonLazyContinuation(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (code === null) {
      return nok(code);
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return after;
  }
  function after(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-fenced.js
var codeFenced = {
  concrete: true,
  name: "codeFenced",
  tokenize: tokenizeCodeFenced
};
function tokenizeCodeFenced(effects, ok, nok) {
  const self = this;
  const closeStart = {
    partial: true,
    tokenize: tokenizeCloseStart
  };
  let initialPrefix = 0;
  let sizeOpen = 0;
  let marker;
  return start;
  function start(code) {
    return beforeSequenceOpen(code);
  }
  function beforeSequenceOpen(code) {
    const tail = self.events[self.events.length - 1];
    initialPrefix = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
    marker = code;
    effects.enter("codeFenced");
    effects.enter("codeFencedFence");
    effects.enter("codeFencedFenceSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === marker) {
      sizeOpen++;
      effects.consume(code);
      return sequenceOpen;
    }
    if (sizeOpen < 3) {
      return nok(code);
    }
    effects.exit("codeFencedFenceSequence");
    return markdownSpace(code) ? factorySpace(effects, infoBefore, "whitespace")(code) : infoBefore(code);
  }
  function infoBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFencedFence");
      return self.interrupt ? ok(code) : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
    }
    effects.enter("codeFencedFenceInfo");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return info(code);
  }
  function info(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return infoBefore(code);
    }
    if (markdownSpace(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return factorySpace(effects, metaBefore, "whitespace")(code);
    }
    if (code === 96 && code === marker) {
      return nok(code);
    }
    effects.consume(code);
    return info;
  }
  function metaBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      return infoBefore(code);
    }
    effects.enter("codeFencedFenceMeta");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return meta(code);
  }
  function meta(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceMeta");
      return infoBefore(code);
    }
    if (code === 96 && code === marker) {
      return nok(code);
    }
    effects.consume(code);
    return meta;
  }
  function atNonLazyBreak(code) {
    return effects.attempt(closeStart, after, contentBefore)(code);
  }
  function contentBefore(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return contentStart;
  }
  function contentStart(code) {
    return initialPrefix > 0 && markdownSpace(code) ? factorySpace(effects, beforeContentChunk, "linePrefix", initialPrefix + 1)(code) : beforeContentChunk(code);
  }
  function beforeContentChunk(code) {
    if (code === null || markdownLineEnding(code)) {
      return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
    }
    effects.enter("codeFlowValue");
    return contentChunk(code);
  }
  function contentChunk(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFlowValue");
      return beforeContentChunk(code);
    }
    effects.consume(code);
    return contentChunk;
  }
  function after(code) {
    effects.exit("codeFenced");
    return ok(code);
  }
  function tokenizeCloseStart(effects2, ok2, nok2) {
    let size = 0;
    return startBefore;
    function startBefore(code) {
      effects2.enter("lineEnding");
      effects2.consume(code);
      effects2.exit("lineEnding");
      return start2;
    }
    function start2(code) {
      effects2.enter("codeFencedFence");
      return markdownSpace(code) ? factorySpace(effects2, beforeSequenceClose, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : beforeSequenceClose(code);
    }
    function beforeSequenceClose(code) {
      if (code === marker) {
        effects2.enter("codeFencedFenceSequence");
        return sequenceClose(code);
      }
      return nok2(code);
    }
    function sequenceClose(code) {
      if (code === marker) {
        size++;
        effects2.consume(code);
        return sequenceClose;
      }
      if (size >= sizeOpen) {
        effects2.exit("codeFencedFenceSequence");
        return markdownSpace(code) ? factorySpace(effects2, sequenceCloseAfter, "whitespace")(code) : sequenceCloseAfter(code);
      }
      return nok2(code);
    }
    function sequenceCloseAfter(code) {
      if (code === null || markdownLineEnding(code)) {
        effects2.exit("codeFencedFence");
        return ok2(code);
      }
      return nok2(code);
    }
  }
}

// node_modules/micromark-core-commonmark/lib/code-indented.js
var codeIndented = {
  name: "codeIndented",
  tokenize: tokenizeCodeIndented
};
var furtherStart = {
  partial: true,
  tokenize: tokenizeFurtherStart
};
function tokenizeCodeIndented(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("codeIndented");
    return factorySpaceMinMax(effects, atBreak, nok, "linePrefix", 4, 4)(code);
  }
  function atBreak(code) {
    if (code === null) {
      return after(code);
    }
    if (markdownLineEnding(code)) {
      return effects.attempt(furtherStart, atBreak, after)(code);
    }
    effects.enter("codeFlowValue");
    return inside(code);
  }
  function inside(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFlowValue");
      return atBreak(code);
    }
    effects.consume(code);
    return inside;
  }
  function after(code) {
    effects.exit("codeIndented");
    return ok(code);
  }
}
function tokenizeFurtherStart(effects, ok, nok) {
  const self = this;
  return furtherStart2;
  function furtherStart2(code) {
    if (self.parser.lazy[self.now().line]) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return furtherStart2;
    }
    return factorySpaceMinMax(effects, ok, onNotEnoughPrefix, "linePrefix", 4, 4)(code);
  }
  function onNotEnoughPrefix(code) {
    return markdownLineEnding(code) ? furtherStart2(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-text.js
var codeText = {
  name: "codeText",
  previous,
  resolve: resolveCodeText,
  tokenize: tokenizeCodeText
};
function resolveCodeText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index2;
  let enter;
  if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
    index2 = headEnterIndex;
    while (++index2 < tailExitIndex) {
      if (events[index2][1].type === "codeTextData") {
        events[headEnterIndex][1].type = "codeTextPadding";
        events[tailExitIndex][1].type = "codeTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }
  index2 = headEnterIndex - 1;
  tailExitIndex++;
  while (++index2 <= tailExitIndex) {
    if (enter === void 0) {
      if (index2 !== tailExitIndex && events[index2][1].type !== "lineEnding") {
        enter = index2;
      }
    } else if (index2 === tailExitIndex || events[index2][1].type === "lineEnding") {
      events[enter][1].type = "codeTextData";
      if (index2 !== enter + 2) {
        events[enter][1].end = events[index2 - 1][1].end;
        events.splice(enter + 2, index2 - enter - 2);
        tailExitIndex -= index2 - enter - 2;
        index2 = enter + 2;
      }
      enter = void 0;
    }
  }
  return events;
}
function previous(code) {
  return code !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function tokenizeCodeText(effects, ok, nok) {
  const self = this;
  let sizeOpen = 0;
  let size;
  let token;
  return start;
  function start(code) {
    effects.enter("codeText");
    effects.enter("codeTextSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === 96) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen;
    }
    effects.exit("codeTextSequence");
    return between(code);
  }
  function between(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 32) {
      effects.enter("space");
      effects.consume(code);
      effects.exit("space");
      return between;
    }
    if (code === 96) {
      token = effects.enter("codeTextSequence");
      size = 0;
      return sequenceClose(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return between;
    }
    effects.enter("codeTextData");
    return data(code);
  }
  function data(code) {
    if (code === null || code === 32 || code === 96 || markdownLineEnding(code)) {
      effects.exit("codeTextData");
      return between(code);
    }
    effects.consume(code);
    return data;
  }
  function sequenceClose(code) {
    if (code === 96) {
      effects.consume(code);
      size++;
      return sequenceClose;
    }
    if (size === sizeOpen) {
      effects.exit("codeTextSequence");
      effects.exit("codeText");
      return ok(code);
    }
    token.type = "codeTextData";
    return data(code);
  }
}

// node_modules/micromark-util-subtokenize/lib/splice-buffer.js
var SpliceBuffer = class {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(initial) {
    this.left = initial ? [...initial] : [];
    this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(index2) {
    if (index2 < 0 || index2 >= this.left.length + this.right.length) {
      throw new RangeError("Cannot access index `" + index2 + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    }
    if (index2 < this.left.length) return this.left[index2];
    return this.right[this.right.length - index2 + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    this.setCursor(0);
    return this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(start, end) {
    const stop = end === null || end === void 0 ? Number.POSITIVE_INFINITY : end;
    if (stop < this.left.length) {
      return this.left.slice(start, stop);
    }
    if (start > this.left.length) {
      return this.right.slice(this.right.length - stop + this.left.length, this.right.length - start + this.left.length).reverse();
    }
    return this.left.slice(start).concat(this.right.slice(this.right.length - stop + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(start, deleteCount, items) {
    const count = deleteCount || 0;
    this.setCursor(Math.trunc(start));
    const removed = this.right.splice(this.right.length - count, Number.POSITIVE_INFINITY);
    if (items) chunkedPush(this.left, items);
    return removed.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    this.setCursor(Number.POSITIVE_INFINITY);
    return this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(item) {
    this.setCursor(Number.POSITIVE_INFINITY);
    this.left.push(item);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(items) {
    this.setCursor(Number.POSITIVE_INFINITY);
    chunkedPush(this.left, items);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(item) {
    this.setCursor(0);
    this.right.push(item);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(items) {
    this.setCursor(0);
    chunkedPush(this.right, items.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(n) {
    if (n === this.left.length || n > this.left.length && this.right.length === 0 || n < 0 && this.left.length === 0) return;
    if (n < this.left.length) {
      const removed = this.left.splice(n, Number.POSITIVE_INFINITY);
      chunkedPush(this.right, removed.reverse());
    } else {
      const removed = this.right.splice(this.left.length + this.right.length - n, Number.POSITIVE_INFINITY);
      chunkedPush(this.left, removed.reverse());
    }
  }
};
function chunkedPush(list2, right) {
  let chunkStart = 0;
  if (right.length < 1e4) {
    list2.push(...right);
  } else {
    while (chunkStart < right.length) {
      list2.push(...right.slice(chunkStart, chunkStart + 1e4));
      chunkStart += 1e4;
    }
  }
}

// node_modules/micromark-util-subtokenize/index.js
function subtokenize(eventsArray) {
  const jumps = {};
  let index2 = -1;
  let event;
  let lineIndex;
  let otherIndex;
  let otherEvent;
  let parameters;
  let subevents;
  let more;
  const events = new SpliceBuffer(eventsArray);
  while (++index2 < events.length) {
    while (index2 in jumps) {
      index2 = jumps[index2];
    }
    event = events.get(index2);
    if (index2 && event[1].type === "chunkFlow" && events.get(index2 - 1)[1].type === "listItemPrefix") {
      subevents = event[1]._tokenizer.events;
      otherIndex = 0;
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "lineEndingBlank") {
        otherIndex += 2;
      }
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "content") {
        while (++otherIndex < subevents.length) {
          if (subevents[otherIndex][1].type === "content") {
            break;
          }
          if (subevents[otherIndex][1].type === "chunkText") {
            subevents[otherIndex][1]._isInFirstContentOfListItem = true;
            otherIndex++;
          }
        }
      }
    }
    if (event[0] === "enter") {
      if (event[1].contentType) {
        Object.assign(jumps, subcontent(events, index2));
        index2 = jumps[index2];
        more = true;
      }
    } else if (event[1]._container) {
      otherIndex = index2;
      lineIndex = void 0;
      while (otherIndex--) {
        otherEvent = events.get(otherIndex);
        if (otherEvent[1].type === "lineEnding" || otherEvent[1].type === "lineEndingBlank") {
          if (otherEvent[0] === "enter") {
            if (lineIndex) {
              events.get(lineIndex)[1].type = "lineEndingBlank";
            }
            otherEvent[1].type = "lineEnding";
            lineIndex = otherIndex;
          }
        } else if (otherEvent[1].type === "linePrefix" || otherEvent[1].type === "listItemIndent") {
        } else {
          break;
        }
      }
      if (lineIndex) {
        event[1].end = {
          ...events.get(lineIndex)[1].start
        };
        parameters = events.slice(lineIndex, index2);
        parameters.unshift(event);
        events.splice(lineIndex, index2 - lineIndex + 1, parameters);
      }
    }
  }
  splice(eventsArray, 0, Number.POSITIVE_INFINITY, events.slice(0));
  return !more;
}
function subcontent(events, eventIndex) {
  const token = events.get(eventIndex)[1];
  const context = events.get(eventIndex)[2];
  let startPosition = eventIndex - 1;
  const startPositions = [];
  let tokenizer = token._tokenizer;
  if (!tokenizer) {
    tokenizer = context.parser[token.contentType](token.start);
    if (token._contentTypeTextTrailing) {
      tokenizer._contentTypeTextTrailing = true;
    }
  }
  const childEvents = tokenizer.events;
  const jumps = [];
  const gaps = {};
  let stream;
  let previous2;
  let index2 = -1;
  let current = token;
  let adjust = 0;
  let start = 0;
  const breaks = [start];
  while (current) {
    while (events.get(++startPosition)[1] !== current) {
    }
    startPositions.push(startPosition);
    if (!current._tokenizer) {
      stream = context.sliceStream(current);
      if (!current.next) {
        stream.push(null);
      }
      if (previous2) {
        tokenizer.defineSkip(current.start);
      }
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = true;
      }
      tokenizer.write(stream);
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = void 0;
      }
    }
    previous2 = current;
    current = current.next;
  }
  current = token;
  while (++index2 < childEvents.length) {
    if (
      // Find a void token that includes a break.
      childEvents[index2][0] === "exit" && childEvents[index2 - 1][0] === "enter" && childEvents[index2][1].type === childEvents[index2 - 1][1].type && childEvents[index2][1].start.line !== childEvents[index2][1].end.line
    ) {
      start = index2 + 1;
      breaks.push(start);
      current._tokenizer = void 0;
      current.previous = void 0;
      current = current.next;
    }
  }
  tokenizer.events = [];
  if (current) {
    current._tokenizer = void 0;
    current.previous = void 0;
  } else {
    breaks.pop();
  }
  index2 = breaks.length;
  while (index2--) {
    const slice = childEvents.slice(breaks[index2], breaks[index2 + 1]);
    const start2 = startPositions.pop();
    jumps.push([start2, start2 + slice.length - 1]);
    events.splice(start2, 2, slice);
  }
  jumps.reverse();
  index2 = -1;
  while (++index2 < jumps.length) {
    gaps[adjust + jumps[index2][0]] = adjust + jumps[index2][1];
    adjust += jumps[index2][1] - jumps[index2][0] - 1;
  }
  return gaps;
}

// node_modules/micromark-core-commonmark/lib/content.js
var content2 = {
  resolve: resolveContent,
  tokenize: tokenizeContent
};
var continuationConstruct = {
  partial: true,
  tokenize: tokenizeContinuation
};
function resolveContent(events) {
  subtokenize(events);
  return events;
}
function tokenizeContent(effects, ok) {
  let previous2;
  return chunkStart;
  function chunkStart(code) {
    effects.enter("content");
    previous2 = effects.enter("chunkContent", {
      contentType: "content"
    });
    return chunkInside(code);
  }
  function chunkInside(code) {
    if (code === null) {
      return contentEnd(code);
    }
    if (markdownLineEnding(code)) {
      return effects.check(continuationConstruct, contentContinue, contentEnd)(code);
    }
    effects.consume(code);
    return chunkInside;
  }
  function contentEnd(code) {
    effects.exit("chunkContent");
    effects.exit("content");
    return ok(code);
  }
  function contentContinue(code) {
    effects.consume(code);
    effects.exit("chunkContent");
    previous2.next = effects.enter("chunkContent", {
      contentType: "content",
      previous: previous2
    });
    previous2 = previous2.next;
    return chunkInside;
  }
}
function tokenizeContinuation(effects, ok, nok) {
  const self = this;
  return startLookahead;
  function startLookahead(code) {
    effects.exit("chunkContent");
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, prefixed, "linePrefix");
  }
  function prefixed(code) {
    if (code === null || markdownLineEnding(code)) {
      return nok(code);
    }
    const tail = self.events[self.events.length - 1];
    if (!self.parser.constructs.disable.null.includes("codeIndented") && tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4) {
      return ok(code);
    }
    return effects.interrupt(self.parser.constructs.flow, nok, ok)(code);
  }
}

// node_modules/micromark-factory-destination/index.js
function factoryDestination(effects, ok, nok, type, literalType, literalMarkerType, rawType, stringType, max) {
  const limit = max || Number.POSITIVE_INFINITY;
  let balance = 0;
  return start;
  function start(code) {
    if (code === 60) {
      effects.enter(type);
      effects.enter(literalType);
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      return enclosedBefore;
    }
    if (code === null || code === 32 || code === 41 || asciiControl(code)) {
      return nok(code);
    }
    effects.enter(type);
    effects.enter(rawType);
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return raw(code);
  }
  function enclosedBefore(code) {
    if (code === 62) {
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      effects.exit(literalType);
      effects.exit(type);
      return ok;
    }
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return enclosed(code);
  }
  function enclosed(code) {
    if (code === 62) {
      effects.exit("chunkString");
      effects.exit(stringType);
      return enclosedBefore(code);
    }
    if (code === null || code === 60 || markdownLineEnding(code)) {
      return nok(code);
    }
    effects.consume(code);
    return code === 92 ? enclosedEscape : enclosed;
  }
  function enclosedEscape(code) {
    if (code === 60 || code === 62 || code === 92) {
      effects.consume(code);
      return enclosed;
    }
    return enclosed(code);
  }
  function raw(code) {
    if (!balance && (code === null || code === 41 || markdownLineEndingOrSpace(code))) {
      effects.exit("chunkString");
      effects.exit(stringType);
      effects.exit(rawType);
      effects.exit(type);
      return ok(code);
    }
    if (balance < limit && code === 40) {
      effects.consume(code);
      balance++;
      return raw;
    }
    if (code === 41) {
      effects.consume(code);
      balance--;
      return raw;
    }
    if (code === null || code === 32 || code === 40 || asciiControl(code)) {
      return nok(code);
    }
    effects.consume(code);
    return code === 92 ? rawEscape : raw;
  }
  function rawEscape(code) {
    if (code === 40 || code === 41 || code === 92) {
      effects.consume(code);
      return raw;
    }
    return raw(code);
  }
}

// node_modules/micromark-factory-label/index.js
function factoryLabel(effects, ok, nok, type, markerType, stringType) {
  const self = this;
  let size = 0;
  let seen;
  return start;
  function start(code) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code);
    effects.exit(markerType);
    effects.enter(stringType);
    return atBreak;
  }
  function atBreak(code) {
    if (size > 999 || code === null || code === 91 || code === 93 && !seen || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    code === 94 && !size && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code);
    }
    if (code === 93) {
      effects.exit(stringType);
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok;
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return atBreak;
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return labelInside(code);
  }
  function labelInside(code) {
    if (code === null || code === 91 || code === 93 || markdownLineEnding(code) || size++ > 999) {
      effects.exit("chunkString");
      return atBreak(code);
    }
    effects.consume(code);
    if (!seen) seen = !markdownSpace(code);
    return code === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code) {
    if (code === 91 || code === 92 || code === 93) {
      effects.consume(code);
      size++;
      return labelInside;
    }
    return labelInside(code);
  }
}

// node_modules/micromark-factory-title/index.js
function factoryTitle(effects, ok, nok, type, markerType, stringType) {
  let marker;
  return start;
  function start(code) {
    if (code === 34 || code === 39 || code === 40) {
      effects.enter(type);
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      marker = code === 40 ? 41 : code;
      return begin;
    }
    return nok(code);
  }
  function begin(code) {
    if (code === marker) {
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok;
    }
    effects.enter(stringType);
    return atBreak(code);
  }
  function atBreak(code) {
    if (code === marker) {
      effects.exit(stringType);
      return begin(marker);
    }
    if (code === null) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return factorySpace(effects, atBreak, "linePrefix");
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return inside(code);
  }
  function inside(code) {
    if (code === marker || code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      return atBreak(code);
    }
    effects.consume(code);
    return code === 92 ? escape : inside;
  }
  function escape(code) {
    if (code === marker || code === 92) {
      effects.consume(code);
      return inside;
    }
    return inside(code);
  }
}

// node_modules/micromark-factory-whitespace/index.js
function factoryWhitespace(effects, ok) {
  let seen;
  return start;
  function start(code) {
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      seen = true;
      return start;
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code);
    }
    return ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/definition.js
var definition = {
  name: "definition",
  tokenize: tokenizeDefinition
};
var titleBefore = {
  partial: true,
  tokenize: tokenizeTitleBefore
};
function tokenizeDefinition(effects, ok, nok) {
  const self = this;
  let identifier;
  return start;
  function start(code) {
    effects.enter("definition");
    return before(code);
  }
  function before(code) {
    return factoryLabel.call(
      self,
      effects,
      labelAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(code);
  }
  function labelAfter(code) {
    identifier = normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1));
    if (code === 58) {
      effects.enter("definitionMarker");
      effects.consume(code);
      effects.exit("definitionMarker");
      return markerAfter;
    }
    return nok(code);
  }
  function markerAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, destinationBefore)(code) : destinationBefore(code);
  }
  function destinationBefore(code) {
    return factoryDestination(
      effects,
      destinationAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(code);
  }
  function destinationAfter(code) {
    return effects.attempt(titleBefore, after, after)(code);
  }
  function after(code) {
    return markdownSpace(code) ? factorySpace(effects, afterWhitespace, "whitespace")(code) : afterWhitespace(code);
  }
  function afterWhitespace(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("definition");
      self.parser.defined.push(identifier);
      return ok(code);
    }
    return nok(code);
  }
}
function tokenizeTitleBefore(effects, ok, nok) {
  return titleBefore2;
  function titleBefore2(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, beforeMarker)(code) : nok(code);
  }
  function beforeMarker(code) {
    return factoryTitle(effects, titleAfter, nok, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(code);
  }
  function titleAfter(code) {
    return markdownSpace(code) ? factorySpace(effects, titleAfterOptionalWhitespace, "whitespace")(code) : titleAfterOptionalWhitespace(code);
  }
  function titleAfterOptionalWhitespace(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/hard-break-escape.js
var hardBreakEscape = {
  name: "hardBreakEscape",
  tokenize: tokenizeHardBreakEscape
};
function tokenizeHardBreakEscape(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("hardBreakEscape");
    effects.consume(code);
    return after;
  }
  function after(code) {
    if (markdownLineEnding(code)) {
      effects.exit("hardBreakEscape");
      return ok(code);
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/heading-atx.js
var headingAtx = {
  name: "headingAtx",
  resolve: resolveHeadingAtx,
  tokenize: tokenizeHeadingAtx
};
function resolveHeadingAtx(events, context) {
  let contentEnd = events.length - 2;
  let contentStart = 3;
  if (events[contentStart][1].type === "whitespace") {
    contentStart += 2;
  }
  if (contentEnd - 2 > contentStart && events[contentEnd][1].type === "whitespace") {
    contentEnd -= 2;
  }
  if (events[contentEnd][1].type === "atxHeadingSequence" && (contentStart === contentEnd - 1 || contentEnd - 4 > contentStart && events[contentEnd - 2][1].type === "whitespace")) {
    contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
  }
  if (contentEnd > contentStart) {
    const content3 = {
      type: "atxHeadingText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end
    };
    const text3 = {
      type: "chunkText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end,
      contentType: "text"
    };
    splice(events, contentStart, contentEnd - contentStart + 1, [["enter", content3, context], ["enter", text3, context], ["exit", text3, context], ["exit", content3, context]]);
  }
  return events;
}
function tokenizeHeadingAtx(effects, ok, nok) {
  let size = 0;
  return start;
  function start(code) {
    effects.enter("atxHeading");
    return before(code);
  }
  function before(code) {
    effects.enter("atxHeadingSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === 35 && size++ < 6) {
      effects.consume(code);
      return sequenceOpen;
    }
    if (code === null || markdownLineEndingOrSpace(code)) {
      effects.exit("atxHeadingSequence");
      return atBreak(code);
    }
    return nok(code);
  }
  function atBreak(code) {
    if (code === 35) {
      effects.enter("atxHeadingSequence");
      return sequenceFurther(code);
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit("atxHeading");
      return ok(code);
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, atBreak, "whitespace")(code);
    }
    effects.enter("atxHeadingText");
    return data(code);
  }
  function sequenceFurther(code) {
    if (code === 35) {
      effects.consume(code);
      return sequenceFurther;
    }
    effects.exit("atxHeadingSequence");
    return atBreak(code);
  }
  function data(code) {
    if (code === null || code === 35 || markdownLineEndingOrSpace(code)) {
      effects.exit("atxHeadingText");
      return atBreak(code);
    }
    effects.consume(code);
    return data;
  }
}

// node_modules/micromark-util-html-tag-name/index.js
var htmlBlockNames = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
];
var htmlRawNames = ["pre", "script", "style", "textarea"];

// node_modules/micromark-core-commonmark/lib/html-flow.js
var htmlFlow = {
  concrete: true,
  name: "htmlFlow",
  resolveTo: resolveToHtmlFlow,
  tokenize: tokenizeHtmlFlow
};
var blankLineBefore = {
  partial: true,
  tokenize: tokenizeBlankLineBefore
};
function resolveToHtmlFlow(events) {
  let index2 = events.length;
  while (index2--) {
    if (events[index2][0] === "enter" && events[index2][1].type === "htmlFlow") {
      break;
    }
  }
  if (index2 > 1 && events[index2 - 2][1].type === "linePrefix") {
    events[index2][1].start = events[index2 - 2][1].start;
    events[index2 + 1][1].start = events[index2 - 2][1].start;
    events.splice(index2 - 2, 2);
  }
  return events;
}
function tokenizeHtmlFlow(effects, ok, nok) {
  const self = this;
  let marker;
  let closingTag;
  let buffer;
  let index2;
  let markerB;
  return start;
  function start(code) {
    return before(code);
  }
  function before(code) {
    effects.enter("htmlFlow");
    effects.enter("htmlFlowData");
    effects.consume(code);
    return open;
  }
  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationOpen;
    }
    if (code === 47) {
      effects.consume(code);
      closingTag = true;
      return tagCloseStart;
    }
    if (code === 63) {
      effects.consume(code);
      marker = 3;
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function declarationOpen(code) {
    if (code === 45) {
      effects.consume(code);
      marker = 2;
      return commentOpenInside;
    }
    if (code === 91) {
      effects.consume(code);
      marker = 5;
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      marker = 4;
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    return nok(code);
  }
  function commentOpenInside(code) {
    if (code === 45) {
      effects.consume(code);
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    return nok(code);
  }
  function cdataOpenInside(code) {
    const value = "CDATA[";
    if (code === value.charCodeAt(index2++)) {
      effects.consume(code);
      if (index2 === value.length) {
        return self.interrupt ? ok : continuation;
      }
      return cdataOpenInside;
    }
    return nok(code);
  }
  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function tagName(code) {
    if (code === null || code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      const slash = code === 47;
      const name = buffer.toLowerCase();
      if (!slash && !closingTag && htmlRawNames.includes(name)) {
        marker = 1;
        return self.interrupt ? ok(code) : continuation(code);
      }
      if (htmlBlockNames.includes(buffer.toLowerCase())) {
        marker = 6;
        if (slash) {
          effects.consume(code);
          return basicSelfClosing;
        }
        return self.interrupt ? ok(code) : continuation(code);
      }
      marker = 7;
      return self.interrupt && !self.parser.lazy[self.now().line] ? nok(code) : closingTag ? completeClosingTagAfter(code) : completeAttributeNameBefore(code);
    }
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function basicSelfClosing(code) {
    if (code === 62) {
      effects.consume(code);
      return self.interrupt ? ok : continuation;
    }
    return nok(code);
  }
  function completeClosingTagAfter(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeClosingTagAfter;
    }
    return completeEnd(code);
  }
  function completeAttributeNameBefore(code) {
    if (code === 47) {
      effects.consume(code);
      return completeEnd;
    }
    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return completeAttributeName;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameBefore;
    }
    return completeEnd(code);
  }
  function completeAttributeName(code) {
    if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return completeAttributeName;
    }
    return completeAttributeNameAfter(code);
  }
  function completeAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return completeAttributeValueBefore;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameAfter;
    }
    return completeAttributeNameBefore(code);
  }
  function completeAttributeValueBefore(code) {
    if (code === null || code === 60 || code === 61 || code === 62 || code === 96) {
      return nok(code);
    }
    if (code === 34 || code === 39) {
      effects.consume(code);
      markerB = code;
      return completeAttributeValueQuoted;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeValueBefore;
    }
    return completeAttributeValueUnquoted(code);
  }
  function completeAttributeValueQuoted(code) {
    if (code === markerB) {
      effects.consume(code);
      markerB = null;
      return completeAttributeValueQuotedAfter;
    }
    if (code === null || markdownLineEnding(code)) {
      return nok(code);
    }
    effects.consume(code);
    return completeAttributeValueQuoted;
  }
  function completeAttributeValueUnquoted(code) {
    if (code === null || code === 34 || code === 39 || code === 47 || code === 60 || code === 61 || code === 62 || code === 96 || markdownLineEndingOrSpace(code)) {
      return completeAttributeNameAfter(code);
    }
    effects.consume(code);
    return completeAttributeValueUnquoted;
  }
  function completeAttributeValueQuotedAfter(code) {
    if (code === 47 || code === 62 || markdownSpace(code)) {
      return completeAttributeNameBefore(code);
    }
    return nok(code);
  }
  function completeEnd(code) {
    if (code === 62) {
      effects.consume(code);
      return completeAfter;
    }
    return nok(code);
  }
  function completeAfter(code) {
    if (code === null || markdownLineEnding(code)) {
      return continuation(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAfter;
    }
    return nok(code);
  }
  function continuation(code) {
    if (code === 45 && marker === 2) {
      effects.consume(code);
      return continuationCommentInside;
    }
    if (code === 60 && marker === 1) {
      effects.consume(code);
      return continuationRawTagOpen;
    }
    if (code === 62 && marker === 4) {
      effects.consume(code);
      return continuationClose;
    }
    if (code === 63 && marker === 3) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    if (code === 93 && marker === 5) {
      effects.consume(code);
      return continuationCdataInside;
    }
    if (markdownLineEnding(code) && (marker === 6 || marker === 7)) {
      effects.exit("htmlFlowData");
      return effects.check(blankLineBefore, continuationAfter, continuationStart)(code);
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit("htmlFlowData");
      return continuationStart(code);
    }
    effects.consume(code);
    return continuation;
  }
  function continuationStart(code) {
    return effects.check(nonLazyContinuation, continuationStartNonLazy, continuationAfter)(code);
  }
  function continuationStartNonLazy(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return continuationBefore;
  }
  function continuationBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      return continuationStart(code);
    }
    effects.enter("htmlFlowData");
    return continuation(code);
  }
  function continuationCommentInside(code) {
    if (code === 45) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationRawTagOpen(code) {
    if (code === 47) {
      effects.consume(code);
      buffer = "";
      return continuationRawEndTag;
    }
    return continuation(code);
  }
  function continuationRawEndTag(code) {
    if (code === 62) {
      const name = buffer.toLowerCase();
      if (htmlRawNames.includes(name)) {
        effects.consume(code);
        return continuationClose;
      }
      return continuation(code);
    }
    if (asciiAlpha(code) && buffer.length < 8) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return continuationRawEndTag;
    }
    return continuation(code);
  }
  function continuationCdataInside(code) {
    if (code === 93) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationDeclarationInside(code) {
    if (code === 62) {
      effects.consume(code);
      return continuationClose;
    }
    if (code === 45 && marker === 2) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationClose(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("htmlFlowData");
      return continuationAfter(code);
    }
    effects.consume(code);
    return continuationClose;
  }
  function continuationAfter(code) {
    effects.exit("htmlFlow");
    return ok(code);
  }
}
function tokenizeBlankLineBefore(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return effects.attempt(blankLine, ok, nok);
  }
}

// node_modules/micromark-core-commonmark/lib/html-text.js
var htmlText = {
  name: "htmlText",
  tokenize: tokenizeHtmlText
};
function tokenizeHtmlText(effects, ok, nok) {
  const self = this;
  let marker;
  let index2;
  let returnState;
  return start;
  function start(code) {
    effects.enter("htmlText");
    effects.enter("htmlTextData");
    effects.consume(code);
    return open;
  }
  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationOpen;
    }
    if (code === 47) {
      effects.consume(code);
      return tagCloseStart;
    }
    if (code === 63) {
      effects.consume(code);
      return instruction;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagOpen;
    }
    return nok(code);
  }
  function declarationOpen(code) {
    if (code === 45) {
      effects.consume(code);
      return commentOpenInside;
    }
    if (code === 91) {
      effects.consume(code);
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      return declaration;
    }
    return nok(code);
  }
  function commentOpenInside(code) {
    if (code === 45) {
      effects.consume(code);
      return commentEnd;
    }
    return nok(code);
  }
  function comment(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 45) {
      effects.consume(code);
      return commentClose;
    }
    if (markdownLineEnding(code)) {
      returnState = comment;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return comment;
  }
  function commentClose(code) {
    if (code === 45) {
      effects.consume(code);
      return commentEnd;
    }
    return comment(code);
  }
  function commentEnd(code) {
    return code === 62 ? end(code) : code === 45 ? commentClose(code) : comment(code);
  }
  function cdataOpenInside(code) {
    const value = "CDATA[";
    if (code === value.charCodeAt(index2++)) {
      effects.consume(code);
      return index2 === value.length ? cdata : cdataOpenInside;
    }
    return nok(code);
  }
  function cdata(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 93) {
      effects.consume(code);
      return cdataClose;
    }
    if (markdownLineEnding(code)) {
      returnState = cdata;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return cdata;
  }
  function cdataClose(code) {
    if (code === 93) {
      effects.consume(code);
      return cdataEnd;
    }
    return cdata(code);
  }
  function cdataEnd(code) {
    if (code === 62) {
      return end(code);
    }
    if (code === 93) {
      effects.consume(code);
      return cdataEnd;
    }
    return cdata(code);
  }
  function declaration(code) {
    if (code === null || code === 62) {
      return end(code);
    }
    if (markdownLineEnding(code)) {
      returnState = declaration;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return declaration;
  }
  function instruction(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 63) {
      effects.consume(code);
      return instructionClose;
    }
    if (markdownLineEnding(code)) {
      returnState = instruction;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return instruction;
  }
  function instructionClose(code) {
    return code === 62 ? end(code) : instruction(code);
  }
  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagClose;
    }
    return nok(code);
  }
  function tagClose(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagClose;
    }
    return tagCloseBetween(code);
  }
  function tagCloseBetween(code) {
    if (markdownLineEnding(code)) {
      returnState = tagCloseBetween;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagCloseBetween;
    }
    return end(code);
  }
  function tagOpen(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagOpen;
    }
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    return nok(code);
  }
  function tagOpenBetween(code) {
    if (code === 47) {
      effects.consume(code);
      return end;
    }
    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return tagOpenAttributeName;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenBetween;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenBetween;
    }
    return end(code);
  }
  function tagOpenAttributeName(code) {
    if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagOpenAttributeName;
    }
    return tagOpenAttributeNameAfter(code);
  }
  function tagOpenAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return tagOpenAttributeValueBefore;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeNameAfter;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeNameAfter;
    }
    return tagOpenBetween(code);
  }
  function tagOpenAttributeValueBefore(code) {
    if (code === null || code === 60 || code === 61 || code === 62 || code === 96) {
      return nok(code);
    }
    if (code === 34 || code === 39) {
      effects.consume(code);
      marker = code;
      return tagOpenAttributeValueQuoted;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueBefore;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeValueBefore;
    }
    effects.consume(code);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuoted(code) {
    if (code === marker) {
      effects.consume(code);
      marker = void 0;
      return tagOpenAttributeValueQuotedAfter;
    }
    if (code === null) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueQuoted;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return tagOpenAttributeValueQuoted;
  }
  function tagOpenAttributeValueUnquoted(code) {
    if (code === null || code === 34 || code === 39 || code === 60 || code === 61 || code === 96) {
      return nok(code);
    }
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    effects.consume(code);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuotedAfter(code) {
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    return nok(code);
  }
  function end(code) {
    if (code === 62) {
      effects.consume(code);
      effects.exit("htmlTextData");
      effects.exit("htmlText");
      return ok;
    }
    return nok(code);
  }
  function lineEndingBefore(code) {
    effects.exit("htmlTextData");
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return lineEndingAfter;
  }
  function lineEndingAfter(code) {
    return markdownSpace(code) ? factorySpace(effects, lineEndingAfterPrefix, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : lineEndingAfterPrefix(code);
  }
  function lineEndingAfterPrefix(code) {
    effects.enter("htmlTextData");
    return returnState(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-end.js
var labelEnd = {
  name: "labelEnd",
  resolveAll: resolveAllLabelEnd,
  resolveTo: resolveToLabelEnd,
  tokenize: tokenizeLabelEnd
};
var resourceConstruct = {
  tokenize: tokenizeResource
};
var referenceFullConstruct = {
  tokenize: tokenizeReferenceFull
};
var referenceCollapsedConstruct = {
  tokenize: tokenizeReferenceCollapsed
};
function resolveAllLabelEnd(events) {
  let index2 = -1;
  const newEvents = [];
  while (++index2 < events.length) {
    const token = events[index2][1];
    newEvents.push(events[index2]);
    if (token.type === "labelImage" || token.type === "labelLink" || token.type === "labelEnd") {
      const offset = token.type === "labelImage" ? 4 : 2;
      token.type = "data";
      index2 += offset;
    }
  }
  if (events.length !== newEvents.length) {
    splice(events, 0, events.length, newEvents);
  }
  return events;
}
function resolveToLabelEnd(events, context) {
  let index2 = events.length;
  let offset = 0;
  let open;
  let close;
  let media;
  while (index2--) {
    const token = events[index2][1];
    if (open) {
      if (token.type === "link" || token.type === "labelLink" && token._inactive) {
        break;
      }
      if (events[index2][0] === "enter" && token.type === "labelLink") {
        token._inactive = true;
      }
    } else if (close) {
      if (events[index2][0] === "enter" && (token.type === "labelImage" || token.type === "labelLink") && !token._balanced) {
        open = index2;
        if (token.type !== "labelLink") {
          offset = 2;
          break;
        }
      }
    } else if (token.type === "labelEnd") {
      close = index2;
    }
  }
  const group = {
    type: events[open][1].type === "labelLink" ? "link" : "image",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  const label = {
    type: "label",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[close][1].end
    }
  };
  const text3 = {
    type: "labelText",
    start: {
      ...events[open + offset + 2][1].end
    },
    end: {
      ...events[close - 2][1].start
    }
  };
  media = [["enter", group, context], ["enter", label, context]];
  media = push(media, events.slice(open + 1, open + offset + 3));
  media = push(media, [["enter", text3, context]]);
  media = push(media, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + offset + 4, close - 3), context));
  media = push(media, [["exit", text3, context], events[close - 2], events[close - 1], ["exit", label, context]]);
  media = push(media, events.slice(close + 1));
  media = push(media, [["exit", group, context]]);
  splice(events, open, events.length, media);
  return events;
}
function tokenizeLabelEnd(effects, ok, nok) {
  const self = this;
  const labelStarts = self._labelStarts;
  let labelStart;
  let defined;
  if (labelStarts) {
    while (labelStarts.length > 0 && labelStarts[labelStarts.length - 1]._balanced) {
      labelStarts.pop();
    }
    labelStart = labelStarts[labelStarts.length - 1];
  }
  return start;
  function start(code) {
    if (!labelStart) {
      return nok(code);
    }
    if (labelStart._inactive) {
      return labelEndNok(code);
    }
    defined = self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize({
      start: labelStart.end,
      end: self.now()
    })));
    effects.enter("labelEnd");
    effects.enter("labelMarker");
    effects.consume(code);
    effects.exit("labelMarker");
    effects.exit("labelEnd");
    return after;
  }
  function after(code) {
    if (code === 40) {
      return effects.attempt(resourceConstruct, labelEndOk, defined ? labelEndOk : labelEndNok)(code);
    }
    if (code === 91) {
      return effects.attempt(referenceFullConstruct, labelEndOk, defined ? referenceNotFull : labelEndNok)(code);
    }
    return defined ? labelEndOk(code) : labelEndNok(code);
  }
  function referenceNotFull(code) {
    return effects.attempt(referenceCollapsedConstruct, labelEndOk, labelEndNok)(code);
  }
  function labelEndOk(code) {
    labelStarts.pop();
    return ok(code);
  }
  function labelEndNok(code) {
    labelStart._balanced = true;
    return nok(code);
  }
}
function tokenizeResource(effects, ok, nok) {
  return resourceStart;
  function resourceStart(code) {
    effects.enter("resource");
    effects.enter("resourceMarker");
    effects.consume(code);
    effects.exit("resourceMarker");
    return resourceBefore;
  }
  function resourceBefore(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceOpen)(code) : resourceOpen(code);
  }
  function resourceOpen(code) {
    if (code === 41) {
      return resourceEnd(code);
    }
    return factoryDestination(effects, resourceDestinationAfter, resourceDestinationMissing, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(code);
  }
  function resourceDestinationAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceBetween)(code) : resourceEnd(code);
  }
  function resourceDestinationMissing(code) {
    return nok(code);
  }
  function resourceBetween(code) {
    if (code === 34 || code === 39 || code === 40) {
      return factoryTitle(effects, resourceTitleAfter, nok, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(code);
    }
    return resourceEnd(code);
  }
  function resourceTitleAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceEnd)(code) : resourceEnd(code);
  }
  function resourceEnd(code) {
    if (code === 41) {
      effects.enter("resourceMarker");
      effects.consume(code);
      effects.exit("resourceMarker");
      effects.exit("resource");
      return ok;
    }
    return nok(code);
  }
}
function tokenizeReferenceFull(effects, ok, nok) {
  const self = this;
  return referenceFull;
  function referenceFull(code) {
    return factoryLabel.call(self, effects, referenceFullAfter, referenceFullMissing, "reference", "referenceMarker", "referenceString")(code);
  }
  function referenceFullAfter(code) {
    return self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1))) ? ok(code) : nok(code);
  }
  function referenceFullMissing(code) {
    return nok(code);
  }
}
function tokenizeReferenceCollapsed(effects, ok, nok) {
  return referenceCollapsedStart;
  function referenceCollapsedStart(code) {
    effects.enter("reference");
    effects.enter("referenceMarker");
    effects.consume(code);
    effects.exit("referenceMarker");
    return referenceCollapsedOpen;
  }
  function referenceCollapsedOpen(code) {
    if (code === 93) {
      effects.enter("referenceMarker");
      effects.consume(code);
      effects.exit("referenceMarker");
      effects.exit("reference");
      return ok;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-image.js
var labelStartImage = {
  name: "labelStartImage",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartImage
};
function tokenizeLabelStartImage(effects, ok, nok) {
  const self = this;
  let labelImage;
  return start;
  function start(code) {
    effects.enter("labelImage");
    effects.enter("labelImageMarker");
    effects.consume(code);
    effects.exit("labelImageMarker");
    return open;
  }
  function open(code) {
    if (code === 91) {
      effects.enter("labelMarker");
      effects.consume(code);
      effects.exit("labelMarker");
      labelImage = effects.exit("labelImage");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    if (code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code);
    }
    self._labelStarts = self._labelStarts || [];
    self._labelStarts.push(labelImage);
    return ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-link.js
var labelStartLink = {
  name: "labelStartLink",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartLink
};
function tokenizeLabelStartLink(effects, ok, nok) {
  const self = this;
  let labelLink;
  return start;
  function start(code) {
    effects.enter("labelLink");
    effects.enter("labelMarker");
    effects.consume(code);
    effects.exit("labelMarker");
    labelLink = effects.exit("labelLink");
    return after;
  }
  function after(code) {
    if (code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code);
    }
    self._labelStarts = self._labelStarts || [];
    self._labelStarts.push(labelLink);
    return ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/line-ending.js
var lineEnding = {
  name: "lineEnding",
  tokenize: tokenizeLineEnding
};
function tokenizeLineEnding(effects, ok) {
  return start;
  function start(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, ok, "linePrefix");
  }
}

// node_modules/micromark-core-commonmark/lib/thematic-break.js
var thematicBreak = {
  name: "thematicBreak",
  tokenize: tokenizeThematicBreak
};
function tokenizeThematicBreak(effects, ok, nok) {
  let size = 0;
  let marker;
  return start;
  function start(code) {
    effects.enter("thematicBreak");
    return before(code);
  }
  function before(code) {
    marker = code;
    return atBreak(code);
  }
  function atBreak(code) {
    if (code === marker) {
      effects.enter("thematicBreakSequence");
      return sequence(code);
    }
    if (size >= 3 && (code === null || markdownLineEnding(code))) {
      effects.exit("thematicBreak");
      return ok(code);
    }
    return nok(code);
  }
  function sequence(code) {
    if (code === marker) {
      effects.consume(code);
      size++;
      return sequence;
    }
    effects.exit("thematicBreakSequence");
    return markdownSpace(code) ? factorySpace(effects, atBreak, "whitespace")(code) : atBreak(code);
  }
}

// node_modules/micromark-core-commonmark/lib/list.js
var list = {
  continuation: {
    tokenize: tokenizeListContinuation
  },
  exit: tokenizeListEnd,
  name: "list",
  tokenize: tokenizeListStart
};
var listItemPrefixWhitespaceConstruct = {
  partial: true,
  tokenize: tokenizeListItemPrefixWhitespace
};
var indentConstruct = {
  partial: true,
  tokenize: tokenizeIndent
};
function tokenizeListStart(effects, ok, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  let initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let size = 0;
  return start;
  function start(code) {
    const kind = self.containerState.type || (code === 42 || code === 43 || code === 45 ? "listUnordered" : "listOrdered");
    if (kind === "listUnordered" ? !self.containerState.marker || code === self.containerState.marker : asciiDigit(code)) {
      if (!self.containerState.type) {
        self.containerState.type = kind;
        effects.enter(kind, {
          _container: true
        });
      }
      if (kind === "listUnordered") {
        effects.enter("listItemPrefix");
        return code === 42 || code === 45 ? effects.check(thematicBreak, nok, atMarker)(code) : atMarker(code);
      }
      if (!self.interrupt || code === 49) {
        effects.enter("listItemPrefix");
        effects.enter("listItemValue");
        return inside(code);
      }
    }
    return nok(code);
  }
  function inside(code) {
    if (asciiDigit(code) && ++size < 10) {
      effects.consume(code);
      return inside;
    }
    if ((!self.interrupt || size < 2) && (self.containerState.marker ? code === self.containerState.marker : code === 41 || code === 46)) {
      effects.exit("listItemValue");
      return atMarker(code);
    }
    return nok(code);
  }
  function atMarker(code) {
    effects.enter("listItemMarker");
    effects.consume(code);
    effects.exit("listItemMarker");
    self.containerState.marker = self.containerState.marker || code;
    return effects.check(
      blankLine,
      // Can’t be empty when interrupting.
      self.interrupt ? nok : onBlank,
      effects.attempt(listItemPrefixWhitespaceConstruct, endOfPrefix, otherPrefix)
    );
  }
  function onBlank(code) {
    self.containerState.initialBlankLine = true;
    initialSize++;
    return endOfPrefix(code);
  }
  function otherPrefix(code) {
    if (markdownSpace(code)) {
      effects.enter("listItemPrefixWhitespace");
      effects.consume(code);
      effects.exit("listItemPrefixWhitespace");
      return endOfPrefix;
    }
    return nok(code);
  }
  function endOfPrefix(code) {
    self.containerState.size = initialSize + self.sliceSerialize(effects.exit("listItemPrefix"), true).length;
    return ok(code);
  }
}
function tokenizeListContinuation(effects, ok, nok) {
  const self = this;
  self.containerState._closeFlow = void 0;
  return effects.check(blankLine, onBlank, notBlank);
  function onBlank(code) {
    self.containerState.furtherBlankLines = self.containerState.furtherBlankLines || self.containerState.initialBlankLine;
    return factorySpace(effects, ok, "listItemIndent", self.containerState.size + 1)(code);
  }
  function notBlank(code) {
    if (self.containerState.furtherBlankLines || !markdownSpace(code)) {
      self.containerState.furtherBlankLines = void 0;
      self.containerState.initialBlankLine = void 0;
      return notInCurrentItem(code);
    }
    self.containerState.furtherBlankLines = void 0;
    self.containerState.initialBlankLine = void 0;
    return effects.attempt(indentConstruct, ok, notInCurrentItem)(code);
  }
  function notInCurrentItem(code) {
    self.containerState._closeFlow = true;
    self.interrupt = void 0;
    return factorySpace(effects, effects.attempt(list, ok, nok), "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
  }
}
function tokenizeIndent(effects, ok, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemIndent", self.containerState.size + 1);
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "listItemIndent" && tail[2].sliceSerialize(tail[1], true).length === self.containerState.size ? ok(code) : nok(code);
  }
}
function tokenizeListEnd(effects) {
  effects.exit(this.containerState.type);
}
function tokenizeListItemPrefixWhitespace(effects, ok, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemPrefixWhitespace", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4 + 1);
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return !markdownSpace(code) && tail && tail[1].type === "listItemPrefixWhitespace" ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/setext-underline.js
var setextUnderline = {
  name: "setextUnderline",
  resolveTo: resolveToSetextUnderline,
  tokenize: tokenizeSetextUnderline
};
function resolveToSetextUnderline(events, context) {
  const editMap = new EditMap();
  let index2 = events.length;
  let content3;
  let text3;
  let definition2;
  while (index2--) {
    if (events[index2][0] === "enter") {
      if (events[index2][1].type === "content") {
        content3 = index2;
        break;
      }
      if (events[index2][1].type === "paragraph") {
        text3 = index2;
      }
    } else {
      if (events[index2][1].type === "content") {
        editMap.add(index2, 1, []);
      }
      if (!definition2 && events[index2][1].type === "definition") {
        definition2 = index2;
      }
    }
  }
  const heading = {
    type: "setextHeading",
    start: {
      ...events[content3][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  events[text3][1].type = "setextHeadingText";
  if (definition2) {
    editMap.add(text3, 0, [["enter", heading, context]]);
    editMap.add(definition2 + 1, 0, [["exit", events[content3][1], context]]);
    events[content3][1].end = {
      ...events[definition2][1].end
    };
  } else {
    events[content3][1] = heading;
  }
  editMap.add(events.length, 0, [["exit", heading, context]]);
  editMap.consume(events);
  return events;
}
function tokenizeSetextUnderline(effects, ok, nok) {
  const self = this;
  let marker;
  return start;
  function start(code) {
    let index2 = self.events.length;
    let paragraph;
    while (index2--) {
      if (self.events[index2][1].type !== "lineEnding" && self.events[index2][1].type !== "linePrefix" && self.events[index2][1].type !== "content") {
        paragraph = self.events[index2][1].type === "paragraph";
        break;
      }
    }
    if (!self.parser.lazy[self.now().line] && (self.interrupt || paragraph)) {
      effects.enter("setextHeadingLine");
      marker = code;
      return before(code);
    }
    return nok(code);
  }
  function before(code) {
    effects.enter("setextHeadingLineSequence");
    return inside(code);
  }
  function inside(code) {
    if (code === marker) {
      effects.consume(code);
      return inside;
    }
    effects.exit("setextHeadingLineSequence");
    return markdownSpace(code) ? factorySpace(effects, after, "lineSuffix")(code) : after(code);
  }
  function after(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("setextHeadingLine");
      return ok(code);
    }
    return nok(code);
  }
}

// node_modules/micromark/lib/initialize/flow.js
var flow = {
  tokenize: initializeFlow
};
function initializeFlow(effects) {
  const self = this;
  const initial = effects.attempt(
    // Try to parse a blank line.
    blankLine,
    atBlankEnding,
    // Try to parse initial flow (essentially, only code).
    effects.attempt(this.parser.constructs.flowInitial, afterConstruct, factorySpace(effects, effects.attempt(this.parser.constructs.flow, afterConstruct, effects.attempt(content2, afterConstruct)), "linePrefix"))
  );
  return initial;
  function atBlankEnding(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEndingBlank");
    effects.consume(code);
    effects.exit("lineEndingBlank");
    self.currentConstruct = void 0;
    return initial;
  }
  function afterConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    self.currentConstruct = void 0;
    return initial;
  }
}

// node_modules/micromark/lib/initialize/text.js
var resolver = {
  resolveAll: createResolver()
};
var string = initializeFactory("string");
var text = initializeFactory("text");
function initializeFactory(field) {
  return {
    resolveAll: createResolver(field === "text" ? resolveAllLineSuffixes : void 0),
    tokenize: initializeText
  };
  function initializeText(effects) {
    const self = this;
    const constructs2 = this.parser.constructs[field];
    const text3 = effects.attempt(constructs2, start, notText);
    return start;
    function start(code) {
      return atBreak(code) ? text3(code) : notText(code);
    }
    function notText(code) {
      if (code === null) {
        effects.consume(code);
        return;
      }
      effects.enter("data");
      effects.consume(code);
      return data;
    }
    function data(code) {
      if (atBreak(code)) {
        effects.exit("data");
        return text3(code);
      }
      effects.consume(code);
      return data;
    }
    function atBreak(code) {
      if (code === null) {
        return true;
      }
      const list2 = constructs2[code];
      let index2 = -1;
      if (list2) {
        while (++index2 < list2.length) {
          const item = list2[index2];
          if (!item.previous || item.previous.call(self, self.previous)) {
            return true;
          }
        }
      }
      return false;
    }
  }
}
function createResolver(extraResolver) {
  return resolveAllText;
  function resolveAllText(events, context) {
    let index2 = -1;
    let enter;
    while (++index2 <= events.length) {
      if (enter === void 0) {
        if (events[index2] && events[index2][1].type === "data") {
          enter = index2;
          index2++;
        }
      } else if (!events[index2] || events[index2][1].type !== "data") {
        if (index2 !== enter + 2) {
          events[enter][1].end = events[index2 - 1][1].end;
          events.splice(enter + 2, index2 - enter - 2);
          index2 = enter + 2;
        }
        enter = void 0;
      }
    }
    return extraResolver ? extraResolver(events, context) : events;
  }
}
function resolveAllLineSuffixes(events, context) {
  const editMap = new EditMap();
  let eventIndex = 0;
  while (++eventIndex <= events.length) {
    if ((eventIndex === events.length || events[eventIndex][1].type === "lineEnding") && events[eventIndex - 1][1].type === "data") {
      const data = events[eventIndex - 1][1];
      const chunks = context.sliceStream(data);
      let index2 = chunks.length;
      let bufferIndex = -1;
      let size = 0;
      let tabs;
      while (index2--) {
        const chunk = chunks[index2];
        if (typeof chunk === "string") {
          bufferIndex = chunk.length;
          while (chunk.charCodeAt(bufferIndex - 1) === 32) {
            size++;
            bufferIndex--;
          }
          if (bufferIndex) {
            break;
          }
          bufferIndex = -1;
        } else if (chunk === -2) {
          tabs = true;
          size++;
        } else if (chunk === -1) {
        } else {
          index2++;
          break;
        }
      }
      if (context._contentTypeTextTrailing && eventIndex === events.length) {
        size = 0;
      }
      if (size) {
        const token = {
          type: eventIndex === events.length || tabs || size < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: index2 ? bufferIndex : data.start._bufferIndex + bufferIndex,
            _index: data.start._index + index2,
            line: data.end.line,
            column: data.end.column - size,
            offset: data.end.offset - size
          },
          end: {
            ...data.end
          }
        };
        data.end = {
          ...token.start
        };
        if (data.start.offset === data.end.offset) {
          Object.assign(data, token);
        } else {
          editMap.add(eventIndex, 0, [["enter", token, context], ["exit", token, context]]);
        }
      }
      eventIndex++;
    }
  }
  editMap.consume(events);
  return events;
}

// node_modules/micromark/lib/constructs.js
var constructs_exports = {};
__export(constructs_exports, {
  attentionMarkers: () => attentionMarkers,
  contentInitial: () => contentInitial,
  disable: () => disable,
  document: () => document3,
  flow: () => flow2,
  flowInitial: () => flowInitial,
  insideSpan: () => insideSpan,
  string: () => string2,
  text: () => text2
});
var document3 = {
  [42]: list,
  [43]: list,
  [45]: list,
  [48]: list,
  [49]: list,
  [50]: list,
  [51]: list,
  [52]: list,
  [53]: list,
  [54]: list,
  [55]: list,
  [56]: list,
  [57]: list,
  [62]: blockQuote
};
var contentInitial = {
  [91]: definition
};
var flowInitial = {
  [-2]: codeIndented,
  [-1]: codeIndented,
  [32]: codeIndented
};
var flow2 = {
  [35]: headingAtx,
  [42]: thematicBreak,
  [45]: [setextUnderline, thematicBreak],
  [60]: htmlFlow,
  [61]: setextUnderline,
  [95]: thematicBreak,
  [96]: codeFenced,
  [126]: codeFenced
};
var string2 = {
  [38]: characterReference,
  [92]: characterEscape
};
var text2 = {
  [-5]: lineEnding,
  [-4]: lineEnding,
  [-3]: lineEnding,
  [33]: labelStartImage,
  [38]: characterReference,
  [42]: attention,
  [60]: [autolink, htmlText],
  [91]: labelStartLink,
  [92]: [hardBreakEscape, characterEscape],
  [93]: labelEnd,
  [95]: attention,
  [96]: codeText
};
var insideSpan = {
  null: [attention, resolver]
};
var attentionMarkers = {
  null: [42, 95]
};
var disable = {
  null: []
};

// node_modules/micromark/lib/create-tokenizer.js
function createTokenizer(parser, initialize, from) {
  let point3 = {
    _bufferIndex: -1,
    _index: 0,
    line: from && from.line || 1,
    column: from && from.column || 1,
    offset: from && from.offset || 0
  };
  const columnStart = {};
  const resolveAllConstructs = [];
  let chunks = [];
  let stack = [];
  let consumed = true;
  const effects = {
    attempt: constructFactory(onsuccessfulconstruct),
    check: constructFactory(onsuccessfulcheck),
    consume,
    enter,
    exit: exit2,
    interrupt: constructFactory(onsuccessfulcheck, {
      interrupt: true
    })
  };
  const context = {
    code: null,
    containerState: {},
    defineSkip,
    events: [],
    now,
    parser,
    previous: null,
    sliceSerialize,
    sliceStream,
    write
  };
  let state = initialize.tokenize.call(context, effects);
  let expectedCode;
  if (initialize.resolveAll) {
    resolveAllConstructs.push(initialize);
  }
  return context;
  function write(slice) {
    chunks = push(chunks, slice);
    main();
    if (chunks[chunks.length - 1] !== null) {
      return [];
    }
    addResult(initialize, 0);
    context.events = resolveAll(resolveAllConstructs, context.events, context);
    return context.events;
  }
  function sliceSerialize(token, expandTabs) {
    return serializeChunks(sliceStream(token), expandTabs);
  }
  function sliceStream(token) {
    return sliceChunks(chunks, token);
  }
  function now() {
    const {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    } = point3;
    return {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    };
  }
  function defineSkip(value) {
    columnStart[value.line] = value.column;
    accountForPotentialSkip();
  }
  function main() {
    while (point3._index < chunks.length) {
      const chunk = chunks[point3._index];
      if (typeof chunk === "string") {
        const chunkIndex = point3._index;
        if (point3._bufferIndex < 0) {
          point3._bufferIndex = 0;
        }
        while (point3._index === chunkIndex && point3._bufferIndex < chunk.length) {
          go(chunk.charCodeAt(point3._bufferIndex));
        }
      } else {
        go(chunk);
      }
    }
  }
  function go(code) {
    consumed = void 0;
    expectedCode = code;
    state = state(code);
  }
  function consume(code) {
    if (markdownLineEnding(code)) {
      point3.line++;
      point3.column = 1;
      point3.offset += code === -3 ? 2 : 1;
      accountForPotentialSkip();
    } else if (code !== -1) {
      point3.column++;
      point3.offset++;
    }
    if (point3._bufferIndex < 0) {
      point3._index++;
    } else {
      point3._bufferIndex++;
      if (point3._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
      // strings.
      /** @type {string} */
      chunks[point3._index].length) {
        point3._bufferIndex = -1;
        point3._index++;
      }
    }
    context.previous = code;
    consumed = true;
  }
  function enter(type, fields) {
    const token = fields || {};
    token.type = type;
    token.start = now();
    context.events.push(["enter", token, context]);
    stack.push(token);
    return token;
  }
  function exit2(type) {
    const token = stack.pop();
    token.end = now();
    context.events.push(["exit", token, context]);
    return token;
  }
  function onsuccessfulconstruct(construct, info) {
    addResult(construct, info.from);
  }
  function onsuccessfulcheck(_, info) {
    info.restore();
  }
  function constructFactory(onreturn, fields) {
    return hook;
    function hook(constructs2, returnState, bogusState) {
      let listOfConstructs;
      let constructIndex;
      let currentConstruct;
      let info;
      return Array.isArray(constructs2) ? (
        /* c8 ignore next 1 */
        handleListOfConstructs(constructs2)
      ) : "tokenize" in constructs2 ? (
        // Looks like a construct.
        handleListOfConstructs([
          /** @type {Construct} */
          constructs2
        ])
      ) : handleMapOfConstructs(constructs2);
      function handleMapOfConstructs(map) {
        return start;
        function start(code) {
          const left = code !== null && map[code];
          const all2 = code !== null && map.null;
          const list2 = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(left) ? left : left ? [left] : [],
            ...Array.isArray(all2) ? all2 : all2 ? [all2] : []
          ];
          return handleListOfConstructs(list2)(code);
        }
      }
      function handleListOfConstructs(list2) {
        listOfConstructs = list2;
        constructIndex = 0;
        if (list2.length === 0) {
          return bogusState;
        }
        return handleConstruct(list2[constructIndex]);
      }
      function handleConstruct(construct) {
        return start;
        function start(code) {
          info = store();
          currentConstruct = construct;
          if (!construct.partial) {
            context.currentConstruct = construct;
          }
          if (construct.name && context.parser.constructs.disable.null.includes(construct.name)) {
            return nok(code);
          }
          return construct.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            fields ? Object.assign(Object.create(context), fields) : context,
            effects,
            ok,
            nok
          )(code);
        }
      }
      function ok(code) {
        consumed = true;
        onreturn(currentConstruct, info);
        return returnState;
      }
      function nok(code) {
        consumed = true;
        info.restore();
        if (++constructIndex < listOfConstructs.length) {
          return handleConstruct(listOfConstructs[constructIndex]);
        }
        return bogusState;
      }
    }
  }
  function addResult(construct, from2) {
    if (construct.resolveAll && !resolveAllConstructs.includes(construct)) {
      resolveAllConstructs.push(construct);
    }
    if (construct.resolve) {
      splice(context.events, from2, context.events.length - from2, construct.resolve(context.events.slice(from2), context));
    }
    if (construct.resolveTo) {
      context.events = construct.resolveTo(context.events, context);
    }
  }
  function store() {
    const startPoint = now();
    const startPrevious = context.previous;
    const startCurrentConstruct = context.currentConstruct;
    const startEventsIndex = context.events.length;
    const startStack = Array.from(stack);
    return {
      from: startEventsIndex,
      restore
    };
    function restore() {
      point3 = startPoint;
      context.previous = startPrevious;
      context.currentConstruct = startCurrentConstruct;
      context.events.length = startEventsIndex;
      stack = startStack;
      accountForPotentialSkip();
    }
  }
  function accountForPotentialSkip() {
    if (point3.line in columnStart && point3.column < 2) {
      point3.column = columnStart[point3.line];
      point3.offset += columnStart[point3.line] - 1;
    }
  }
}
function sliceChunks(chunks, token) {
  const startIndex = token.start._index;
  const startBufferIndex = token.start._bufferIndex;
  const endIndex = token.end._index;
  const endBufferIndex = token.end._bufferIndex;
  let view;
  if (startIndex === endIndex) {
    view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
  } else {
    view = chunks.slice(startIndex, endIndex);
    if (startBufferIndex > -1) {
      const head = view[0];
      if (typeof head === "string") {
        view[0] = head.slice(startBufferIndex);
      } else {
        view.shift();
      }
    }
    if (endBufferIndex > 0) {
      view.push(chunks[endIndex].slice(0, endBufferIndex));
    }
  }
  return view;
}
function serializeChunks(chunks, expandTabs) {
  let index2 = -1;
  const result = [];
  let atTab;
  while (++index2 < chunks.length) {
    const chunk = chunks[index2];
    let value;
    if (typeof chunk === "string") {
      value = chunk;
    } else {
      switch (chunk) {
        case -5: {
          value = "\r";
          break;
        }
        case -4: {
          value = "\n";
          break;
        }
        case -3: {
          value = "\r\n";
          break;
        }
        case -2: {
          value = expandTabs ? " " : "	";
          break;
        }
        case -1: {
          if (!expandTabs && atTab) {
            continue;
          }
          value = " ";
          break;
        }
        default: {
          value = String.fromCharCode(chunk);
        }
      }
    }
    atTab = chunk === -2;
    result.push(value);
  }
  return result.join("");
}

// node_modules/micromark/lib/parse.js
function parse(options) {
  const settings = options || {};
  const constructs2 = (
    /** @type {FullNormalizedExtension} */
    combineExtensions([constructs_exports, ...settings.extensions || []])
  );
  const parser = {
    constructs: constructs2,
    content: create(content),
    defined: [],
    document: create(document2),
    flow: create(flow),
    lazy: {},
    string: create(string),
    text: create(text)
  };
  return parser;
  function create(initial) {
    return creator;
    function creator(from) {
      return createTokenizer(parser, initial, from);
    }
  }
}

// node_modules/micromark/lib/postprocess.js
function postprocess(events) {
  while (!subtokenize(events)) {
  }
  return events;
}

// node_modules/micromark/lib/preprocess.js
var search = /[\0\t\n\r]/g;
function preprocess() {
  let column = 1;
  let buffer = "";
  let start = true;
  let atCarriageReturn;
  return preprocessor;
  function preprocessor(value, encoding, end) {
    value = buffer + (typeof value === "string" ? value.toString() : new TextDecoder(encoding || void 0).decode(value));
    const chunks = [];
    let startPosition = 0;
    buffer = "";
    if (start) {
      if (value.charCodeAt(0) === 65279) {
        startPosition++;
      }
      start = void 0;
    }
    while (startPosition < value.length) {
      search.lastIndex = startPosition;
      const match = search.exec(value);
      const endPosition = match && match.index !== void 0 ? match.index : value.length;
      const code = value.charCodeAt(endPosition);
      if (!match) {
        buffer = value.slice(startPosition);
        break;
      }
      if (code === 10 && startPosition === endPosition && atCarriageReturn) {
        chunks.push(-3);
        atCarriageReturn = void 0;
      } else {
        if (atCarriageReturn) {
          chunks.push(-5);
          atCarriageReturn = void 0;
        }
        if (startPosition < endPosition) {
          chunks.push(value.slice(startPosition, endPosition));
          column += endPosition - startPosition;
        }
        switch (code) {
          case 0: {
            chunks.push(65533);
            column++;
            break;
          }
          case 9: {
            const next = Math.ceil(column / 4) * 4;
            chunks.push(-2);
            while (column++ < next) {
              chunks.push(-1);
            }
            break;
          }
          case 10: {
            chunks.push(-4);
            column = 1;
            break;
          }
          default: {
            atCarriageReturn = true;
            column = 1;
          }
        }
      }
      startPosition = endPosition + 1;
    }
    if (end) {
      if (atCarriageReturn) {
        chunks.push(-5);
      }
      if (buffer) {
        chunks.push(buffer);
      }
      chunks.push(null);
    }
    return chunks;
  }
}

// node_modules/micromark-util-decode-string/index.js
var characterEscapeOrReference = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function decodeString(value) {
  return value.replace(characterEscapeOrReference, decode);
}
function decode($0, $1, $2) {
  if ($1) {
    return $1;
  }
  const head = $2.charCodeAt(0);
  if (head === 35) {
    const head2 = $2.charCodeAt(1);
    const hex = head2 === 120 || head2 === 88;
    return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10);
  }
  return decodeNamedCharacterReference($2) || $0;
}

// node_modules/unist-util-stringify-position/lib/index.js
function stringifyPosition(value) {
  if (!value || typeof value !== "object") {
    return "";
  }
  if ("position" in value || "type" in value) {
    return position(value.position);
  }
  if ("start" in value || "end" in value) {
    return position(value);
  }
  if ("line" in value || "column" in value) {
    return point(value);
  }
  return "";
}
function point(point3) {
  return index(point3 && point3.line) + ":" + index(point3 && point3.column);
}
function position(pos) {
  return point(pos && pos.start) + "-" + point(pos && pos.end);
}
function index(value) {
  return value && typeof value === "number" ? value : 1;
}

// node_modules/mdast-util-from-markdown/lib/index.js
var own = {}.hasOwnProperty;
function fromMarkdown(value, encoding, options) {
  if (encoding && typeof encoding === "object") {
    options = encoding;
    encoding = void 0;
  }
  return compiler(options)(postprocess(parse(options).document().write(preprocess()(value, encoding, true))));
}
function compiler(options) {
  const config = {
    afterExit: [],
    beforeEnter: [],
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: opener(link),
      autolinkProtocol: onenterdata,
      autolinkEmail: onenterdata,
      atxHeading: opener(heading),
      blockQuote: opener(blockQuote2),
      characterEscape: onenterdata,
      characterReference: onenterdata,
      codeFenced: opener(codeFlow),
      codeFencedFenceInfo: buffer,
      codeFencedFenceMeta: buffer,
      codeIndented: opener(codeFlow, buffer),
      codeText: opener(codeText2, buffer),
      codeTextData: onenterdata,
      data: onenterdata,
      codeFlowValue: onenterdata,
      definition: opener(definition2),
      definitionDestinationString: buffer,
      definitionLabelString: buffer,
      definitionTitleString: buffer,
      emphasis: opener(emphasis),
      hardBreakEscape: opener(hardBreak),
      hardBreakTrailing: opener(hardBreak),
      htmlFlow: opener(html, buffer),
      htmlFlowData: onenterdata,
      htmlText: opener(html, buffer),
      htmlTextData: onenterdata,
      image: opener(image),
      label: buffer,
      link: opener(link),
      listItem: opener(listItem),
      listItemValue: onenterlistitemvalue,
      listOrdered: opener(list2, onenterlistordered),
      listUnordered: opener(list2),
      paragraph: opener(paragraph),
      reference: onenterreference,
      referenceString: buffer,
      resourceDestinationString: buffer,
      resourceTitleString: buffer,
      setextHeading: opener(heading),
      strong: opener(strong),
      thematicBreak: opener(thematicBreak2)
    },
    exit: {
      atxHeading: closer(),
      atxHeadingSequence: onexitatxheadingsequence,
      autolink: closer(),
      autolinkEmail: onexitautolinkemail,
      autolinkProtocol: onexitautolinkprotocol,
      blockQuote: closer(),
      characterEscapeValue: onexitdata,
      characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
      characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
      characterReferenceValue: onexitcharacterreferencevalue,
      characterReference: onexitcharacterreference,
      codeFenced: closer(onexitcodefenced),
      codeFencedFence: onexitcodefencedfence,
      codeFencedFenceInfo: onexitcodefencedfenceinfo,
      codeFencedFenceMeta: onexitcodefencedfencemeta,
      codeFlowValue: onexitdata,
      codeIndented: closer(onexitcodeindented),
      codeText: closer(onexitcodetext),
      codeTextData: onexitdata,
      data: onexitdata,
      definition: closer(),
      definitionDestinationString: onexitdefinitiondestinationstring,
      definitionLabelString: onexitdefinitionlabelstring,
      definitionTitleString: onexitdefinitiontitlestring,
      emphasis: closer(),
      hardBreakEscape: closer(onexithardbreak),
      hardBreakTrailing: closer(onexithardbreak),
      htmlFlow: closer(onexithtmlflow),
      htmlFlowData: onexitdata,
      htmlText: closer(onexithtmltext),
      htmlTextData: onexitdata,
      image: closer(onexitimage),
      label: onexitlabel,
      labelText: onexitlabeltext,
      lineEnding: onexitlineending,
      link: closer(onexitlink),
      listItem: closer(),
      listOrdered: closer(),
      listUnordered: closer(),
      paragraph: closer(),
      referenceString: onexitreferencestring,
      resourceDestinationString: onexitresourcedestinationstring,
      resourceTitleString: onexitresourcetitlestring,
      resource: onexitresource,
      setextHeading: closer(onexitsetextheading),
      setextHeadingLineSequence: onexitsetextheadinglinesequence,
      setextHeadingText: onexitsetextheadingtext,
      strong: closer(),
      thematicBreak: closer()
    }
  };
  configure(config, (options || {}).mdastExtensions || []);
  const data = {};
  return compile;
  function compile(events) {
    let tree = {
      type: "root",
      children: [],
      position: void 0
    };
    const context = {
      stack: [tree],
      tokenStack: [],
      config,
      enter,
      exit: exit2,
      buffer,
      resume,
      data
    };
    const listStack = [];
    const prepared = [];
    let index2 = -1;
    while (++index2 < events.length) {
      prepared.push(events[index2]);
      if (events[index2][1].type === "listOrdered" || events[index2][1].type === "listUnordered") {
        if (events[index2][0] === "enter") {
          listStack.push(prepared.length - 1);
        } else {
          const tail = listStack.pop();
          prepareList(prepared, tail);
        }
      }
    }
    events = prepared;
    index2 = -1;
    while (++index2 < events.length) {
      const handler = config[events[index2][0]];
      if (events[index2][0] === "enter" && config.beforeEnter.length > 0) {
        callListeners(config.beforeEnter, {
          ...context,
          sliceSerialize: events[index2][2].sliceSerialize
        }, events[index2][1]);
      }
      if (own.call(handler, events[index2][1].type)) {
        handler[events[index2][1].type].call({
          ...context,
          sliceSerialize: events[index2][2].sliceSerialize
        }, events[index2][1]);
      }
      if (events[index2][0] === "exit" && config.afterExit.length > 0) {
        callListeners(config.afterExit, {
          ...context,
          sliceSerialize: events[index2][2].sliceSerialize
        }, events[index2][1]);
      }
    }
    if (context.tokenStack.length > 0) {
      const tail = context.tokenStack[context.tokenStack.length - 1];
      const handler = tail[1] || defaultOnError;
      handler.call(context, void 0, tail[0]);
    }
    tree.position = {
      start: point2(events.length > 0 ? events[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: point2(events.length > 0 ? events[events.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    };
    index2 = -1;
    while (++index2 < config.transforms.length) {
      tree = config.transforms[index2](tree) || tree;
    }
    return tree;
  }
  function callListeners(listeners, context, token) {
    let index2 = -1;
    while (++index2 < listeners.length) {
      listeners[index2].call(context, token);
    }
  }
  function prepareList(events, start) {
    const end = events.length - 1;
    let index2 = start - 1;
    let containerBalance = -1;
    let listSpread = false;
    let listItem2;
    let lineIndex;
    let firstBlankLineIndex;
    let atMarker;
    const insertions = [];
    while (++index2 <= end) {
      const event = events[index2];
      switch (event[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          if (event[0] === "enter") {
            containerBalance++;
          } else {
            containerBalance--;
          }
          atMarker = void 0;
          break;
        }
        case "lineEndingBlank": {
          if (event[0] === "enter") {
            if (listItem2 && !atMarker && !containerBalance && !firstBlankLineIndex) {
              firstBlankLineIndex = index2;
            }
            atMarker = void 0;
          }
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace": {
          break;
        }
        default: {
          atMarker = void 0;
        }
      }
      if (!containerBalance && event[0] === "enter" && event[1].type === "listItemPrefix" || containerBalance === -1 && event[0] === "exit" && (event[1].type === "listUnordered" || event[1].type === "listOrdered")) {
        if (listItem2) {
          let tailIndex = index2;
          lineIndex = void 0;
          while (tailIndex--) {
            const tailEvent = events[tailIndex];
            if (tailEvent[1].type === "lineEnding" || tailEvent[1].type === "lineEndingBlank") {
              if (tailEvent[0] === "exit") continue;
              if (lineIndex) {
                events[lineIndex][1].type = "lineEndingBlank";
                listSpread = true;
              }
              tailEvent[1].type = "lineEnding";
              lineIndex = tailIndex;
            } else if (tailEvent[1].type === "linePrefix" || tailEvent[1].type === "blockQuotePrefix" || tailEvent[1].type === "blockQuotePrefixWhitespace" || tailEvent[1].type === "blockQuoteMarker" || tailEvent[1].type === "listItemIndent") {
            } else {
              break;
            }
          }
          if (firstBlankLineIndex && (!lineIndex || firstBlankLineIndex < lineIndex)) {
            listItem2._spread = true;
          }
          listItem2.end = Object.assign({}, lineIndex ? events[lineIndex][1].start : event[1].end);
          insertions.push({
            at: lineIndex || index2,
            event: ["exit", listItem2, event[2]]
          });
        }
        if (event[1].type === "listItemPrefix") {
          const item = {
            type: "listItem",
            _spread: false,
            start: Object.assign({}, event[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          listItem2 = item;
          insertions.push({
            at: index2,
            event: ["enter", item, event[2]]
          });
          firstBlankLineIndex = void 0;
          atMarker = true;
        }
      }
    }
    const listEvents = events.splice(start);
    let insertion = 0;
    index2 = -1;
    while (++index2 < listEvents.length) {
      while (insertion < insertions.length && insertions[insertion].at === start + index2) {
        events.push(insertions[insertion++].event);
      }
      events.push(listEvents[index2]);
    }
    events[start][1]._spread = listSpread;
  }
  function opener(create, and) {
    return open;
    function open(token) {
      enter.call(this, create(token), token);
      if (and) and.call(this, token);
    }
  }
  function buffer() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function enter(node2, token, errorHandler) {
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent.children;
    siblings.push(node2);
    this.stack.push(node2);
    this.tokenStack.push([token, errorHandler || void 0]);
    node2.position = {
      start: point2(token.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function closer(and) {
    return close;
    function close(token) {
      if (and) and.call(this, token);
      exit2.call(this, token);
    }
  }
  function exit2(token, onExitError) {
    const node2 = this.stack.pop();
    const open = this.tokenStack.pop();
    if (!open) {
      throw new Error("Cannot close `" + token.type + "` (" + stringifyPosition({
        start: token.start,
        end: token.end
      }) + "): it\u2019s not open");
    }
    if (open[0].type !== token.type) {
      if (onExitError) {
        onExitError.call(this, token, open[0]);
      } else {
        const handler = open[1] || defaultOnError;
        handler.call(this, token, open[0]);
      }
    }
    node2.position.end = point2(token.end);
  }
  function resume() {
    return toString(this.stack.pop());
  }
  function onenterlistordered() {
    this.data.expectingFirstListItemValue = true;
  }
  function onenterlistitemvalue(token) {
    if (this.data.expectingFirstListItemValue) {
      const ancestor = this.stack[this.stack.length - 2];
      ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
      this.data.expectingFirstListItemValue = void 0;
    }
  }
  function onexitcodefencedfenceinfo() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.lang = data2;
  }
  function onexitcodefencedfencemeta() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.meta = data2;
  }
  function onexitcodefencedfence() {
    if (this.data.flowCodeInside) return;
    this.buffer();
    this.data.flowCodeInside = true;
  }
  function onexitcodefenced() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
    this.data.flowCodeInside = void 0;
  }
  function onexitcodeindented() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/(\r?\n|\r)$/g, "");
  }
  function onexitdefinitionlabelstring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
  }
  function onexitdefinitiontitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitdefinitiondestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitatxheadingsequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    if (!node2.depth) {
      const depth = this.sliceSerialize(token).length;
      node2.depth = depth;
    }
  }
  function onexitsetextheadingtext() {
    this.data.setextHeadingSlurpLineEnding = true;
  }
  function onexitsetextheadinglinesequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    node2.depth = this.sliceSerialize(token).codePointAt(0) === 61 ? 1 : 2;
  }
  function onexitsetextheading() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function onenterdata(token) {
    const node2 = this.stack[this.stack.length - 1];
    const siblings = node2.children;
    let tail = siblings[siblings.length - 1];
    if (!tail || tail.type !== "text") {
      tail = text3();
      tail.position = {
        start: point2(token.start),
        // @ts-expect-error: we’ll add `end` later.
        end: void 0
      };
      siblings.push(tail);
    }
    this.stack.push(tail);
  }
  function onexitdata(token) {
    const tail = this.stack.pop();
    tail.value += this.sliceSerialize(token);
    tail.position.end = point2(token.end);
  }
  function onexitlineending(token) {
    const context = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const tail = context.children[context.children.length - 1];
      tail.position.end = point2(token.end);
      this.data.atHardBreak = void 0;
      return;
    }
    if (!this.data.setextHeadingSlurpLineEnding && config.canContainEols.includes(context.type)) {
      onenterdata.call(this, token);
      onexitdata.call(this, token);
    }
  }
  function onexithardbreak() {
    this.data.atHardBreak = true;
  }
  function onexithtmlflow() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexithtmltext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitcodetext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitlink() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitimage() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitlabeltext(token) {
    const string3 = this.sliceSerialize(token);
    const ancestor = this.stack[this.stack.length - 2];
    ancestor.label = decodeString(string3);
    ancestor.identifier = normalizeIdentifier(string3).toLowerCase();
  }
  function onexitlabel() {
    const fragment = this.stack[this.stack.length - 1];
    const value = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    this.data.inReference = true;
    if (node2.type === "link") {
      const children = fragment.children;
      node2.children = children;
    } else {
      node2.alt = value;
    }
  }
  function onexitresourcedestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitresourcetitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitresource() {
    this.data.inReference = void 0;
  }
  function onenterreference() {
    this.data.referenceType = "collapsed";
  }
  function onexitreferencestring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
    this.data.referenceType = "full";
  }
  function onexitcharacterreferencemarker(token) {
    this.data.characterReferenceType = token.type;
  }
  function onexitcharacterreferencevalue(token) {
    const data2 = this.sliceSerialize(token);
    const type = this.data.characterReferenceType;
    let value;
    if (type) {
      value = decodeNumericCharacterReference(data2, type === "characterReferenceMarkerNumeric" ? 10 : 16);
      this.data.characterReferenceType = void 0;
    } else {
      const result = decodeNamedCharacterReference(data2);
      value = result;
    }
    const tail = this.stack[this.stack.length - 1];
    tail.value += value;
  }
  function onexitcharacterreference(token) {
    const tail = this.stack.pop();
    tail.position.end = point2(token.end);
  }
  function onexitautolinkprotocol(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = this.sliceSerialize(token);
  }
  function onexitautolinkemail(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = "mailto:" + this.sliceSerialize(token);
  }
  function blockQuote2() {
    return {
      type: "blockquote",
      children: [],
      position: void 0
    };
  }
  function codeFlow() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: "",
      position: void 0
    };
  }
  function codeText2() {
    return {
      type: "inlineCode",
      value: "",
      position: void 0
    };
  }
  function definition2() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: "",
      position: void 0
    };
  }
  function emphasis() {
    return {
      type: "emphasis",
      children: [],
      position: void 0
    };
  }
  function heading() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: [],
      position: void 0
    };
  }
  function hardBreak() {
    return {
      type: "break",
      position: void 0
    };
  }
  function html() {
    return {
      type: "html",
      value: "",
      position: void 0
    };
  }
  function image() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null,
      position: void 0
    };
  }
  function link() {
    return {
      type: "link",
      title: null,
      url: "",
      children: [],
      position: void 0
    };
  }
  function list2(token) {
    return {
      type: "list",
      ordered: token.type === "listOrdered",
      start: null,
      spread: token._spread,
      children: [],
      position: void 0
    };
  }
  function listItem(token) {
    return {
      type: "listItem",
      spread: token._spread,
      checked: null,
      children: [],
      position: void 0
    };
  }
  function paragraph() {
    return {
      type: "paragraph",
      children: [],
      position: void 0
    };
  }
  function strong() {
    return {
      type: "strong",
      children: [],
      position: void 0
    };
  }
  function text3() {
    return {
      type: "text",
      value: "",
      position: void 0
    };
  }
  function thematicBreak2() {
    return {
      type: "thematicBreak",
      position: void 0
    };
  }
}
function point2(d) {
  return {
    line: d.line,
    column: d.column,
    offset: d.offset
  };
}
function configure(combined, extensions) {
  let index2 = -1;
  while (++index2 < extensions.length) {
    const value = extensions[index2];
    if (Array.isArray(value)) {
      configure(combined, value);
    } else {
      extension(combined, value);
    }
  }
}
function extension(combined, extension2) {
  let key;
  for (key in extension2) {
    if (own.call(extension2, key)) {
      switch (key) {
        case "canContainEols": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "transforms": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "afterExit":
        case "beforeEnter": {
          const right = extension2[key];
          if (right) {
            combined[key].push(right);
          }
          break;
        }
        case "enter":
        case "exit": {
          const right = extension2[key];
          if (right) {
            Object.assign(combined[key], right);
          }
          break;
        }
      }
    }
  }
}
function defaultOnError(left, right) {
  if (left) {
    throw new Error("Cannot close `" + left.type + "` (" + stringifyPosition({
      start: left.start,
      end: left.end
    }) + "): a different token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is open");
  }
  throw new Error("Cannot close document, a token (`" + right.type + "`, " + stringifyPosition({
    start: right.start,
    end: right.end
  }) + ") is still open");
}

// plugin/src/cited-documents.ts
var searchTool = "mcp__tbea__search_knowledge";
var detailTool = "mcp__tbea__get_chunk_detail";
function validTurn(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function parseJson(text3) {
  if (typeof text3 !== "string") return void 0;
  try {
    return JSON.parse(text3);
  } catch {
    return void 0;
  }
}
var knowledgeCitationId = /^K[0-9a-f]{8}-[1-9]\d*(?:-[1-9]\d*)?$/;
function answerCitationIds(entries) {
  const finalByTurn = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    if (!isRecord(entry) || entry.type !== "event" || !isRecord(entry.event) || entry.event.type !== "assistant/message") continue;
    const { data } = entry.event;
    if (!isRecord(data) || !validTurn(data.turn) || !isRecord(data.message) || !Array.isArray(data.message.content)) continue;
    const text3 = data.message.content.flatMap((part) => isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []).join("\n");
    if (!text3.trim()) continue;
    const ids = /* @__PURE__ */ new Set();
    const pending = [fromMarkdown(text3)];
    for (let node2 = pending.pop(); node2; node2 = pending.pop()) {
      if (node2.type === "link") {
        if (knowledgeCitationId.test(node2.url)) ids.add(node2.url);
      } else if (node2.type === "text") {
        for (const match of node2.value.matchAll(/\[(K[0-9a-f]{8}-[1-9]\d*(?:-[1-9]\d*)?)\]/g)) ids.add(match[1]);
      } else if ("children" in node2) {
        pending.push(...node2.children);
      }
    }
    finalByTurn.set(data.turn, ids);
  }
  return finalByTurn;
}
function containsCitation(selection, id) {
  return selection === null || selection?.has(id) === true;
}
async function resolveAnswerCitation(entries, turn, id, loadSnapshot) {
  if (!answerCitationIds(entries).get(turn)?.has(id)) return;
  const documents = [];
  for (const [snapshotId, turns] of citationReferences(entries)) {
    if (!id.startsWith("K" + snapshotId.slice(0, 8) + "-") || !containsCitation(turns.get(turn), id)) continue;
    const snapshot = await loadSnapshot(snapshotId);
    documents.push(...snapshotDocuments(snapshot).filter((doc) => doc.citationId === id && doc.knowledgeBaseId).map((doc) => ({ ...doc, snapshotId, snapshot })));
  }
  return documents.length === 1 ? documents[0] : void 0;
}
function addReference(references, snapshotId, turn, citationId) {
  if (!snapshotId || turn === void 0) return;
  const turns = references.get(snapshotId) ?? /* @__PURE__ */ new Map();
  const ids = turns.get(turn);
  if (ids !== null) {
    if (citationId === null) turns.set(turn, null);
    else if (ids) ids.add(citationId);
    else turns.set(turn, /* @__PURE__ */ new Set([citationId]));
  }
  references.set(snapshotId, turns);
}
function toolResult(value, schema) {
  return isRecord(value) && value.schema === schema && typeof value.snapshotId === "string" && value.snapshotId ? { snapshotId: value.snapshotId, citations: value.citations } : void 0;
}
var supplementalByHistory = /* @__PURE__ */ new WeakMap();
function visibleToolSource(value, countKey) {
  if (!isRecord(value) || typeof value.snapshotId !== "string" || !value.snapshotId) return;
  const count = value[countKey];
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) return;
  return {
    snapshotId: value.snapshotId,
    count,
    query: typeof value.query === "string" ? value.query : void 0,
    mode: typeof value.mode === "string" ? value.mode : void 0,
    coverage: value.coverage,
    evidenceStatus: typeof value.evidenceStatus === "string" ? value.evidenceStatus : void 0
  };
}
function collectReferences(entries, report) {
  const toolCalls = /* @__PURE__ */ new Map();
  let turn;
  for (const entry of entries) {
    if (!isRecord(entry) || entry.type !== "event" || !isRecord(entry.event)) continue;
    const event = entry.event;
    const data = event.data;
    if (!isRecord(data)) continue;
    switch (event.type) {
      case "turn/start":
        toolCalls.clear();
        turn = validTurn(data.turn) ? data.turn : void 0;
        break;
      case "turn/end":
        turn = void 0;
        toolCalls.clear();
        break;
      case "step/start":
        turn = validTurn(data.turn) ? data.turn : void 0;
        break;
      case "user/message":
        if (isRecord(data.source) && data.source.kind === "tbea-knowledge-prefetch") {
          const view = toolResult(data.source.view, "tbea-view/v1");
          if (view && turn !== void 0) report(view.snapshotId, turn, null);
        }
        break;
      case "tool/call":
        if (typeof data.callId === "string" && validTurn(data.turn) && (data.name === searchTool || data.name === detailTool)) {
          toolCalls.set(data.callId, { name: data.name, turn: data.turn, arguments: data.arguments });
        }
        break;
      case "tool/result": {
        const message = data.message;
        if (!isRecord(message) || message.isError || event.surfaceOp && event.surfaceOp !== "append") break;
        if (!isRecord(message.source) || typeof message.source.callId !== "string") break;
        const call = toolCalls.get(message.source.callId);
        if (!call || call.turn !== data.turn) break;
        const meta = toolResult(data.meta, "tbea-view/v1");
        const args = parseJson(call.arguments);
        let citationId = isRecord(args) && typeof args.citationId === "string" ? args.citationId : void 0;
        const text3 = (!meta || call.name === detailTool && !citationId) && Array.isArray(message.content) ? message.content.flatMap((part) => isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []).join("\n") : void 0;
        const parsedResult = parseJson(text3);
        const result = toolResult(parsedResult, "tbea-knowledge/v1");
        const snapshotId = meta?.snapshotId ?? result?.snapshotId;
        if (!snapshotId) break;
        if (call.name === searchTool) {
          report(snapshotId, call.turn, null, meta ? visibleToolSource(data.meta, "count") : result && visibleToolSource(parsedResult, "hitCount"));
        } else {
          const first = Array.isArray(result?.citations) ? result.citations[0] : void 0;
          if (!citationId && isRecord(first) && typeof first.citationId === "string") citationId = first.citationId;
          if (citationId) report(snapshotId, call.turn, citationId);
        }
        break;
      }
    }
  }
}
function citationReferences(entries) {
  const references = /* @__PURE__ */ new Map();
  collectReferences(entries, (snapshotId, turn, citationId) => addReference(references, snapshotId, turn, citationId));
  return references;
}
function supplementalSources(entries, turn) {
  let byTurn = supplementalByHistory.get(entries);
  if (!byTurn) {
    const indexed = /* @__PURE__ */ new Map();
    collectReferences(entries, (snapshotId, resultTurn, _citationId, source) => {
      if (!source) return;
      const views = indexed.get(resultTurn) ?? /* @__PURE__ */ new Map();
      views.set(snapshotId, source);
      indexed.set(resultTurn, views);
    });
    supplementalByHistory.set(entries, indexed);
    byTurn = indexed;
  }
  return [...byTurn.get(turn)?.values() ?? []];
}
function snapshotDocuments(snapshot) {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.citations) || snapshot.schema !== void 0 && snapshot.schema !== "tbea-snapshot/v1") {
    throw new Error("\u5386\u53F2\u6765\u6E90\u5FEB\u7167\u683C\u5F0F\u65E0\u6548\u3002");
  }
  return snapshot.citations.flatMap((citation) => {
    if (!isRecord(citation)) throw new Error("\u5386\u53F2\u6765\u6E90\u5FEB\u7167\u4E2D\u6709\u65E0\u6548\u7684\u5F15\u7528\u3002");
    const equivalents = Array.isArray(citation.equivalentSources) ? citation.equivalentSources : [];
    return [citation, ...equivalents].map((source) => {
      const value = isRecord(source) ? source : {};
      return {
        citationId: typeof value.citationId === "string" ? value.citationId : "",
        documentId: typeof value.documentId === "string" ? value.documentId : "",
        documentName: typeof value.documentName === "string" && value.documentName ? value.documentName : "\u77E5\u8BC6\u5E93\u6587\u6863",
        knowledgeBaseId: typeof value.knowledgeBaseId === "string" ? value.knowledgeBaseId : "",
        knowledgeBaseName: typeof value.knowledgeBaseName === "string" ? value.knowledgeBaseName : "",
        documentGroupId: typeof value.documentGroupId === "string" && /^[0-9a-f]{64}$/.test(value.documentGroupId) ? value.documentGroupId : void 0,
        documentVersion: typeof value.documentVersion === "string" ? value.documentVersion : void 0,
        effectiveDate: typeof value.effectiveDate === "string" ? value.effectiveDate : void 0
      };
    });
  });
}
function mergeCitedDocuments(references, snapshots, citedByTurn = /* @__PURE__ */ new Map()) {
  const grouped = /* @__PURE__ */ new Map();
  let unavailable = false;
  for (const [snapshotId, turns] of references) {
    for (const citation of snapshots.get(snapshotId)?.citations ?? []) {
      for (const [turn, selected] of turns) {
        if (!containsCitation(selected, citation.citationId)) continue;
        if (!citation.documentId || !citation.knowledgeBaseId) {
          unavailable = true;
          continue;
        }
        const key = citation.documentGroupId ?? JSON.stringify([citation.knowledgeBaseId, citation.documentId, citation.documentVersion, citation.effectiveDate]);
        const document4 = grouped.get(key) ?? { ...citation, key, turns: /* @__PURE__ */ new Set(), citedTurns: /* @__PURE__ */ new Set(), libraries: /* @__PURE__ */ new Set() };
        document4.turns.add(turn);
        if (citedByTurn.get(turn)?.has(citation.citationId)) document4.citedTurns.add(turn);
        if (citation.knowledgeBaseName) document4.libraries.add(citation.knowledgeBaseName);
        grouped.set(key, document4);
      }
    }
  }
  const documents = [...grouped.values()].map((document4) => ({
    ...document4,
    turns: [...document4.turns].sort((a, b) => b - a),
    citedTurns: [...document4.citedTurns].sort((a, b) => b - a),
    libraries: [...document4.libraries]
  })).sort((a, b) => b.turns[0] - a.turns[0]);
  return { documents, unavailable };
}
function waitForSession(session, signal, ready) {
  if (signal.aborted || ready(session.getSnapshot())) return Promise.resolve();
  let unsubscribe;
  let finish;
  const readyOrAborted = new Promise((resolve) => {
    finish = () => resolve();
    const changed = () => {
      if (ready(session.getSnapshot())) resolve();
    };
    unsubscribe = session.subscribe(changed);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted || ready(session.getSnapshot())) finish();
  });
  return readyOrAborted.finally(() => {
    unsubscribe?.();
    if (finish) signal.removeEventListener("abort", finish);
  });
}
function firstSequence(entries) {
  const entry = entries[0];
  return isRecord(entry) && isRecord(entry.event) ? entry.event.seq : void 0;
}
async function readCitationHistory({ session, eventSource }, signal) {
  await waitForSession(session, signal, (state) => state.openState === "open" || state.openState === "error");
  signal.throwIfAborted();
  if (session.getSnapshot().openState !== "open") throw new Error("\u65E0\u6CD5\u8BFB\u53D6\u5F53\u524D\u4F1A\u8BDD\u7684\u5386\u53F2\u8BB0\u5F55\u3002");
  while (eventSource.getSnapshot().hasMore) {
    signal.throwIfAborted();
    if (session.getSnapshot().loadingOlder) {
      await waitForSession(session, signal, (state) => !state.loadingOlder);
      continue;
    }
    const before = firstSequence(eventSource.getSnapshot().entries);
    await session.loadOlder();
    signal.throwIfAborted();
    const after = eventSource.getSnapshot();
    if (after.hasMore && firstSequence(after.entries) === before) throw new Error("\u8F83\u65E9\u7684\u4F1A\u8BDD\u8BB0\u5F55\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u3002");
  }
}

// plugin/src/cited-documents-view.tsx
function CitationLinks({ binding, bridge, renderEvidence }) {
  const marker = (0, import_react6.useRef)(null);
  const dialog = (0, import_react6.useRef)(null);
  const request = (0, import_react6.useRef)();
  const [preview, setPreview] = (0, import_react6.useState)();
  const [showOriginal, setShowOriginal] = (0, import_react6.useState)(false);
  const open = preview !== void 0;
  (0, import_react6.useEffect)(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);
  (0, import_react6.useEffect)(() => {
    if (!binding) return;
    const { eventSource } = binding;
    const scopeSelector = "[data-conversation-content][data-conversation-session]";
    const scope = marker.current?.closest(scopeSelector);
    if (!scope || scope.getAttribute("data-conversation-session") !== binding.sessionId) return;
    function click(event) {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest("button[title],a[href]");
      const id = target?.getAttribute(target.tagName === "BUTTON" ? "title" : "href");
      const row = target?.closest('[data-chat-turn]:is([data-chat-flow-kind="assistant-step"],[data-chat-flow-kind="assistant"],[data-chat-flow-kind="turn-tail"])');
      if (!id || !knowledgeCitationId.test(id) || !row || row.closest(scopeSelector) !== scope) return;
      const turn = Number(row.getAttribute("data-chat-turn"));
      if (!Number.isSafeInteger(turn) || turn < 0) return;
      event.preventDefault();
      event.stopPropagation();
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setShowOriginal(false);
      setPreview({});
      const missing = "\u5BF9\u5E94\u8F6E\u6B21\u6CA1\u6709\u53EF\u6253\u5F00\u7684\u77E5\u8BC6\u5E93\u5F15\u7528\u3002";
      void resolveAnswerCitation(
        eventSource.getSnapshot().entries,
        turn,
        id,
        (snapshotId) => bridge("snapshot", { snapshotId }, controller.signal)
      ).then((document5) => {
        if (!controller.signal.aborted) setPreview(document5 ? { document: document5 } : { error: missing });
      }, (error) => {
        if (!controller.signal.aborted) setPreview({ error: error instanceof Error ? error.message : missing });
      });
    }
    scope.addEventListener("click", click, true);
    return () => {
      scope.removeEventListener("click", click, true);
      request.current?.abort();
    };
  }, [binding, bridge]);
  const close = () => dialog.current?.close();
  const document4 = preview?.document;
  return /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, /* @__PURE__ */ import_react6.default.createElement("span", { hidden: true, ref: marker }), open && /* @__PURE__ */ import_react6.default.createElement(
    "dialog",
    {
      ref: dialog,
      className: "tbea-citation-dialog",
      "aria-label": "\u77E5\u8BC6\u5E93\u5F15\u7528",
      onClose: () => {
        request.current?.abort();
        setPreview(void 0);
      }
    },
    /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-library" }, document4 ? /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, /* @__PURE__ */ import_react6.default.createElement("header", { className: "tbea-citation-dialog-header" }, !showOriginal && /* @__PURE__ */ import_react6.default.createElement("h2", null, document4.documentName), !showOriginal && document4.documentId && /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: () => setShowOriginal(true) }, "\u67E5\u770B\u539F\u6587"), /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: close }, "\u5173\u95ED\u5F15\u7528")), showOriginal ? /* @__PURE__ */ import_react6.default.createElement(
      DocumentReader,
      {
        bridge,
        libraryId: document4.knowledgeBaseId,
        documentInfo: { id: document4.documentId, name: document4.documentName },
        requestPreview: true,
        backLabel: "\u8FD4\u56DE\u547D\u4E2D\u5207\u7247",
        close: () => setShowOriginal(false)
      }
    ) : /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-citation-evidence" }, renderEvidence(document4))) : /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-library-state", role: preview?.error ? "alert" : "status" }, preview?.error ?? "\u6B63\u5728\u6838\u5BF9\u5F15\u7528\u2026", " ", /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: close }, "\u5173\u95ED")))
  ));
}
function useCitationSnapshots(bridge, ids, revision) {
  const cache = (0, import_react6.useRef)(/* @__PURE__ */ new Map());
  const [snapshots, setSnapshots] = (0, import_react6.useState)(cache.current);
  (0, import_react6.useEffect)(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const requested = JSON.parse(ids);
    const pending = requested.filter((id) => {
      const cached = cache.current.get(id);
      return !cached || cached.errorRevision !== void 0 && cached.errorRevision < revision;
    });
    async function read() {
      for (let id = pending.shift(); id !== void 0 && !signal.aborted; id = pending.shift()) {
        let result;
        try {
          const snapshot = await bridge("snapshot", { snapshotId: id }, signal);
          result = { citations: snapshotDocuments(snapshot) };
        } catch {
          result = { errorRevision: revision };
        }
        if (signal.aborted) return;
        cache.current = new Map(cache.current).set(id, result);
        setSnapshots(cache.current);
      }
    }
    const workers = Math.min(pending.length, 4);
    for (let worker = 0; worker < workers; worker++) void read();
    return () => controller.abort();
  }, [bridge, ids, revision]);
  return snapshots;
}
function showChatTurn(event, openView, turn) {
  const view = event.currentTarget.closest('[data-slot="conversation.view"]');
  openView("chat", `turn:${turn}`);
  if (!view) return;
  const limit = performance.now() + 3e3;
  let anchor;
  const locate = (now) => {
    if (!view.isConnected || now >= limit) return;
    const rows = [...view.querySelectorAll(`[data-chat-turn="${turn}"][data-chat-anchor-key]:not([hidden]):not([hidden] *)`)].filter((row) => row.getClientRects().length > 0 && row.offsetHeight > 0);
    const target = rows.find((row) => row.dataset.chatFlowKind === "input-message") ?? rows[0];
    if (!target || target !== anchor) {
      anchor = target;
      requestAnimationFrame(locate);
      return;
    }
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
  };
  requestAnimationFrame(locate);
}
function CitedDocumentsView({ binding, ...props }) {
  return binding ? /* @__PURE__ */ import_react6.default.createElement(SessionDocuments, { key: binding.sessionId, binding, ...props }) : /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-library-state", role: "status" }, "\u6B63\u5728\u8FDE\u63A5\u5F53\u524D\u4F1A\u8BDD\u2026");
}
function SessionDocuments({ binding, bridge, openView }) {
  const { eventSource } = binding;
  const subscribe = (0, import_react6.useCallback)((listener) => eventSource.subscribe(listener), [eventSource]);
  const getWindow = (0, import_react6.useCallback)(() => eventSource.getSnapshot(), [eventSource]);
  const history = (0, import_react6.useSyncExternalStore)(subscribe, getWindow, getWindow);
  const [revision, setRevision] = (0, import_react6.useState)(0);
  const [historyStatus, setHistoryStatus] = (0, import_react6.useState)({ loading: true });
  const [selected, setSelected] = (0, import_react6.useState)();
  (0, import_react6.useEffect)(() => {
    const controller = new AbortController();
    setHistoryStatus({ loading: true });
    readCitationHistory(binding, controller.signal).then(() => {
      if (!controller.signal.aborted) setHistoryStatus({ loading: false });
    }, (error) => {
      if (!controller.signal.aborted) setHistoryStatus({
        loading: false,
        error: error instanceof Error ? error.message : "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u4F1A\u8BDD\u8BB0\u5F55\u3002"
      });
    });
    return () => controller.abort();
  }, [binding, revision]);
  const references = (0, import_react6.useMemo)(() => citationReferences(history.entries), [history]);
  const citedByTurn = (0, import_react6.useMemo)(() => answerCitationIds(history.entries), [history]);
  const ids = [...references.keys()];
  const snapshots = useCitationSnapshots(bridge, JSON.stringify(ids.sort()), revision);
  const { documents, unavailable } = (0, import_react6.useMemo)(() => mergeCitedDocuments(references, snapshots, citedByTurn), [references, snapshots, citedByTurn]);
  const loading = historyStatus.loading || ids.some((id) => {
    const snapshot = snapshots.get(id);
    return !snapshot || snapshot.errorRevision !== void 0 && snapshot.errorRevision < revision;
  });
  const snapshotError = ids.some((id) => snapshots.get(id)?.errorRevision === revision);
  const incomplete = historyStatus.error || snapshotError || unavailable;
  const document4 = documents.find((item) => item.key === selected);
  return /* @__PURE__ */ import_react6.default.createElement("section", { className: "tbea-library tbea-cited-documents", "aria-label": "\u5F15\u7528\u6587\u6863" }, document4 ? /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-cited-preview" }, /* @__PURE__ */ import_react6.default.createElement(
    DocumentReader,
    {
      key: document4.key,
      bridge,
      libraryId: document4.knowledgeBaseId,
      documentInfo: { id: document4.documentId, name: document4.documentName },
      requestPreview: true,
      backLabel: "\u8FD4\u56DE\u5F15\u7528\u6587\u6863",
      close: () => setSelected(void 0)
    }
  )) : /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, loading && /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-library-state", role: "status" }, /* @__PURE__ */ import_react6.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u6C47\u603B\u4F1A\u8BDD\u5F15\u7528\u2026"), incomplete && /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-library-state tbea-library-error", role: "status" }, /* @__PURE__ */ import_react6.default.createElement("span", null, historyStatus.error || (snapshotError ? "\u90E8\u5206\u53C2\u8003\u6765\u6E90\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u3002" : "\u90E8\u5206\u53C2\u8003\u6765\u6E90\u7F3A\u5C11\u6587\u6863\u6807\u8BC6\uFF0C\u53EF\u5728\u5BF9\u5E94\u8F6E\u6B21\u67E5\u770B\u3002")), (historyStatus.error || snapshotError) && /* @__PURE__ */ import_react6.default.createElement("button", { className: "tbea-library-button", type: "button", onClick: () => setRevision((value) => value + 1) }, "\u91CD\u8BD5")), !loading && !incomplete && !documents.length && /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-library-state" }, "\u672C\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u516C\u53F8\u77E5\u8BC6\u5E93\u5F15\u7528\u6587\u6863\u3002"), /* @__PURE__ */ import_react6.default.createElement("ul", { className: "tbea-cited-list", "aria-label": "\u672C\u4F1A\u8BDD\u7684\u77E5\u8BC6\u6587\u6863" }, documents.map((item) => /* @__PURE__ */ import_react6.default.createElement("li", { key: item.key, className: "tbea-cited-row" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "tbea-cited-document" }, /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "tbea-cited-name", onClick: () => setSelected(item.key) }, /* @__PURE__ */ import_react6.default.createElement(FileText, { size: 16, "aria-hidden": "true" }), /* @__PURE__ */ import_react6.default.createElement("span", null, item.documentName)), /* @__PURE__ */ import_react6.default.createElement("p", null, item.libraries.join("\u3001") || "\u516C\u53F8\u77E5\u8BC6\u5E93", " \xB7 ", item.turns.length === 1 ? `\u7B2C ${item.turns[0]} \u8F6E` : `\u5F15\u7528\u4E8E ${item.turns.length} \u8F6E`, item.citedTurns.length > 0 && /* @__PURE__ */ import_react6.default.createElement("span", { className: "tbea-cited-status" }, "\u6B63\u6587\u5DF2\u5F15\u7528")), (item.documentVersion || item.effectiveDate) && /* @__PURE__ */ import_react6.default.createElement("p", null, [item.documentVersion, item.effectiveDate && `${item.effectiveDate} \u751F\u6548`].filter(Boolean).join(" \xB7 "))), item.turns.length === 1 ? /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: (event) => showChatTurn(event, openView, item.turns[0]) }, "\u67E5\u770B\u5F15\u7528") : /* @__PURE__ */ import_react6.default.createElement("details", { className: "tbea-cited-turns" }, /* @__PURE__ */ import_react6.default.createElement("summary", { className: "tbea-library-button" }, "\u67E5\u770B\u5F15\u7528"), /* @__PURE__ */ import_react6.default.createElement("ul", null, item.turns.map((turn) => /* @__PURE__ */ import_react6.default.createElement("li", { key: turn }, /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: (event) => showChatTurn(event, openView, turn) }, "\u7B2C ", turn, " \u8F6E"))))))))));
}

// plugin/src/client.jsx
var inject = ["slots", "commandUi", "uiConversation", "sessions"];
function apply(ctx) {
  const bridge = async (endpoint, args, signal) => {
    const response = await fetch(new URL(displayPath.slice(1), document.baseURI), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint, args }),
      signal
    });
    const mediaType = response.headers.get("content-type");
    if (response.ok && (mediaType?.startsWith("image/") || ["library-pdf-range", "library-sheet-range"].includes(endpoint) && mediaType === "application/octet-stream")) {
      return { mediaType, bytes: new Uint8Array(await response.arrayBuffer()) };
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      throw Object.assign(new Error(result?.error?.message || `\u77E5\u8BC6\u5C55\u793A\u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${response.status}\uFF09`), { code: result?.error?.code });
    }
    return result.value;
  };
  const selection = createSelectionClient(bridge);
  registerKnowledgeEntries(ctx, selection);
  ctx.effect(() => ctx.uiConversation.events.register(prefetchDefinition), "tbea: prefetch history");
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.textContent = style_default;
    tag.dataset.plugin = "dsh-plugin-tbea-knowledge";
    document.head.append(tag);
    return () => tag.remove();
  }, "tbea: styles");
  const libraryPanel = "tbea-knowledge-library";
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: libraryPanel, inject: () => ({ bridge }) }, LibraryBrowser));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: libraryPanel,
    order: 20,
    label: () => "\u77E5\u8BC6\u5E93\u76EE\u5F55"
  }, LibraryPanelIcon));
  for (const key of ["mcp__tbea__search_knowledge", "mcp__tbea__get_chunk_detail"]) {
    ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
      name: "tool.call.toolview",
      key,
      inject: () => ({ bridge })
    }, KnowledgeTool));
  }
  ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
    name: "conversation.input.dock",
    id: "tbea-knowledge",
    order: -10,
    inject: (sessionId) => ({ selection, selectionSessionId: sessionId, bridge, binding: ctx.sessions.binding(sessionId) })
  }, (props) => /* @__PURE__ */ import_react7.default.createElement(import_react7.default.Fragment, null, /* @__PURE__ */ import_react7.default.createElement(KnowledgeSelection, { ...props }), /* @__PURE__ */ import_react7.default.createElement(
    CitationLinks,
    {
      bridge: props.bridge,
      binding: props.binding,
      renderEvidence: (document4) => /* @__PURE__ */ import_react7.default.createElement(
        Sources,
        {
          key: document4.citationId,
          bridge: props.bridge,
          view: { snapshotId: document4.snapshotId, count: document4.snapshot.citations.length },
          initialSnapshot: document4.snapshot,
          focusCitationId: document4.citationId
        }
      )
    }
  ))));
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "tbea-knowledge-prefetch",
    inject: () => ({ bridge })
  }, PrefetchedKnowledge));
  ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
    name: "conversation.chat.turnTail",
    id: "tbea-supplemental-sources",
    inject: (sessionId) => ({ bridge, binding: ctx.sessions.binding(sessionId) })
  }, SupplementalKnowledge));
  ctx.slots.inject("conversation.view", () => ctx.slots.register({
    name: "conversation.view",
    id: "tbea-cited-documents",
    order: 50,
    label: () => "\u5F15\u7528\u6587\u6863",
    inject: (sessionId) => ({ bridge, binding: ctx.sessions.binding(sessionId) })
  }, CitedDocumentsView));
}
function SupplementalKnowledge({ turn, binding, bridge }) {
  const eventSource = binding?.eventSource;
  const subscribe = (0, import_react7.useCallback)((listener) => eventSource?.subscribe(listener) ?? (() => {
  }), [eventSource]);
  const getWindow = (0, import_react7.useCallback)(() => eventSource?.getSnapshot(), [eventSource]);
  const history = (0, import_react7.useSyncExternalStore)(subscribe, getWindow, getWindow);
  const views = supplementalSources(history?.entries ?? [], turn?.turn);
  if (!views.length) return null;
  return /* @__PURE__ */ import_react7.default.createElement("section", { className: "tbea-prefetched", "aria-label": "\u8865\u5145\u68C0\u7D22\u7684\u53C2\u8003\u6765\u6E90" }, /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-prefetched-label" }, "\u8865\u5145\u68C0\u7D22"), views.map((view) => /* @__PURE__ */ import_react7.default.createElement(Sources, { key: view.snapshotId, view, bridge })));
}
function LibraryPanelIcon({ size = 16, className }) {
  return /* @__PURE__ */ import_react7.default.createElement(BookOpen, { size, className, "aria-hidden": "true" });
}
function KnowledgeSelection({ selection, selectionSessionId }) {
  const subscribe = (0, import_react7.useCallback)((listener) => selection.subscribe(selectionSessionId, listener), [selection, selectionSessionId]);
  const snapshot = (0, import_react7.useCallback)(() => selection.get(selectionSessionId), [selection, selectionSessionId]);
  const state = (0, import_react7.useSyncExternalStore)(subscribe, snapshot, snapshot);
  const serviceError = state.servicePhase === "error";
  const serviceStopped = state.servicePhase === "stopped";
  if (!state.selected && !state.error && !state.pending && !serviceError && !serviceStopped && state.servicePhase !== "starting") return null;
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-selection-dock" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-selection", "aria-label": "\u516C\u53F8\u77E5\u8BC6\u5E93\u6765\u6E90\u9009\u62E9" }, state.selected ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-selection-chip" }, /* @__PURE__ */ import_react7.default.createElement(BookOpen, { size: 14 }), /* @__PURE__ */ import_react7.default.createElement("span", null, "\u516C\u53F8\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", "aria-label": "\u53D6\u6D88\u516C\u53F8\u77E5\u8BC6\u5E93", title: state.autoRetrieveKnowledge === false ? "\u53D6\u6D88\u540E\uFF0C\u9700\u624B\u52A8\u9009\u62E9\u624D\u4F1A\u67E5\u8BE2\u516C\u53F8\u77E5\u8BC6\u5E93" : "\u53D6\u6D88\u540E\u7531\u6A21\u578B\u6309\u9700\u5224\u65AD\u662F\u5426\u67E5\u5E93", disabled: state.pending, onClick: () => {
    void selection.select(selectionSessionId, false);
  } }, /* @__PURE__ */ import_react7.default.createElement(X, { size: 13 }))) : null, state.pending || state.phase === "searching" ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-selection-status", role: "status" }, /* @__PURE__ */ import_react7.default.createElement(LoaderCircle, { size: 13, className: "tbea-spin" }), state.pending ? state.pendingAction === "service" ? "\u6B63\u5728\u542F\u52A8\u516C\u53F8\u77E5\u8BC6\u670D\u52A1\u2026" : "\u6B63\u5728\u4FDD\u5B58\u9009\u62E9\u2026" : state.message) : null, state.phase === "partial" && !state.pending ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-selection-status", role: "status" }, state.message) : null, state.servicePhase === "starting" && !state.pending ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-selection-status", role: "status" }, /* @__PURE__ */ import_react7.default.createElement(LoaderCircle, { size: 13, className: "tbea-spin" }), "\u6B63\u5728\u542F\u52A8\u516C\u53F8\u77E5\u8BC6\u670D\u52A1\u2026") : null, serviceStopped ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-selection-status", role: "status" }, state.serviceMessage) : null, state.error || serviceError || state.phase === "error" || state.phase === "stopped" ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-selection-error", role: "alert" }, state.error || (serviceError ? state.serviceMessage : state.message), serviceError ? /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-icon", type: "button", title: "\u91CD\u8BD5\u542F\u52A8\u77E5\u8BC6\u670D\u52A1", "aria-label": "\u91CD\u8BD5\u542F\u52A8\u77E5\u8BC6\u670D\u52A1", disabled: state.pending, onClick: () => {
    void selection.retry(selectionSessionId);
  } }, /* @__PURE__ */ import_react7.default.createElement(RefreshCw, { size: 16 })) : null) : null));
}
function PrefetchedKnowledge({ node: node2, bridge }) {
  const view = node2.data?.view;
  if (view?.schema !== "tbea-view/v1") return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-error", role: "alert" }, "\u516C\u53F8\u77E5\u8BC6\u68C0\u7D22\u8BB0\u5F55\u7F3A\u5C11\u6765\u6E90\u4FE1\u606F\uFF0C\u8BF7\u67E5\u770B\u8FD0\u884C\u8F68\u8FF9\u3002");
  if (view.clarification) return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-status", role: "status" }, view.clarification);
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-prefetched" }, /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-prefetched-label" }, "\u5DF2\u5148\u68C0\u7D22\u516C\u53F8\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react7.default.createElement(Sources, { view, bridge }));
}
function textOf(block) {
  return (block?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}
function errorOf(block) {
  const text3 = textOf(block);
  try {
    const data = JSON.parse(text3);
    return data.message || text3;
  } catch {
    return text3;
  }
}
function viewOf(block) {
  if (block?.meta?.schema === "tbea-view/v1") return block.meta;
  try {
    const data = JSON.parse(textOf(block));
    return data.schema === "tbea-knowledge/v1" ? { snapshotId: data.snapshotId, count: data.hitCount, query: data.query, mode: data.mode, coverage: data.coverage, evidenceStatus: data.evidenceStatus } : null;
  } catch {
    return null;
  }
}
function KnowledgeTool(props) {
  const result = props.phase === "result";
  const view = result ? viewOf(props.block) : null;
  if (!result) return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react7.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u68C0\u7D22\u516C\u53F8\u77E5\u8BC6\u2026");
  if (props.block.isError) return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-error", role: "alert" }, "\u77E5\u8BC6\u68C0\u7D22\u5931\u8D25\uFF1A", errorOf(props.block) || "\u8BF7\u6C42\u5DF2\u505C\u6B62\u6216\u672A\u5B8C\u6210");
  if (!view?.snapshotId) return /* @__PURE__ */ import_react7.default.createElement("pre", { className: "tbea-fallback" }, textOf(props.block) || "\u5F53\u524D\u7ED3\u679C\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u6765\u6E90\u4FE1\u606F");
  return /* @__PURE__ */ import_react7.default.createElement(Sources, { view, bridge: props.bridge });
}
function Sources({ view, bridge, initialSnapshot, focusCitationId }) {
  const panelId = (0, import_react7.useId)();
  const [open, setOpen] = (0, import_react7.useState)(Boolean(focusCitationId));
  const [snapshot, setSnapshot] = (0, import_react7.useState)(initialSnapshot ?? null);
  const [error, setError] = (0, import_react7.useState)("");
  const [loading, setLoading] = (0, import_react7.useState)(false);
  const [revision, setRevision] = (0, import_react7.useState)(0);
  const coverage = view.coverage || snapshot?.coverage;
  const partial = coverage && coverage.completed < coverage.requested;
  (0, import_react7.useEffect)(() => {
    if (!open || initialSnapshot && revision === 0) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    bridge("snapshot", { snapshotId: view.snapshotId }, controller.signal).then((value) => {
      if (!controller.signal.aborted) setSnapshot(value);
    }).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [open, view.snapshotId, bridge, revision, initialSnapshot]);
  const focus = focusCitationId && snapshot?.citations.flatMap((c) => [c, ...c.equivalentSources ?? []]).find((c) => c.citationId === focusCitationId);
  return /* @__PURE__ */ import_react7.default.createElement("section", { className: "tbea-sources", "aria-label": "\u516C\u53F8\u77E5\u8BC6\u53C2\u8003\u6765\u6E90" }, /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-source-toggle", type: "button", "aria-expanded": open, "aria-controls": panelId, onClick: () => setOpen(!open) }, open ? /* @__PURE__ */ import_react7.default.createElement(ChevronDown, { size: 16 }) : /* @__PURE__ */ import_react7.default.createElement(ChevronRight, { size: 16 }), /* @__PURE__ */ import_react7.default.createElement(BookOpen, { size: 16 }), /* @__PURE__ */ import_react7.default.createElement("strong", null, "\u53C2\u8003\u6765\u6E90"), /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-count" }, view.count ?? "\u2014"), /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-query", title: view.query }, view.query), view.mode === "mock" ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-demo" }, "\u6F14\u793A") : null, partial ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-count", title: "\u90E8\u5206\u77E5\u8BC6\u5E93\u672A\u5B8C\u6210\u68C0\u7D22" }, "\u5DF2\u67E5 ", coverage.completed, "/", coverage.requested, " \u5E93") : null, coverage && !partial && coverage.available > coverage.requested ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-count", title: "\u5DF2\u4ECE\u76F8\u5173\u6388\u6743\u5E93\u83B7\u5F97\u8BC1\u636E" }, "\u4F18\u5148\u67E5 ", coverage.requested, "/", coverage.available, " \u5E93") : null, view.evidenceStatus === "partial" ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-count", title: "\u53EA\u627E\u5230\u90E8\u5206\u6240\u95EE\u4E8B\u9879\u7684\u4F9D\u636E" }, "\u90E8\u5206\u6709\u4F9D\u636E") : null), open ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-source-body", id: panelId, "aria-busy": loading }, loading ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react7.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u8BFB\u53D6\u6765\u6E90\u2026") : null, error ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-error", role: "alert" }, error, /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "tbea-icon", title: "\u91CD\u65B0\u8BFB\u53D6\u6765\u6E90", onClick: () => setRevision((r) => r + 1) }, /* @__PURE__ */ import_react7.default.createElement(RefreshCw, { size: 15 }))) : null, !loading && !error && snapshot?.citations.length === 0 ? /* @__PURE__ */ import_react7.default.createElement("p", { className: "tbea-empty" }, view.clarification || (snapshot.retrievalSkipped ? "\u672C\u6B21\u95EE\u9898\u65E0\u9700\u67E5\u8BE2\u516C\u53F8\u77E5\u8BC6\u5E93\u3002" : partial ? "\u672C\u6B21\u68C0\u7D22\u8303\u56F4\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u68C0\u7D22\u7684\u77E5\u8BC6\u5E93\u4E2D\u672A\u627E\u5230\u76F8\u5173\u4F9D\u636E\uFF0C\u53EF\u91CD\u65B0\u53D1\u9001\u95EE\u9898\u3002" : "\u672A\u68C0\u7D22\u5230\u76F8\u5173\u4F9D\u636E\uFF0C\u8BF7\u8865\u5145\u4EA7\u54C1\u3001\u5730\u533A\u6216\u6807\u51C6\u7248\u672C\u7B49\u6761\u4EF6\u3002")) : null, !loading && !error && focus && /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-citation-group tbea-citation-focused", "aria-label": "\u547D\u4E2D\u5207\u7247" }, /* @__PURE__ */ import_react7.default.createElement(Citation, { citation: focus, snapshotId: view.snapshotId, bridge, onRefresh: setSnapshot, initiallyExpanded: true })), !loading && !error && snapshot?.citations.map((c) => {
    const equivalents = c.equivalentSources?.filter((source) => source.citationId !== focusCitationId);
    if (c.citationId === focusCitationId && !equivalents?.length) return null;
    return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-citation-group", key: c.citationId }, c.citationId !== focusCitationId && /* @__PURE__ */ import_react7.default.createElement(Citation, { citation: c, snapshotId: view.snapshotId, bridge, onRefresh: setSnapshot }), equivalents?.length ? /* @__PURE__ */ import_react7.default.createElement(EquivalentSources, { sources: equivalents, snapshotId: view.snapshotId, bridge, onRefresh: setSnapshot }) : null);
  })) : null);
}
function EquivalentSources({ sources, snapshotId, bridge, onRefresh }) {
  const [open, setOpen] = (0, import_react7.useState)(false);
  return /* @__PURE__ */ import_react7.default.createElement("details", { className: "tbea-related-sources", onToggle: (event) => setOpen(event.currentTarget.open) }, /* @__PURE__ */ import_react7.default.createElement("summary", null, "\u5176\u4ED6\u6765\u6E90\uFF08", sources.length, "\uFF09"), open ? sources.map((source) => /* @__PURE__ */ import_react7.default.createElement(Citation, { key: source.citationId, citation: source, snapshotId, bridge, onRefresh })) : null);
}
async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const ok = document.execCommand("copy");
  input.remove();
  if (!ok) throw new Error("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u9009\u4E2D\u6587\u5B57\u540E\u6309 Ctrl+C");
}
function Citation({ citation: c, snapshotId, bridge, onRefresh, initiallyExpanded = false }) {
  const contentId = (0, import_react7.useId)();
  const detailId = (0, import_react7.useId)();
  const hasPreview = c.content.length > 220 || c.content.split(/\r?\n/).length > 5;
  const [expanded, setExpanded] = (0, import_react7.useState)(initiallyExpanded);
  const [detail, setDetail] = (0, import_react7.useState)(false);
  const [busy, setBusy] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)("");
  const [copied, setCopied] = (0, import_react7.useState)(false);
  const timer = (0, import_react7.useRef)();
  (0, import_react7.useEffect)(() => () => clearTimeout(timer.current), []);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      onRefresh(await bridge("refresh", { snapshotId, citationId: c.citationId }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await copyText([c.documentName, c.content, ...c.tables.map((t) => t.rows.map((row) => row.map((cell) => cell.text).join("	")).join("\n"))].filter(Boolean).join("\n\n"));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError(e.message);
    }
  }
  return /* @__PURE__ */ import_react7.default.createElement("article", { className: "tbea-citation", "data-tbea-citation": c.citationId }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-citation-head" }, /* @__PURE__ */ import_react7.default.createElement(FileText, { size: 16 }), /* @__PURE__ */ import_react7.default.createElement("strong", { title: c.documentName }, c.documentName), /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-icon", type: "button", title: copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", "aria-label": copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", onClick: copy }, copied ? /* @__PURE__ */ import_react7.default.createElement(Check, { size: 16 }) : /* @__PURE__ */ import_react7.default.createElement(Copy, { size: 16 })), /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-sr-only", role: "status" }, copied ? "\u5207\u7247\u5185\u5BB9\u5DF2\u590D\u5236" : "")), /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-meta" }, /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-citation-id", title: "\u56DE\u7B54\u5BF9\u5E94\u7684\u5F15\u7528\u7F16\u53F7" }, c.citationId), /* @__PURE__ */ import_react7.default.createElement("span", null, c.knowledgeBaseName), c.page ? /* @__PURE__ */ import_react7.default.createElement("span", null, "\u7B2C ", c.page, " \u9875") : null, c.documentVersion ? /* @__PURE__ */ import_react7.default.createElement("span", null, "\u7248\u672C ", c.documentVersion) : null, c.effectiveDate ? /* @__PURE__ */ import_react7.default.createElement("span", null, c.effectiveDate, " \u751F\u6548") : null, typeof c.score === "number" ? /* @__PURE__ */ import_react7.default.createElement("span", { title: "\u68C0\u7D22\u76F8\u5173\u5206\u6570\uFF0C\u4E0D\u4EE3\u8868\u7B54\u6848\u6B63\u786E\u7387" }, "\u76F8\u5173\u5206\u6570 ", c.score.toFixed(3)) : null), c.content ? /* @__PURE__ */ import_react7.default.createElement("p", { id: contentId, className: `tbea-content ${hasPreview && !expanded ? "tbea-collapsed" : ""}` }, c.content) : null, hasPreview ? /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-text-button", type: "button", "aria-expanded": expanded, "aria-controls": contentId, onClick: () => setExpanded(!expanded) }, expanded ? "\u6536\u8D77\u6587\u5B57" : "\u5C55\u5F00\u6587\u5B57") : null, c.tables.map((table, index2) => /* @__PURE__ */ import_react7.default.createElement(Table, { key: index2, table, index: index2 })), c.images.length ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-gallery" }, c.images.map((image) => /* @__PURE__ */ import_react7.default.createElement(ImagePreview, { key: image.id, image, snapshotId, bridge }))) : null, /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-citation-actions" }, /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-text-button", type: "button", "aria-expanded": detail, "aria-controls": detailId, onClick: () => setDetail(!detail) }, detail ? "\u6536\u8D77\u5207\u7247\u8BE6\u60C5" : "\u5207\u7247\u8BE6\u60C5"), /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-icon", type: "button", disabled: busy, title: "\u91CD\u65B0\u83B7\u53D6\u5E73\u53F0\u5207\u7247\u8BE6\u60C5", "aria-label": "\u91CD\u65B0\u83B7\u53D6\u5E73\u53F0\u5207\u7247\u8BE6\u60C5", onClick: refresh }, busy ? /* @__PURE__ */ import_react7.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }) : /* @__PURE__ */ import_react7.default.createElement(RefreshCw, { size: 16 }))), detail ? /* @__PURE__ */ import_react7.default.createElement("dl", { className: "tbea-details", id: detailId }, /* @__PURE__ */ import_react7.default.createElement("dt", null, "\u6587\u6863"), /* @__PURE__ */ import_react7.default.createElement("dd", null, c.documentName), /* @__PURE__ */ import_react7.default.createElement("dt", null, "\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react7.default.createElement("dd", null, c.knowledgeBaseName), /* @__PURE__ */ import_react7.default.createElement("dt", null, "\u5207\u7247 ID"), /* @__PURE__ */ import_react7.default.createElement("dd", null, c.chunkId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react7.default.createElement("dt", null, "\u6587\u6863 ID"), /* @__PURE__ */ import_react7.default.createElement("dd", null, c.documentId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react7.default.createElement("dt", null, "\u77E5\u8BC6\u5E93 ID"), /* @__PURE__ */ import_react7.default.createElement("dd", null, c.knowledgeBaseId)) : null, error ? /* @__PURE__ */ import_react7.default.createElement("p", { className: "tbea-error", role: "alert" }, error) : null);
}
function Table({ table, index: index2 }) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-table-scroll", tabIndex: 0, role: "region", "aria-label": `\u5207\u7247\u8868\u683C ${index2 + 1}` }, /* @__PURE__ */ import_react7.default.createElement("table", { className: "tbea-table" }, /* @__PURE__ */ import_react7.default.createElement("tbody", null, table.rows.map((row, r) => /* @__PURE__ */ import_react7.default.createElement("tr", { key: r }, row.map((cell, column) => {
    const Tag = cell.header ? "th" : "td";
    return /* @__PURE__ */ import_react7.default.createElement(Tag, { key: column, colSpan: cell.colSpan, rowSpan: cell.rowSpan }, cell.text);
  }))))));
}
function ImagePreview({ image, snapshotId, bridge }) {
  const [src, setSrc] = (0, import_react7.useState)("");
  const [error, setError] = (0, import_react7.useState)("");
  const [retry, setRetry] = (0, import_react7.useState)(0);
  const [open, setOpen] = (0, import_react7.useState)(false);
  (0, import_react7.useEffect)(() => {
    const controller = new AbortController();
    let objectUrl;
    setError("");
    setSrc("");
    bridge("asset", { snapshotId, imageId: image.id }, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([result.bytes], { type: result.mediaType }));
      setSrc(objectUrl);
    }).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [snapshotId, image.id, bridge, retry]);
  return /* @__PURE__ */ import_react7.default.createElement("figure", { className: "tbea-image" }, /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-image-button", type: "button", title: "\u67E5\u770B\u5927\u56FE", "aria-label": "\u67E5\u770B\u5927\u56FE", disabled: !src, onClick: () => setOpen(true) }, src ? /* @__PURE__ */ import_react7.default.createElement("img", { src, alt: image.caption || "\u77E5\u8BC6\u5E93\u5173\u8054\u56FE\u7247", onError: () => {
    setError("\u56FE\u7247\u65E0\u6CD5\u89E3\u7801\uFF0C\u8BF7\u5237\u65B0\u5207\u7247\u540E\u91CD\u8BD5");
    setSrc("");
  } }) : error ? /* @__PURE__ */ import_react7.default.createElement(Image, { size: 24 }) : /* @__PURE__ */ import_react7.default.createElement(LoaderCircle, { size: 20, className: "tbea-spin" })), image.caption ? /* @__PURE__ */ import_react7.default.createElement("figcaption", null, image.caption) : null, error ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-error" }, error, /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-icon", title: "\u91CD\u8BD5\u56FE\u7247", type: "button", onClick: () => setRetry((r) => r + 1) }, /* @__PURE__ */ import_react7.default.createElement(RefreshCw, { size: 15 }))) : null, open && src ? /* @__PURE__ */ import_react7.default.createElement(ImageModal, { src, caption: image.caption || "\u77E5\u8BC6\u5E93\u5173\u8054\u56FE\u7247", onClose: () => setOpen(false) }) : null);
}
function ImageModal({ src, caption, onClose }) {
  const [scale, setScale] = (0, import_react7.useState)(1);
  const [natural, setNatural] = (0, import_react7.useState)();
  const [fit, setFit] = (0, import_react7.useState)(1);
  const dialog = (0, import_react7.useRef)();
  const viewport = (0, import_react7.useRef)();
  const closeButton = (0, import_react7.useRef)();
  (0, import_react7.useEffect)(() => {
    const node2 = dialog.current;
    const previous2 = document.activeElement;
    node2.showModal();
    closeButton.current?.focus();
    return () => {
      node2.close();
      if (previous2?.isConnected) previous2.focus();
    };
  }, []);
  (0, import_react7.useEffect)(() => {
    if (!natural) return;
    const node2 = viewport.current;
    const update = () => setFit(Math.max(0.01, Math.min((node2.clientWidth - 32) / natural.width, (node2.clientHeight - 32) / natural.height, 1)));
    const observer = new ResizeObserver(update);
    observer.observe(node2);
    update();
    return () => observer.disconnect();
  }, [natural]);
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const items = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return /* @__PURE__ */ import_react7.default.createElement("dialog", { className: "tbea-image-modal", ref: dialog, "aria-label": caption, onKeyDown: keepFocus, onCancel: (event) => {
    event.preventDefault();
    onClose();
  }, onClick: (event) => {
    if (event.target === event.currentTarget) onClose();
  } }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-modal-head" }, /* @__PURE__ */ import_react7.default.createElement("strong", { title: caption }, caption), /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-modal-tools", role: "toolbar", "aria-label": "\u56FE\u7247\u9884\u89C8\u5DE5\u5177" }, /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-icon", title: "\u7F29\u5C0F", "aria-label": "\u7F29\u5C0F", type: "button", disabled: scale <= 0.5, onClick: () => setScale((s) => Math.max(0.5, s - 0.25)) }, /* @__PURE__ */ import_react7.default.createElement(ZoomOut, { size: 16 })), /* @__PURE__ */ import_react7.default.createElement("span", { className: "tbea-zoom-label", role: "status", "aria-label": "\u76F8\u5BF9\u9002\u914D\u5C3A\u5BF8\u7684\u7F29\u653E\u6BD4\u4F8B" }, Math.round(scale * 100), "%"), /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-icon", title: "\u6062\u590D\u5927\u5C0F", "aria-label": "\u6062\u590D\u5927\u5C0F", type: "button", onClick: () => setScale(1) }, /* @__PURE__ */ import_react7.default.createElement(RotateCcw, { size: 16 })), /* @__PURE__ */ import_react7.default.createElement("button", { className: "tbea-icon", title: "\u653E\u5927", "aria-label": "\u653E\u5927", type: "button", disabled: scale >= 4, onClick: () => setScale((s) => Math.min(4, s + 0.25)) }, /* @__PURE__ */ import_react7.default.createElement(ZoomIn, { size: 16 })), /* @__PURE__ */ import_react7.default.createElement("a", { className: "tbea-icon", title: "\u4E0B\u8F7D\u56FE\u7247", "aria-label": "\u4E0B\u8F7D\u56FE\u7247", href: src, download: "\u77E5\u8BC6\u5E93\u56FE\u7247.png" }, /* @__PURE__ */ import_react7.default.createElement(Download, { size: 16 })), /* @__PURE__ */ import_react7.default.createElement("button", { ref: closeButton, className: "tbea-icon", title: "\u5173\u95ED\u56FE\u7247", "aria-label": "\u5173\u95ED\u56FE\u7247", type: "button", onClick: onClose }, /* @__PURE__ */ import_react7.default.createElement(X, { size: 16 })))), /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-modal-image", ref: viewport, tabIndex: 0, role: "region", "aria-label": "\u56FE\u7247\u9884\u89C8\u533A\u57DF" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "tbea-modal-canvas" }, /* @__PURE__ */ import_react7.default.createElement("img", { src, alt: caption, onLoad: (event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }), style: { width: natural ? natural.width * fit * scale : "100%", visibility: natural ? "visible" : "hidden" } }))));
}
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/arrow-left.js:
lucide-react/dist/esm/icons/book-open.js:
lucide-react/dist/esm/icons/check.js:
lucide-react/dist/esm/icons/chevron-down.js:
lucide-react/dist/esm/icons/chevron-right.js:
lucide-react/dist/esm/icons/copy.js:
lucide-react/dist/esm/icons/download.js:
lucide-react/dist/esm/icons/file-text.js:
lucide-react/dist/esm/icons/image.js:
lucide-react/dist/esm/icons/loader-circle.js:
lucide-react/dist/esm/icons/refresh-cw.js:
lucide-react/dist/esm/icons/rotate-ccw.js:
lucide-react/dist/esm/icons/search.js:
lucide-react/dist/esm/icons/x.js:
lucide-react/dist/esm/icons/zoom-in.js:
lucide-react/dist/esm/icons/zoom-out.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
return module.exports;}});
//# sourceMappingURL=client.js.map
