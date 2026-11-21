window.__ModuleLoader__.load({id:"dsh-plugin-tbea-knowledge",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
var import_react3 = __toESM(require("react"), 1);

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var import_react2 = require("react");

// node_modules/lucide-react/dist/esm/shared/src/utils.js
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
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
var style_default = '.tbea-sources,.tbea-citation,.tbea-image-modal { box-sizing:border-box; font:13px/1.65 "Microsoft YaHei",system-ui,sans-serif; letter-spacing:0; color:var(--tbea-text,#263b48); }\n.tbea-selection { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:6px 2px; font:12px/1.6 "Microsoft YaHei",system-ui,sans-serif; }\n.tbea-selection-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border:1px solid #c9dbe9; border-radius:7px; color:#275579; background:#edf5fc; }\n.tbea-selection-chip button { display:inline-flex; align-items:center; justify-content:center; padding:3px; border:0; border-radius:4px; color:inherit; background:transparent; cursor:pointer; }\n.tbea-selection-chip button:hover { background:#d9e9f7; }\n.tbea-selection-chip button:disabled { opacity:.5; cursor:wait; }\n.tbea-selection-status { display:inline-flex; align-items:center; gap:5px; color:#617584; }\n.tbea-selection-error { color:#b64035; overflow-wrap:anywhere; }\n.tbea-prefetched { width:100%; min-width:0; padding:4px 0; }\n.tbea-prefetched-label { font:12px/1.5 "Microsoft YaHei",system-ui,sans-serif; color:#617584; }\n.tbea-sources { margin:8px 0; width:100%; min-width:0; border:1px solid #d8e1e6; border-radius:8px; background:var(--tbea-surface,#fff); }\n.tbea-sources button,.tbea-image-modal button { font:inherit; cursor:pointer; }\n.tbea-source-toggle { display:flex; align-items:center; gap:8px; width:100%; min-height:42px; padding:8px 12px; border:0; border-radius:8px; background:transparent; color:inherit; text-align:left; }\n.tbea-source-toggle:hover { background:#f1f6f8; }\n.tbea-count { padding:0 6px; background:#edf3f7; color:#45657a; border-radius:4px; }\n.tbea-query { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#617584; font-size:12px; }\n.tbea-demo { color:#8b631d; background:#fff4d5; padding:0 6px; border-radius:4px; font-size:11px; }\n.tbea-source-body { border-top:1px solid #e4eaee; padding:0 14px; }\n.tbea-citation { padding:14px 0; border-bottom:1px solid #e4eaee; min-width:0; }\n.tbea-citation:last-child { border-bottom:0; }\n.tbea-citation-head { display:grid; grid-template-columns:16px auto minmax(0,1fr) 30px; align-items:start; gap:7px; }\n.tbea-citation-head strong { flex:1; min-width:0; overflow-wrap:anywhere; font-size:13px; }\n.tbea-citation-head>svg { flex-shrink:0; margin-top:3px; color:#46718a; }\n.tbea-citation-id { font:11px/22px Consolas,monospace; color:#46718a; overflow-wrap:anywhere; }\n.tbea-meta { display:flex; flex-wrap:wrap; gap:4px 14px; color:#687c89; font-size:11px; margin-top:5px; }\n.tbea-content { white-space:pre-wrap; overflow-wrap:anywhere; max-height:8.25em; overflow:hidden; margin:10px 0 4px; user-select:text; }\n.tbea-content.tbea-expanded { max-height:none; }\n.tbea-text-button { border:0; padding:2px 0; background:transparent; color:#246c8b; font-size:12px!important; }\n.tbea-icon { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; flex-shrink:0; color:#4b697c; border:1px solid transparent; border-radius:5px; background:transparent; text-decoration:none; }\n.tbea-icon:hover { background:#edf4f8; border-color:#d8e4eb; }\n.tbea-icon:disabled { opacity:.45; cursor:default; }\n.tbea-citation-actions { display:flex; align-items:center; gap:12px; margin-top:7px; }\n.tbea-table-scroll { max-width:100%; max-height:360px; overflow:auto; margin:12px 0; border:1px solid #d8e3e9; border-radius:5px; }\n.tbea-table { border-collapse:collapse; min-width:100%; font-size:12px; color:inherit; }\n.tbea-table th,.tbea-table td { border:1px solid #dce5eb; padding:7px 10px; text-align:left; white-space:pre-wrap; min-width:90px; max-width:500px; overflow-wrap:anywhere; vertical-align:top; }\n.tbea-table th { background:#edf4f8; font-weight:600; }\n.tbea-gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; margin:12px 0; }\n.tbea-image { margin:0; min-width:0; }\n.tbea-image-button { display:grid; place-items:center; position:relative; overflow:hidden; width:100%; height:160px; padding:6px; border:1px solid #dbe3e8; border-radius:6px; background:#f6f8fa; cursor:zoom-in!important; }\n.tbea-image-button img { display:block; position:absolute; inset:6px; width:calc(100% - 12px); height:calc(100% - 12px); object-fit:contain; }\n.tbea-image figcaption { margin-top:4px; color:#687c89; font-size:11px; overflow-wrap:anywhere; }\n.tbea-details { display:grid; grid-template-columns:80px minmax(0,1fr); gap:5px 8px; padding:10px 12px; margin:8px 0; background:#f2f6f8; border-radius:5px; font-size:12px; }\n.tbea-details dt { color:#687c89; }.tbea-details dd { margin:0; overflow-wrap:anywhere; user-select:text; }\n.tbea-error { display:flex; gap:8px; align-items:center; flex-wrap:wrap; color:#a43c35; font-size:12px; padding:8px 0; overflow-wrap:anywhere; }\n.tbea-status { display:flex; gap:8px; align-items:center; color:#617584; padding:10px 0; }.tbea-empty { color:#687c89; }\n.tbea-fallback { white-space:pre-wrap; overflow-wrap:anywhere; max-height:300px; overflow:auto; }\n.tbea-spin { animation:tbea-spin 1s linear infinite; }@keyframes tbea-spin { to { transform:rotate(360deg); } }\n.tbea-image-modal { position:fixed; inset:0; width:min(1100px,94vw); max-width:94vw; height:min(800px,90vh); max-height:90vh; margin:auto; padding:0; border:1px solid #c8d5df; border-radius:8px; background:#fff; overflow:hidden; }\n.tbea-image-modal::backdrop { background:rgba(16,26,35,.65); }\n.tbea-modal-head { display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:48px; padding:6px 12px; border-bottom:1px solid #dbe3e8; }\n.tbea-modal-head strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }.tbea-modal-head>div { display:flex; flex-shrink:0; }\n.tbea-modal-image { width:100%; height:calc(100% - 62px); overflow:auto; background:#eff3f5; }.tbea-modal-image img { display:block; height:auto; margin:0 auto; }\n.tbea-sources button:focus-visible,.tbea-image-modal button:focus-visible { outline:2px solid #3181a1; outline-offset:2px; }\n@media(prefers-color-scheme:dark) { .tbea-sources { --tbea-surface:#20272c; --tbea-text:#dce5eb; border-color:#46545e; }.tbea-source-toggle:hover,.tbea-details { background:#2c363d; }.tbea-table th { background:#2d3c45; }.tbea-image-button { background:#dde5ea; }.tbea-meta,.tbea-query { color:#a7bac7; } }\n@media(max-width:600px) { .tbea-citation-head { flex-wrap:wrap; }.tbea-citation-head strong { flex-basis:65%; }.tbea-source-body { padding:0 10px; }.tbea-modal-head { flex-wrap:wrap; }.tbea-modal-head strong { width:100%; }.tbea-modal-image { height:calc(100% - 98px); } }\n';

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
      publish(row, { pending: true, error: "" });
      try {
        const value = await rpc("select", { sessionId: id, selected });
        publish(row, { ...value, loading: false, phase: "", message: "", error: "" });
      } catch (error) {
        row.selectError = `\u516C\u53F8\u77E5\u8BC6\u5E93\u5F00\u5173\u4FDD\u5B58\u5931\u8D25\uFF1A${error.message}`;
        publish(row, { loading: false, error: row.selectError });
      } finally {
        row.pending = false;
        publish(row, { pending: false });
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
  ctx.effect(() => ctx.commandUi.register({
    name: "company-knowledge",
    label: () => "\u516C\u53F8\u77E5\u8BC6\u5E93",
    description: () => "\u5148\u68C0\u7D22\u5168\u90E8\u5DF2\u914D\u7F6E\u77E5\u8BC6\u5E93\uFF0C\u518D\u56DE\u7B54\uFF1B\u6301\u7EED\u5230\u624B\u52A8\u53D6\u6D88",
    available: () => true,
    ui: { kind: "action", run: (session) => {
      void store.select(session.sessionId, true);
    } }
  }), "tbea: + command");
  ctx.effect(() => ctx.inputTriggers.registerSource({
    trigger: "@",
    name: "\u516C\u53F8\u77E5\u8BC6",
    order: -10,
    async candidates(_session, request) {
      if (request.quoted || request.drilled) return [];
      const query = request.query.toLowerCase();
      return !query || "\u516C\u53F8\u77E5\u8BC6\u5E93 company-knowledge tbea".includes(query) ? [{ name: "\u516C\u53F8\u77E5\u8BC6\u5E93", description: "\u5148\u68C0\u7D22\u5168\u90E8\u5DF2\u914D\u7F6E\u77E5\u8BC6\u5E93\uFF0C\u518D\u56DE\u7B54", value: "company-knowledge" }] : [];
    },
    onPick({ candidate, session }) {
      if (candidate.value !== "company-knowledge") return;
      void store.select(session.sessionId, true);
      return { text: "" };
    }
  }), "tbea: @ source");
}

// plugin/src/client.jsx
var inject = ["slots", "connection", "commandUi", "inputTriggers", "uiConversation"];
function apply(ctx) {
  const bridge = async (endpoint, args, signal) => {
    const response = await ctx.connection.rpc.call("/tbea", endpoint, args, signal);
    if (!response.ok) throw new Error(response.error.message);
    return response.value;
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
    inject: (sessionId) => ({ selection, selectionSessionId: sessionId })
  }, KnowledgeSelection));
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "tbea-knowledge-prefetch",
    inject: () => ({ bridge })
  }, PrefetchedKnowledge));
}
function KnowledgeSelection({ selection, selectionSessionId }) {
  const subscribe = (0, import_react3.useCallback)((listener) => selection.subscribe(selectionSessionId, listener), [selection, selectionSessionId]);
  const snapshot = (0, import_react3.useCallback)(() => selection.get(selectionSessionId), [selection, selectionSessionId]);
  const state = (0, import_react3.useSyncExternalStore)(subscribe, snapshot, snapshot);
  if (!state.selected && !state.error && !state.pending) return null;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-selection", "aria-label": "\u516C\u53F8\u77E5\u8BC6\u5E93\u6765\u6E90\u9009\u62E9" }, state.selected ? /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-selection-chip" }, /* @__PURE__ */ import_react3.default.createElement(BookOpen, { size: 14 }), /* @__PURE__ */ import_react3.default.createElement("span", null, "\u516C\u53F8\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", "aria-label": "\u53D6\u6D88\u516C\u53F8\u77E5\u8BC6\u5E93", title: "\u53D6\u6D88\u540E\u6062\u590D\u6A21\u578B\u81EA\u52A8\u5224\u65AD", disabled: state.pending, onClick: () => {
    void selection.select(selectionSessionId, false);
  } }, /* @__PURE__ */ import_react3.default.createElement(X, { size: 13 }))) : null, state.pending || state.phase === "searching" ? /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-selection-status", role: "status" }, /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 13, className: "tbea-spin" }), state.pending ? "\u6B63\u5728\u4FDD\u5B58\u9009\u62E9\u2026" : state.message) : null, state.error || state.phase === "error" || state.phase === "stopped" ? /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-selection-error", role: "alert" }, state.error || state.message) : null);
}
function PrefetchedKnowledge({ node, bridge }) {
  const view = node.data?.view;
  if (view?.schema !== "tbea-view/v1") return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-error", role: "alert" }, "\u516C\u53F8\u77E5\u8BC6\u68C0\u7D22\u8BB0\u5F55\u7F3A\u5C11\u6765\u6E90\u4FE1\u606F\uFF0C\u8BF7\u67E5\u770B\u8FD0\u884C\u8F68\u8FF9\u3002");
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-prefetched" }, /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-prefetched-label" }, "\u5DF2\u5148\u68C0\u7D22\u516C\u53F8\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react3.default.createElement(Sources, { view, bridge }));
}
function textOf(block) {
  return (block?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}
function viewOf(block) {
  if (block?.meta?.schema === "tbea-view/v1") return block.meta;
  try {
    const data = JSON.parse(textOf(block));
    return data.schema === "tbea-knowledge/v1" ? { snapshotId: data.snapshotId, count: data.hitCount, query: data.query, mode: data.mode } : null;
  } catch {
    return null;
  }
}
function KnowledgeTool(props) {
  const result = props.phase === "result";
  const view = result ? viewOf(props.block) : null;
  if (!result) return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u68C0\u7D22\u516C\u53F8\u77E5\u8BC6\u2026");
  if (props.block.isError) return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-error", role: "alert" }, "\u77E5\u8BC6\u68C0\u7D22\u5931\u8D25\uFF1A", textOf(props.block) || "\u8BF7\u6C42\u5DF2\u505C\u6B62\u6216\u672A\u5B8C\u6210");
  if (!view?.snapshotId) return /* @__PURE__ */ import_react3.default.createElement("pre", { className: "tbea-fallback" }, textOf(props.block) || "\u5F53\u524D\u7ED3\u679C\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u6765\u6E90\u4FE1\u606F");
  return /* @__PURE__ */ import_react3.default.createElement(Sources, { view, bridge: props.bridge });
}
function Sources({ view, bridge }) {
  const [open, setOpen] = (0, import_react3.useState)(false);
  const [snapshot, setSnapshot] = (0, import_react3.useState)(null);
  const [error, setError] = (0, import_react3.useState)("");
  const [loading, setLoading] = (0, import_react3.useState)(false);
  const [revision, setRevision] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    bridge("snapshot", { snapshotId: view.snapshotId }, controller.signal).then(setSnapshot).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [open, view.snapshotId, bridge, revision]);
  return /* @__PURE__ */ import_react3.default.createElement("section", { className: "tbea-sources", "aria-label": "\u516C\u53F8\u77E5\u8BC6\u53C2\u8003\u6765\u6E90" }, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-source-toggle", type: "button", "aria-expanded": open, onClick: () => setOpen(!open) }, open ? /* @__PURE__ */ import_react3.default.createElement(ChevronDown, { size: 16 }) : /* @__PURE__ */ import_react3.default.createElement(ChevronRight, { size: 16 }), /* @__PURE__ */ import_react3.default.createElement(BookOpen, { size: 17 }), /* @__PURE__ */ import_react3.default.createElement("strong", null, "\u53C2\u8003\u6765\u6E90"), /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-count" }, view.count ?? "\u2014"), /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-query" }, view.query), view.mode === "mock" ? /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-demo" }, "\u6F14\u793A") : null), open ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-source-body" }, loading ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u8BFB\u53D6\u6765\u6E90\u2026") : null, error ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-error", role: "alert" }, error, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "tbea-icon", title: "\u91CD\u65B0\u8BFB\u53D6\u6765\u6E90", onClick: () => setRevision((r) => r + 1) }, /* @__PURE__ */ import_react3.default.createElement(RefreshCw, { size: 15 }))) : null, !loading && !error && snapshot?.citations.length === 0 ? /* @__PURE__ */ import_react3.default.createElement("p", { className: "tbea-empty" }, "\u672A\u68C0\u7D22\u5230\u76F8\u5173\u4F9D\u636E\uFF0C\u8BF7\u8865\u5145\u4EA7\u54C1\u3001\u5730\u533A\u6216\u6807\u51C6\u7248\u672C\u7B49\u6761\u4EF6\u3002") : null, snapshot?.citations.map((c) => /* @__PURE__ */ import_react3.default.createElement(Citation, { key: c.citationId, citation: c, snapshotId: view.snapshotId, bridge, onRefresh: setSnapshot }))) : null);
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
function Citation({ citation: c, snapshotId, bridge, onRefresh }) {
  const [expanded, setExpanded] = (0, import_react3.useState)(false);
  const [detail, setDetail] = (0, import_react3.useState)(false);
  const [busy, setBusy] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)("");
  const [copied, setCopied] = (0, import_react3.useState)(false);
  const timer = (0, import_react3.useRef)();
  (0, import_react3.useEffect)(() => () => clearTimeout(timer.current), []);
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
  return /* @__PURE__ */ import_react3.default.createElement("article", { className: "tbea-citation", id: `tbea-${c.citationId}` }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-citation-head" }, /* @__PURE__ */ import_react3.default.createElement(FileText, { size: 16 }), /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-citation-id" }, c.citationId), /* @__PURE__ */ import_react3.default.createElement("strong", null, c.documentName), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", type: "button", title: copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", "aria-label": copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", onClick: copy }, /* @__PURE__ */ import_react3.default.createElement(Copy, { size: 15 }))), /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-meta" }, /* @__PURE__ */ import_react3.default.createElement("span", null, c.knowledgeBaseName), c.page ? /* @__PURE__ */ import_react3.default.createElement("span", null, "\u7B2C ", c.page, " \u9875") : null, typeof c.score === "number" ? /* @__PURE__ */ import_react3.default.createElement("span", { title: "\u68C0\u7D22\u76F8\u5173\u5206\u6570\uFF0C\u4E0D\u4EE3\u8868\u7B54\u6848\u6B63\u786E\u7387" }, "\u76F8\u5173\u5206\u6570 ", c.score.toFixed(3)) : null), c.content ? /* @__PURE__ */ import_react3.default.createElement("p", { className: `tbea-content ${expanded ? "tbea-expanded" : ""}` }, c.content) : null, c.content.length > 220 ? /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-text-button", type: "button", onClick: () => setExpanded(!expanded) }, expanded ? "\u6536\u8D77\u6587\u5B57" : "\u5C55\u5F00\u6587\u5B57") : null, c.tables.map((table, index) => /* @__PURE__ */ import_react3.default.createElement(Table, { key: index, table, index })), c.images.length ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-gallery" }, c.images.map((image) => /* @__PURE__ */ import_react3.default.createElement(ImagePreview, { key: image.id, image, snapshotId, bridge }))) : null, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-citation-actions" }, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-text-button", type: "button", "aria-expanded": detail, onClick: () => setDetail(!detail) }, detail ? "\u6536\u8D77\u5207\u7247\u8BE6\u60C5" : "\u5207\u7247\u8BE6\u60C5"), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", type: "button", disabled: busy, title: "\u91CD\u65B0\u83B7\u53D6\u5E73\u53F0\u5207\u7247\u8BE6\u60C5", onClick: refresh }, busy ? /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 15, className: "tbea-spin" }) : /* @__PURE__ */ import_react3.default.createElement(RefreshCw, { size: 15 }))), detail ? /* @__PURE__ */ import_react3.default.createElement("dl", { className: "tbea-details" }, /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u6587\u6863"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.documentName), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.knowledgeBaseName), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u5207\u7247 ID"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.chunkId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u6587\u6863 ID"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.documentId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u77E5\u8BC6\u5E93 ID"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.knowledgeBaseId)) : null, error ? /* @__PURE__ */ import_react3.default.createElement("p", { className: "tbea-error", role: "alert" }, error) : null);
}
function Table({ table, index }) {
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-table-scroll", tabIndex: 0, role: "region", "aria-label": `\u5207\u7247\u8868\u683C ${index + 1}` }, /* @__PURE__ */ import_react3.default.createElement("table", { className: "tbea-table" }, /* @__PURE__ */ import_react3.default.createElement("tbody", null, table.rows.map((row, r) => /* @__PURE__ */ import_react3.default.createElement("tr", { key: r }, row.map((cell, column) => {
    const Tag = cell.header ? "th" : "td";
    return /* @__PURE__ */ import_react3.default.createElement(Tag, { key: column, colSpan: cell.colSpan, rowSpan: cell.rowSpan }, cell.text);
  }))))));
}
function ImagePreview({ image, snapshotId, bridge }) {
  const [src, setSrc] = (0, import_react3.useState)("");
  const [error, setError] = (0, import_react3.useState)("");
  const [retry, setRetry] = (0, import_react3.useState)(0);
  const [open, setOpen] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
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
  return /* @__PURE__ */ import_react3.default.createElement("figure", { className: "tbea-image" }, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-image-button", type: "button", title: "\u67E5\u770B\u5927\u56FE", "aria-label": "\u67E5\u770B\u5927\u56FE", disabled: !src, onClick: () => setOpen(true) }, src ? /* @__PURE__ */ import_react3.default.createElement("img", { src, alt: image.caption || "\u77E5\u8BC6\u5E93\u5173\u8054\u56FE\u7247", onError: () => {
    setError("\u56FE\u7247\u65E0\u6CD5\u89E3\u7801\uFF0C\u8BF7\u5237\u65B0\u5207\u7247\u540E\u91CD\u8BD5");
    setSrc("");
  } }) : error ? /* @__PURE__ */ import_react3.default.createElement(Image, { size: 24 }) : /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 20, className: "tbea-spin" })), image.caption ? /* @__PURE__ */ import_react3.default.createElement("figcaption", null, image.caption) : null, error ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-error" }, error, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u91CD\u8BD5\u56FE\u7247", type: "button", onClick: () => setRetry((r) => r + 1) }, /* @__PURE__ */ import_react3.default.createElement(RefreshCw, { size: 15 }))) : null, open && src ? /* @__PURE__ */ import_react3.default.createElement(ImageModal, { src, caption: image.caption || "\u77E5\u8BC6\u5E93\u5173\u8054\u56FE\u7247", onClose: () => setOpen(false) }) : null);
}
function ImageModal({ src, caption, onClose }) {
  const [scale, setScale] = (0, import_react3.useState)(1);
  const dialog = (0, import_react3.useRef)();
  (0, import_react3.useEffect)(() => {
    dialog.current.showModal();
    return () => dialog.current?.close();
  }, []);
  return /* @__PURE__ */ import_react3.default.createElement("dialog", { className: "tbea-image-modal", ref: dialog, "aria-label": caption, onCancel: (event) => {
    event.preventDefault();
    onClose();
  }, onClick: (event) => {
    if (event.target === event.currentTarget) onClose();
  } }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-modal-head" }, /* @__PURE__ */ import_react3.default.createElement("strong", null, caption), /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u7F29\u5C0F", type: "button", disabled: scale <= 0.5, onClick: () => setScale((s) => Math.max(0.5, s - 0.25)) }, /* @__PURE__ */ import_react3.default.createElement(ZoomOut, { size: 18 })), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u6062\u590D\u5927\u5C0F", type: "button", onClick: () => setScale(1) }, /* @__PURE__ */ import_react3.default.createElement(RotateCcw, { size: 18 })), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u653E\u5927", type: "button", disabled: scale >= 4, onClick: () => setScale((s) => Math.min(4, s + 0.25)) }, /* @__PURE__ */ import_react3.default.createElement(ZoomIn, { size: 18 })), /* @__PURE__ */ import_react3.default.createElement("a", { className: "tbea-icon", title: "\u4E0B\u8F7D\u56FE\u7247", href: src, download: "\u77E5\u8BC6\u5E93\u56FE\u7247.png" }, /* @__PURE__ */ import_react3.default.createElement(Download, { size: 18 })), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u5173\u95ED\u56FE\u7247", type: "button", onClick: onClose }, /* @__PURE__ */ import_react3.default.createElement(X, { size: 20 })))), /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-modal-image" }, /* @__PURE__ */ import_react3.default.createElement("img", { src, alt: caption, style: { width: `${scale * 100}%`, maxWidth: "none" } })));
}
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/book-open.js:
lucide-react/dist/esm/icons/chevron-down.js:
lucide-react/dist/esm/icons/chevron-right.js:
lucide-react/dist/esm/icons/copy.js:
lucide-react/dist/esm/icons/download.js:
lucide-react/dist/esm/icons/file-text.js:
lucide-react/dist/esm/icons/image.js:
lucide-react/dist/esm/icons/loader-circle.js:
lucide-react/dist/esm/icons/refresh-cw.js:
lucide-react/dist/esm/icons/rotate-ccw.js:
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
