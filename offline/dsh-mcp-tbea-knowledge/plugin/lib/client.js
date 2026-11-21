window.__ModuleLoader__.load({id:"dsh-plugin-tbea-knowledge",factory:(require)=>{var module={exports:{}};var exports=module.exports;
"use strict";
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
var import_react5 = __toESM(require("react"), 1);

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
var style_default = "/* \u8DDF\u968F Harness 0.2.2-alpha.2 \u7684\u4E3B\u9898\u53D8\u91CF\uFF1B\u540E\u5907\u503C\u4EC5\u7528\u4E8E\u72EC\u7ACB\u6F14\u793A\u3002\n   \u4E0D\u5199\u5165\u5BBF\u4E3B\u53D8\u91CF\uFF0C\u4E0D\u4EE5\u7CFB\u7EDF\u6DF1\u8272\u5A92\u4F53\u67E5\u8BE2\u8986\u76D6 DSH \u7684\u624B\u52A8\u4E3B\u9898\u3002 */\n:where(.tbea-sources,.tbea-selection,.tbea-prefetched,.tbea-image-modal,.tbea-status,.tbea-error,.tbea-fallback) {\n  --tbea-fg:var(--dsw-alias-label-primary,#0f1115);\n  --tbea-muted:var(--dsw-alias-label-secondary,#61666b);\n  --tbea-subtle:var(--dsw-alias-label-tertiary,#81858c);\n  --tbea-surface:var(--dsw-alias-bg-layer-1,#fff);\n  --tbea-soft:var(--dsw-alias-markdown-code-block,#f9fafb);\n  --tbea-border:var(--dsw-alias-border-l2,rgba(0,0,0,.1));\n  --tbea-hover:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06));\n  --tbea-active:var(--dsw-alias-interactive-bg-active,rgba(38,49,72,.1));\n  --tbea-accent:var(--dsw-alias-state-business-primary,#4176e6);\n  --tbea-accent-bg:var(--dsw-alias-state-business-tertiary,#e4edfd);\n  --tbea-danger:var(--dsw-alias-state-error-primary,#ec1313);\n  box-sizing:border-box; min-width:0;\n  font-family:var(--dsw-font-family,system-ui,sans-serif);\n  font-size:var(--dsh-content-font-size,14px);\n  line-height:calc(24px + var(--dsh-content-font-delta,0px));\n  color:var(--tbea-fg);\n}\nbody[data-ds-dark-theme] :where(.tbea-sources,.tbea-selection,.tbea-prefetched,.tbea-image-modal,.tbea-status,.tbea-error,.tbea-fallback) {\n  --tbea-fg:var(--dsw-alias-label-primary,#f9fafb);\n  --tbea-muted:var(--dsw-alias-label-secondary,#adb2b8);\n  --tbea-subtle:var(--dsw-alias-label-tertiary,#81858c);\n  --tbea-surface:var(--dsw-alias-bg-layer-1,#232324);\n  --tbea-soft:var(--dsw-alias-markdown-code-block,#1b1b1c);\n  --tbea-border:var(--dsw-alias-border-l2,rgba(255,255,255,.12));\n  --tbea-hover:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));\n  --tbea-active:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.14));\n  --tbea-accent:var(--dsw-alias-state-business-primary,#7aaaff);\n  --tbea-accent-bg:var(--dsw-alias-state-business-tertiary,#34415b);\n  --tbea-danger:var(--dsw-alias-state-error-primary,#f25a5a);\n}\n.tbea-sources *,.tbea-image-modal *,.tbea-selection * { box-sizing:border-box; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) :where(button,a) { font-family:inherit; font-size:inherit; line-height:inherit; -webkit-app-region:no-drag; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) button { appearance:none; cursor:pointer; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) :where(button,a):focus-visible,\n.tbea-table-scroll:focus-visible,.tbea-modal-image:focus-visible { outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--tbea-accent)); outline-offset:-2px; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) button:disabled { opacity:.4; cursor:not-allowed; }\n.tbea-sources svg,.tbea-selection svg,.tbea-image-modal svg { flex:none; stroke-width:1.7; }\n\n/* \u4E0E\u539F\u751F PlanChip / Button.sm \u5171\u7528 28px \u9AD8\u5EA6\u548C 8px \u5706\u89D2\u5C42\u7EA7\u3002 */\n.tbea-selection { display:flex; align-items:center; flex-wrap:wrap; gap:6px 8px; padding:4px 0; }\n/* \u590D\u7528\u8F93\u5165\u5361\u7247\u7684\u4E24\u4FA7\u7559\u767D\u548C\u5BBD\u5EA6\u4E0A\u9650\uFF0C\u5185\u7F29\u81F3\u7F16\u8F91\u533A\u7684\u6587\u5B57\u8D77\u70B9\u3002 */\n[data-composer-seat] .tbea-selection-dock {\n  padding-inline:var(--dsh-composer-side-clearance,0px);\n}\n[data-composer-seat] .tbea-selection {\n  max-inline-size:var(--dsh-composer-card-max-width,100%);\n  margin-inline:auto;\n  padding-inline:14px;\n}\n.tbea-selection-chip { display:inline-flex; align-items:center; flex:none; gap:4px; height:28px; padding:0 4px 0 8px; border:0; border-radius:var(--dsw-radius-sm,8px); font-size:13px; font-weight:500; line-height:20px; color:var(--tbea-accent); background:var(--tbea-accent-bg); }\n.tbea-selection-chip button { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; padding:0; border:0; border-radius:var(--dsw-radius-xs,4px); background:transparent; color:inherit; }\n.tbea-selection-status,.tbea-selection-error { display:inline-flex; align-items:center; gap:6px; min-width:0; font-size:12px; line-height:18px; color:var(--tbea-muted); overflow-wrap:anywhere; }\n.tbea-selection-error { color:var(--tbea-danger); }\n.tbea-selection-error { flex-wrap:wrap; }\n.tbea-prefetched { width:100%; padding:4px 0; }\n.tbea-prefetched-label { font-size:var(--dsh-content-font-size-secondary,13px); color:var(--tbea-subtle); }\n\n.tbea-sources { width:100%; margin:8px 0; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-md,12px); background:transparent; }\n.tbea-source-toggle { display:flex; align-items:center; gap:6px; width:100%; min-height:36px; padding:4px 10px; border:0; border-radius:inherit; background:transparent; color:var(--tbea-muted); text-align:left; font-size:var(--dsh-content-font-size-secondary,13px); }\n.tbea-source-toggle strong { flex:none; font-weight:500; }\n.tbea-count,.tbea-demo { flex:none; padding:0 6px; border-radius:var(--dsw-radius-xs,4px); font-size:12px; line-height:20px; background:var(--tbea-hover); color:var(--tbea-muted); }\n.tbea-query { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--tbea-subtle); font-size:12px; }\n.tbea-source-body { padding:0 12px; border-top:1px solid var(--tbea-border); }\n.tbea-citation-group:not(:last-child) { border-bottom:1px solid var(--tbea-border); }\n.tbea-citation { min-width:0; padding:12px 0; }\n.tbea-related-sources { margin:0 0 10px; color:var(--tbea-muted); }\n.tbea-related-sources>summary { width:fit-content; max-width:100%; min-height:28px; padding:4px; font-size:var(--dsh-content-font-size-secondary,13px); cursor:pointer; }\n.tbea-related-sources>.tbea-citation { border-top:1px solid var(--tbea-border); }\n.tbea-citation-head { display:grid; grid-template-columns:16px minmax(0,1fr) 28px; align-items:start; gap:6px; min-height:28px; }\n.tbea-citation-head>svg { margin-top:6px; color:var(--tbea-subtle); }\n.tbea-citation-head strong { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-width:0; padding-top:3px; overflow:hidden; font-size:var(--dsh-content-font-size-secondary,13px); font-weight:500; line-height:22px; overflow-wrap:anywhere; }\n.tbea-citation-id { color:var(--tbea-subtle); font:12px/18px var(--ds-font-family-code,Consolas,monospace); overflow-wrap:anywhere; }\n.tbea-meta { display:flex; flex-wrap:wrap; gap:2px 12px; margin-top:4px; color:var(--tbea-subtle); font-size:12px; line-height:18px; overflow-wrap:anywhere; }\n.tbea-content { margin:10px 0 4px; white-space:pre-wrap; overflow-wrap:anywhere; user-select:text; }\n.tbea-content.tbea-collapsed { display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical; overflow:hidden; }\n.tbea-text-button { display:inline-flex; align-items:center; justify-content:center; min-height:28px; padding:0 8px; border:0; border-radius:var(--dsw-radius-sm,8px); color:var(--tbea-muted); background:transparent; font-size:12px; line-height:18px; text-decoration:none; }\n.tbea-icon { display:inline-flex; align-items:center; justify-content:center; flex:none; width:28px; height:28px; padding:0; border:0; border-radius:var(--dsw-radius-sm,8px); color:var(--tbea-muted); background:transparent; text-decoration:none; }\n.tbea-icon svg { width:16px; height:16px; }\n.tbea-citation-actions { display:flex; flex-wrap:wrap; align-items:center; gap:4px; margin:6px -8px 0; }\n@media (hover:hover) {\n  .tbea-source-toggle:hover,.tbea-icon:hover:not(:disabled),.tbea-text-button:hover:not(:disabled),.tbea-selection-chip button:hover:not(:disabled) { background:var(--tbea-hover); color:var(--tbea-fg); }\n  .tbea-image-button:hover:not(:disabled) { border-color:var(--tbea-accent); }\n}\n.tbea-icon:active:not(:disabled),.tbea-text-button:active:not(:disabled),.tbea-source-toggle:active { background:var(--tbea-active); }\n\n.tbea-table-scroll { max-width:100%; max-height:360px; overflow:auto; overscroll-behavior:contain; margin:12px 0; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-sm,8px); }\n.tbea-table { min-width:100%; border-collapse:collapse; font-size:var(--dsh-content-font-size-secondary,13px); line-height:calc(22px + var(--dsh-content-font-delta-secondary,0px)); color:var(--tbea-fg); }\n.tbea-table th,.tbea-table td { min-width:90px; max-width:500px; padding:8px 12px; border:1px solid var(--tbea-border); text-align:left; vertical-align:top; white-space:pre-wrap; overflow-wrap:anywhere; }\n.tbea-table th { background:var(--tbea-soft); font-weight:500; }\n.tbea-gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; margin:12px 0; }\n.tbea-image { min-width:0; margin:0; }\n.tbea-image-button { display:grid; place-items:center; position:relative; overflow:hidden; width:100%; height:160px; padding:8px; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-sm,8px); background:var(--tbea-soft); color:var(--tbea-muted); }\n.tbea-image-button:not(:disabled) { cursor:zoom-in; }\n.tbea-image-button img { display:block; position:absolute; inset:8px; width:calc(100% - 16px); height:calc(100% - 16px); object-fit:contain; }\n.tbea-image figcaption { margin-top:4px; color:var(--tbea-subtle); font-size:12px; line-height:18px; overflow-wrap:anywhere; }\n.tbea-details { display:grid; grid-template-columns:72px minmax(0,1fr); gap:6px 8px; padding:12px; margin:8px 0; border-radius:var(--dsw-radius-sm,8px); background:var(--tbea-soft); font-size:12px; line-height:20px; }\n.tbea-details dt { color:var(--tbea-subtle); }\n.tbea-details dd { margin:0; overflow-wrap:anywhere; user-select:text; }\n.tbea-error { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 0; color:var(--tbea-danger); font-size:12px; line-height:20px; overflow-wrap:anywhere; }\n.tbea-status { display:flex; align-items:center; gap:6px; padding:8px 0; color:var(--tbea-subtle); font-size:var(--dsh-content-font-size-secondary,13px); }\n.tbea-empty { margin:12px 0; color:var(--tbea-muted); }\n.tbea-fallback { max-height:300px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; font-family:var(--ds-font-family-code,Consolas,monospace); }\n.tbea-sr-only { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }\n.tbea-spin { animation:tbea-spin 1s linear infinite; }\n@keyframes tbea-spin { to { transform:rotate(360deg); } }\n@media (prefers-reduced-motion:reduce) { .tbea-spin { animation-duration:2s; } }\n\n/* \u6807\u9898\u6362\u884C\u548C\u5B57\u4F53\u653E\u5927\u65F6\uFF0C\u7531\u5B9E\u9645\u9AD8\u5EA6\u5206\u914D\u56FE\u7247\u7A7A\u95F4\uFF0C\u4E0D\u5199\u6B7B\u51CF\u6CD5\u3002 */\n.tbea-image-modal { position:fixed; inset:var(--dsh-frame-chrome-top,0px) 0 0; width:min(1100px,calc(100vw - 32px)); max-width:calc(100vw - 32px); height:min(800px,calc(100dvh - var(--dsh-frame-chrome-top,0px) - 32px)); max-height:calc(100dvh - var(--dsh-frame-chrome-top,0px) - 32px); margin:auto; padding:0; overflow:hidden; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-lg,16px); background:var(--tbea-surface); }\n.tbea-image-modal[open] { display:flex; flex-direction:column; }\n.tbea-image-modal::backdrop { background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.5)); }\n.tbea-modal-head { display:flex; flex:none; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; min-height:48px; padding:8px 12px; border-bottom:1px solid var(--tbea-border); }\n.tbea-modal-head strong { flex:1 1 100px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:var(--dsh-content-font-size-secondary,13px); font-weight:500; }\n.tbea-modal-tools { display:flex; align-items:center; flex:none; gap:4px; }\n.tbea-zoom-label { min-width:40px; text-align:center; color:var(--tbea-subtle); font-size:12px; line-height:20px; font-variant-numeric:tabular-nums; }\n.tbea-modal-image { flex:1; min-height:0; width:100%; padding:16px; overflow:auto; overscroll-behavior:contain; background:var(--tbea-soft); }\n.tbea-modal-canvas { display:flex; align-items:center; justify-content:center; min-width:100%; min-height:100%; width:max-content; }\n.tbea-modal-image img { display:block; flex:none; height:auto; max-width:none; object-fit:contain; }\n@media(max-width:480px) {\n  .tbea-source-toggle { flex-wrap:wrap; }\n  .tbea-query { flex-basis:100%; order:1; padding-left:22px; }\n  .tbea-source-body { padding:0 10px; }\n  .tbea-modal-head strong { flex-basis:100%; }\n  .tbea-modal-tools { width:100%; justify-content:flex-end; }\n}\n.tbea-library {\n  --tbea-lib-fg: var(--dsw-alias-label-primary, #20242a);\n  --tbea-lib-muted: var(--dsw-alias-label-secondary, #61666b);\n  --tbea-lib-surface: var(--dsw-alias-bg-layer-1, #fff);\n  --tbea-lib-soft: var(--dsw-alias-markdown-code-block, #f7f8fa);\n  --tbea-lib-border: var(--dsw-alias-border-l2, #e3e6ea);\n  --tbea-lib-active: var(--dsw-alias-interactive-bg-active, #edf3ff);\n  --tbea-lib-hover: var(--dsw-alias-interactive-bg-hover, #f4f6f9);\n  --tbea-lib-accent: var(--dsw-alias-state-business-primary, #4176e6);\n  display: flex; flex-direction: column; min-width: 0; min-height: 0; flex: 1; height: 100%;\n  color: var(--tbea-lib-fg); background: var(--tbea-lib-surface); font-size: 13px;\n  container-type: inline-size;\n}\n[data-ds-dark-theme] .tbea-library {\n  --tbea-lib-fg: var(--dsw-alias-label-primary, #ededf1);\n  --tbea-lib-muted: var(--dsw-alias-label-secondary, #b4b7c2);\n  --tbea-lib-surface: var(--dsw-alias-bg-layer-1, #202128);\n  --tbea-lib-soft: var(--dsw-alias-markdown-code-block, #17181e);\n  --tbea-lib-border: var(--dsw-alias-border-l2, #3b3e49);\n  --tbea-lib-active: var(--dsw-alias-interactive-bg-active, #353e53);\n  --tbea-lib-hover: var(--dsw-alias-interactive-bg-hover, #2e303b);\n}\n.tbea-library h1,.tbea-library h2,.tbea-library p { margin: 0; }\n.tbea-library-title { display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:13px 18px;min-height:46px;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-library-title h1 { font-size:15px;font-weight:600; }\n.tbea-library-title span,.tbea-library-count { color:var(--tbea-lib-muted);font-size:12px; }\n.tbea-library-title span { margin-inline-start:auto; }\n.tbea-library-layout { display:grid;grid-template-columns:minmax(208px,27%) minmax(0,1fr);min-height:0;flex:1; }\n.tbea-library-list { min-width:0;min-height:0;overflow:auto;border-right:1px solid var(--tbea-lib-border); }\n.tbea-library-filters { display:grid;gap:9px;padding:13px 12px 9px;position:sticky;top:0;background:var(--tbea-lib-surface);z-index:1;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-library-field { display:grid;gap:5px;font-weight:600; }\n.tbea-library-field select,.tbea-library-search { color:var(--tbea-lib-fg);background:var(--tbea-lib-surface);border:1px solid var(--tbea-lib-border);border-radius:6px;min-width:0;min-height:32px; }\n.tbea-library-field select { width:100%;padding:3px 8px;font:inherit;font-weight:400; }\n@supports (appearance:base-select) and selector(select::picker(select)) {\n  .tbea-library-field select,.tbea-library-field select::picker(select) { appearance:base-select; }\n  .tbea-library-field select { align-items:center;gap:8px;padding:4px 10px;cursor:pointer; }\n  .tbea-library-field select::picker-icon { color:var(--tbea-lib-muted); }\n  .tbea-library-field select:open::picker-icon { rotate:180deg; }\n  .tbea-library-field select::picker(select) {\n    box-sizing:border-box;\n    inline-size:anchor-size(width);\n    min-inline-size:0;\n    max-block-size:min(280px,60dvh);\n    margin-block:4px;\n    padding:4px;\n    overflow-y:auto;\n    color:var(--tbea-lib-fg);\n    background:var(--tbea-lib-surface);\n    border:1px solid var(--tbea-lib-border);\n    border-radius:var(--dsw-radius-md,10px);\n    box-shadow:var(--dsw-elevation-panel,0 8px 24px rgba(0,0,0,.14));\n  }\n  .tbea-library-field option {\n    align-items:center;\n    gap:8px;\n    min-height:32px;\n    padding:6px 8px;\n    border-radius:var(--dsw-radius-sm,6px);\n    overflow-wrap:anywhere;\n    white-space:normal;\n    line-height:1.4;\n    cursor:pointer;\n  }\n  .tbea-library-field option:is(:hover,:focus-visible) { background:var(--tbea-lib-hover); }\n  .tbea-library-field option:checked { background:var(--tbea-lib-active);font-weight:600; }\n  .tbea-library-field option:focus-visible { outline:2px solid var(--tbea-lib-accent);outline-offset:-2px; }\n  .tbea-library-field option::checkmark { order:1;margin-inline-start:auto;color:var(--tbea-lib-accent); }\n}\n.tbea-library-description { color:var(--tbea-lib-muted);overflow-wrap:anywhere;max-height:5em;overflow:auto;font-size:12px;line-height:1.5; }\n.tbea-library-search { display:flex;gap:6px;align-items:center;padding:0 8px;color:var(--tbea-lib-muted); }\n.tbea-library-search input { color:var(--tbea-lib-fg);font:inherit;min-width:0;width:100%;min-height:28px;border:0;background:transparent; }\n.tbea-library-search input:focus { outline:none; }\n.tbea-library-search:focus-within,.tbea-library button:focus-visible,.tbea-library select:focus-visible,.tbea-library-pages:focus-visible { outline:2px solid var(--tbea-lib-accent);outline-offset:-2px; }\n.tbea-library-items { list-style:none;margin:0;padding:5px; }\n.tbea-library-items button { width:100%;text-align:left;display:flex;align-items:flex-start;gap:8px;padding:8px 7px;color:inherit;background:transparent;border:0;border-radius:6px;min-height:40px;cursor:pointer; }\n.tbea-library-items button svg { flex:none;margin-top:2px;color:var(--tbea-lib-muted); }\n.tbea-library-items button span { min-width:0; }\n.tbea-library-items button strong { display:block;font-size:13px;line-height:1.35;font-weight:500;overflow-wrap:anywhere; }\n.tbea-library-items button small { display:block;margin-top:3px;font-size:11px;color:var(--tbea-lib-muted); }\n.tbea-library-items button:hover,.tbea-library-button:hover { background:var(--tbea-lib-hover); }\n.tbea-library-items button[aria-current] { background:var(--tbea-lib-active); }\n.tbea-library-reader { display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--tbea-lib-surface); }\n.tbea-library-empty { align-items:center;justify-content:center;gap:8px;color:var(--tbea-lib-muted);text-align:center;padding:20px; }\n.tbea-library-reader-heading { display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-library-reader-heading div { min-width:0;flex:1; }\n.tbea-library-reader-heading h2 { font-size:14px;font-weight:600;overflow-wrap:anywhere;line-height:1.4; }\n.tbea-library-reader-heading p,.tbea-library-page-count { color:var(--tbea-lib-muted);font-size:12px;line-height:1.5; }\n.tbea-library-page-count { white-space:nowrap; }\n.tbea-library-state { display:flex;gap:7px;align-items:center;padding:11px 12px;color:var(--tbea-lib-muted);line-height:1.5;overflow-wrap:anywhere; }\n.tbea-library-state svg { flex:none; }\n.tbea-library-error { flex-wrap:wrap; }\n.tbea-library-button { min-height:30px;min-width:30px;display:inline-flex;align-items:center;justify-content:center;gap:5px;background:transparent;color:inherit;border:1px solid var(--tbea-lib-border);border-radius:6px;padding:0 6px;cursor:pointer;font:inherit;flex:none; }\n.tbea-library-pages { flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;background:var(--tbea-lib-soft);padding:14px clamp(7px,2.5cqw,24px); }\n.tbea-library-page { width:min(100%,960px);margin:0 auto 15px;text-align:center; }\n.tbea-library-page figcaption { padding-top:7px;font-size:11px;color:var(--tbea-lib-muted); }\n.tbea-library-sheet { display:grid;place-items:center;background:#fff;border:1px solid var(--tbea-lib-border);overflow:hidden;color:#24262d; }\n.tbea-library-sheet .tbea-library-state { color:#40444c; }\n.tbea-library-sheet img { display:block;width:100%;height:auto;margin:0;user-select:none; }\n.tbea-cited-documents { width:min(100%, 960px);margin-inline:auto;padding:12px clamp(10px,3%,24px);box-sizing:border-box;height:auto; }\n.tbea-cited-list { margin:0;padding:0;list-style:none; }\n.tbea-cited-row { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 16px;align-items:start;padding:10px 4px;border-bottom:1px solid var(--tbea-lib-border); }\n.tbea-cited-document p { padding-inline-start:24px;color:var(--tbea-lib-muted);font-size:12px;overflow-wrap:anywhere; }\n.tbea-cited-name { display:flex;align-items:flex-start;gap:8px;padding:4px 0;color:var(--tbea-lib-accent);background:none;border:0;text-align:start;font:inherit;font-weight:600;cursor:pointer;overflow-wrap:anywhere; }\n.tbea-cited-name:hover span { text-decoration:underline; }\n.tbea-cited-name svg { flex:none;margin-top:1px; }\n.tbea-cited-turns summary { list-style:none;user-select:none; }\n.tbea-cited-turns summary::-webkit-details-marker { display:none; }\n.tbea-cited-turns ul { list-style:none;display:grid;gap:4px;margin:5px 0 0;padding:0;max-height:160px;overflow:auto; }\n.tbea-cited-turns li button { width:100%; }\n.tbea-cited-preview { display:flex;flex-direction:column;block-size:min(68dvh, 900px);min-height:0;border:1px solid var(--tbea-lib-border);border-radius:8px;overflow:hidden; }\n.tbea-cited-preview .tbea-library-reader { flex:1; }\n@container (max-width: 590px) {\n  .tbea-library-layout { grid-template-columns:minmax(0,1fr); }\n  .tbea-library-list { border-right:0; }\n  .tbea-library-empty,.tbea-library-has-selection .tbea-library-list { display:none; }\n}\n";

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
var import_react3 = __toESM(require("react"), 1);
var states = { disabled: "\u539F\u6587\u9884\u89C8\u672A\u542F\u7528", "converter-required": "\u5F85\u914D\u7F6E\u8F6C\u6362\u7EC4\u4EF6", unsupported: "\u5F53\u524D\u683C\u5F0F\u6682\u4E0D\u652F\u6301\u9884\u89C8" };
var statusLabels = { available: "\u53EF\u7528", enabled: "\u53EF\u7528", queuing: "\u6392\u961F\u4E2D", parsing: "\u89E3\u6790\u4E2D", indexing: "\u5904\u7406\u4E2D", parseError: "\u89E3\u6790\u5931\u8D25", error: "\u5904\u7406\u5931\u8D25", paused: "\u5DF2\u6682\u505C" };
function errorMessage(error) {
  return error instanceof Error ? error.message : "\u77E5\u8BC6\u5E93\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002";
}
function useLibraryRequest(bridge, action, args, key) {
  const [state, setState] = (0, import_react3.useState)();
  const [revision, setRevision] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
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
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-state", role: "status" }, /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), children);
}
function Failure({ children, retry }) {
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-state tbea-library-error", role: "alert" }, /* @__PURE__ */ import_react3.default.createElement("span", null, children), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: retry }, /* @__PURE__ */ import_react3.default.createElement(RotateCcw, { size: 14 }), "\u91CD\u8BD5"));
}
function LibraryBrowser({ bridge }) {
  const directory = useLibraryRequest(bridge, "library-catalog", {}, "catalog");
  const libraries = directory.value?.libraries ?? [];
  const [selection, setSelection] = (0, import_react3.useState)("");
  const active = libraries.find((entry) => entry.id === selection) ?? libraries[0];
  return /* @__PURE__ */ import_react3.default.createElement("section", { className: "tbea-library", "aria-label": "\u77E5\u8BC6\u5E93\u76EE\u5F55" }, /* @__PURE__ */ import_react3.default.createElement("header", { className: "tbea-library-title" }, /* @__PURE__ */ import_react3.default.createElement(BookOpen, { size: 18, "aria-hidden": "true" }), /* @__PURE__ */ import_react3.default.createElement("h1", null, "\u77E5\u8BC6\u5E93\u76EE\u5F55"), directory.value?.demo && /* @__PURE__ */ import_react3.default.createElement("span", null, "\u6F14\u793A")), directory.loading ? /* @__PURE__ */ import_react3.default.createElement(Wait, null, "\u6B63\u5728\u8BFB\u53D6\u77E5\u8BC6\u5E93\u2026") : directory.error ? /* @__PURE__ */ import_react3.default.createElement(Failure, { retry: directory.retry }, directory.error) : !active ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-state" }, "\u5F53\u524D\u9879\u76EE\u6CA1\u6709\u53EF\u67E5\u770B\u7684\u77E5\u8BC6\u5E93\u3002") : /* @__PURE__ */ import_react3.default.createElement(LibraryContents, { key: active.id, library: active, libraries, select: setSelection, bridge }));
}
function LibraryContents({ library, libraries, select, bridge }) {
  const [filter, setFilter] = (0, import_react3.useState)("");
  const [selected, setSelected] = (0, import_react3.useState)();
  const listing = useLibraryRequest(bridge, "library-documents", { libraryId: library.id }, library.id);
  const documents = listing.value?.documents ?? [];
  const visible = documents.filter((item) => item.name.toLowerCase().includes(filter.trim().toLowerCase()));
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: `tbea-library-layout${selected ? " tbea-library-has-selection" : ""}` }, /* @__PURE__ */ import_react3.default.createElement("aside", { className: "tbea-library-list", "aria-label": "\u77E5\u8BC6\u5E93\u6587\u6863" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-filters" }, /* @__PURE__ */ import_react3.default.createElement("label", { className: "tbea-library-field" }, /* @__PURE__ */ import_react3.default.createElement("span", null, "\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react3.default.createElement("select", { value: library.id, onChange: (event) => select(event.target.value) }, libraries.map((entry) => /* @__PURE__ */ import_react3.default.createElement("option", { key: entry.id, value: entry.id }, entry.name)))), library.description && /* @__PURE__ */ import_react3.default.createElement("p", { className: "tbea-library-description" }, library.description), /* @__PURE__ */ import_react3.default.createElement("label", { className: "tbea-library-search" }, /* @__PURE__ */ import_react3.default.createElement(Search, { size: 15, "aria-hidden": "true" }), /* @__PURE__ */ import_react3.default.createElement("input", { type: "search", value: filter, onChange: (event) => setFilter(event.target.value), placeholder: "\u641C\u7D22\u6587\u6863\u540D\u79F0", "aria-label": "\u641C\u7D22\u6587\u6863\u540D\u79F0" })), listing.value && /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-library-count" }, filter.trim() ? `\u627E\u5230 ${visible.length} \u4EFD\u6587\u6863` : `${documents.length} \u4EFD\u6587\u6863`)), listing.loading && /* @__PURE__ */ import_react3.default.createElement(Wait, null, "\u6B63\u5728\u8BFB\u53D6\u6587\u6863\u76EE\u5F55\u2026"), listing.error && /* @__PURE__ */ import_react3.default.createElement(Failure, { retry: listing.retry }, listing.error), listing.value && !listing.value.complete && /* @__PURE__ */ import_react3.default.createElement(Failure, { retry: listing.retry }, `\u5E73\u53F0\u76EE\u5F55\u672A\u53D6\u5168\uFF0C\u5DF2\u663E\u793A ${documents.length}${listing.value.total == null ? "" : `/${listing.value.total}`} \u4EFD\u6587\u6863\u3002`), listing.value && !visible.length && /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-state" }, filter.trim() ? "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u6587\u6863\u3002" : "\u5F53\u524D\u6CA1\u6709\u53EF\u663E\u793A\u7684\u6587\u6863\u3002"), /* @__PURE__ */ import_react3.default.createElement("ul", { className: "tbea-library-items" }, visible.map((item) => /* @__PURE__ */ import_react3.default.createElement("li", { key: item.id }, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", "aria-current": selected?.id === item.id ? "true" : void 0, title: item.name, onClick: () => setSelected(item) }, /* @__PURE__ */ import_react3.default.createElement(FileText, { size: 16, "aria-hidden": "true" }), /* @__PURE__ */ import_react3.default.createElement("span", null, /* @__PURE__ */ import_react3.default.createElement("strong", null, item.name), /* @__PURE__ */ import_react3.default.createElement("small", null, [item.format?.toUpperCase() || "\u672A\u77E5\u683C\u5F0F", item.preview !== "available" ? states[item.preview] : void 0].filter(Boolean).join(" \xB7 ")))))))), selected ? /* @__PURE__ */ import_react3.default.createElement(DocumentReader, { key: selected.id, bridge, libraryId: library.id, documentInfo: selected, close: () => setSelected(void 0) }) : /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-reader tbea-library-empty" }, /* @__PURE__ */ import_react3.default.createElement(FileText, { size: 24, "aria-hidden": "true" }), "\u9009\u62E9\u4E00\u4EFD\u6587\u6863\u67E5\u770B\u57FA\u672C\u4FE1\u606F\u548C\u539F\u6587\u3002"));
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function DocumentReader({ bridge, libraryId, documentInfo, close, requestPreview, backLabel = "\u8FD4\u56DE\u6587\u6863\u76EE\u5F55" }) {
  const { id, name, format, status, createdAt, bytes, preview } = documentInfo;
  const canOpen = requestPreview ?? preview === "available";
  const state = useLibraryRequest(bridge, "library-open", { libraryId, documentId: id }, canOpen ? JSON.stringify([libraryId, id]) : void 0);
  const facts = [format?.toUpperCase(), bytes != null ? formatSize(bytes) : void 0, createdAt ? new Date(createdAt).toLocaleDateString("zh-CN") : void 0, status ? statusLabels[status] ?? status : void 0].filter(Boolean);
  return /* @__PURE__ */ import_react3.default.createElement("article", { className: "tbea-library-reader", "aria-label": "\u539F\u6587\u9884\u89C8" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-reader-heading" }, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "tbea-library-button", "aria-label": backLabel, onClick: close }, /* @__PURE__ */ import_react3.default.createElement(ArrowLeft, { size: 16 })), /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement("h2", null, name), facts.length > 0 && /* @__PURE__ */ import_react3.default.createElement("p", null, facts.join(" \xB7 "))), state.value && /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-library-page-count" }, state.value.pages, " \u9875")), state.loading && /* @__PURE__ */ import_react3.default.createElement(Wait, null, "\u6B63\u5728\u51C6\u5907\u539F\u6587\u9884\u89C8\u2026"), state.error && /* @__PURE__ */ import_react3.default.createElement(Failure, { retry: state.retry }, state.error), preview && preview !== "available" && /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-state" }, states[preview], "\u3002"), state.value && /* @__PURE__ */ import_react3.default.createElement(PreviewPages, { key: state.value.previewId, bridge, ...state.value, restart: state.retry }));
}
function PreviewPages({ bridge, previewId, pages, restart }) {
  const root = (0, import_react3.useRef)(null);
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-pages", ref: root, tabIndex: 0, "aria-label": "\u539F\u6587\u9875\u9762\uFF0C\u6EDA\u52A8\u8FDE\u7EED\u9605\u8BFB" }, Array.from({ length: pages }, (_, i) => /* @__PURE__ */ import_react3.default.createElement(PreviewPage, { key: i, root, bridge, previewId, page: i + 1, restart })));
}
function PreviewPage({ root, bridge, previewId, page, restart }) {
  const element = (0, import_react3.useRef)(null);
  const [near, setNear] = (0, import_react3.useState)(page === 1);
  const [ratio, setRatio] = (0, import_react3.useState)();
  const [error, setError] = (0, import_react3.useState)("");
  const [url, setUrl] = (0, import_react3.useState)("");
  const [revision, setRevision] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root: root.current, rootMargin: "650px 0px" });
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, [root]);
  (0, import_react3.useEffect)(() => {
    if (!near || error) return;
    const controller = new AbortController();
    let objectUrl;
    bridge("library-page", { previewId, page }, controller.signal).then((asset) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([asset.bytes], { type: "image/png" }));
      setUrl(objectUrl);
    }, (failure) => {
      if (!controller.signal.aborted) setError(errorMessage(failure));
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl("");
    };
  }, [near, previewId, page, bridge, revision, error]);
  return /* @__PURE__ */ import_react3.default.createElement("figure", { className: "tbea-library-page", ref: element }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-library-sheet", style: { aspectRatio: ratio || "1 / 1.414" } }, url ? /* @__PURE__ */ import_react3.default.createElement("img", { draggable: false, onContextMenu: (event) => event.preventDefault(), src: url, alt: `\u539F\u6587\u7B2C ${page} \u9875`, onLoad: (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth && naturalHeight) setRatio(`${naturalWidth} / ${naturalHeight}`);
  } }) : error ? /* @__PURE__ */ import_react3.default.createElement(Failure, { retry: () => {
    if (error.includes("\u9884\u89C8\u5DF2\u8FC7\u671F")) restart();
    else {
      setError("");
      setRevision((value) => value + 1);
    }
  } }, error) : near && /* @__PURE__ */ import_react3.default.createElement(Wait, null, "\u6B63\u5728\u52A0\u8F7D\u7B2C ", page, " \u9875\u2026")), /* @__PURE__ */ import_react3.default.createElement("figcaption", null, "\u7B2C ", page, " \u9875"));
}

// plugin/src/cited-documents-view.tsx
var import_react4 = __toESM(require("react"), 1);

// src/contracts.ts
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// plugin/src/cited-documents.ts
var searchTool = "mcp__tbea__search_knowledge";
var detailTool = "mcp__tbea__get_chunk_detail";
function validTurn(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function parseJson(text) {
  if (typeof text !== "string") return void 0;
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
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
function citationReferences(entries) {
  const references = /* @__PURE__ */ new Map();
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
          addReference(references, view?.snapshotId, turn, null);
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
        const text = (!meta || call.name === detailTool && !citationId) && Array.isArray(message.content) ? message.content.flatMap((part) => isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []).join("\n") : void 0;
        const result = toolResult(parseJson(text), "tbea-knowledge/v1");
        const snapshotId = meta?.snapshotId ?? result?.snapshotId;
        if (call.name === searchTool) addReference(references, snapshotId, call.turn, null);
        else {
          const first = Array.isArray(result?.citations) ? result.citations[0] : void 0;
          if (!citationId && isRecord(first) && typeof first.citationId === "string") citationId = first.citationId;
          if (citationId) addReference(references, snapshotId, call.turn, citationId);
        }
        break;
      }
    }
  }
  return references;
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
        knowledgeBaseName: typeof value.knowledgeBaseName === "string" ? value.knowledgeBaseName : ""
      };
    });
  });
}
function mergeCitedDocuments(references, snapshots) {
  const grouped = /* @__PURE__ */ new Map();
  let unavailable = false;
  for (const [snapshotId, turns] of references) {
    for (const citation of snapshots.get(snapshotId)?.citations ?? []) {
      for (const [turn, selected] of turns) {
        if (selected && !selected.has(citation.citationId)) continue;
        if (!citation.documentId || !citation.knowledgeBaseId) {
          unavailable = true;
          continue;
        }
        const key = JSON.stringify([citation.knowledgeBaseId, citation.documentId]);
        const document2 = grouped.get(key) ?? { ...citation, key, turns: /* @__PURE__ */ new Set() };
        document2.turns.add(turn);
        grouped.set(key, document2);
      }
    }
  }
  const documents = [...grouped.values()].map((document2) => ({
    ...document2,
    turns: [...document2.turns].sort((a, b) => b - a)
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
function useCitationSnapshots(bridge, ids, revision) {
  const cache = (0, import_react4.useRef)(/* @__PURE__ */ new Map());
  const [snapshots, setSnapshots] = (0, import_react4.useState)(cache.current);
  (0, import_react4.useEffect)(() => {
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
  return binding ? /* @__PURE__ */ import_react4.default.createElement(SessionDocuments, { key: binding.sessionId, binding, ...props }) : /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-library-state", role: "status" }, "\u6B63\u5728\u8FDE\u63A5\u5F53\u524D\u4F1A\u8BDD\u2026");
}
function SessionDocuments({ binding, bridge, openView }) {
  const { eventSource } = binding;
  const subscribe = (0, import_react4.useCallback)((listener) => eventSource.subscribe(listener), [eventSource]);
  const getWindow = (0, import_react4.useCallback)(() => eventSource.getSnapshot(), [eventSource]);
  const history = (0, import_react4.useSyncExternalStore)(subscribe, getWindow, getWindow);
  const [revision, setRevision] = (0, import_react4.useState)(0);
  const [historyStatus, setHistoryStatus] = (0, import_react4.useState)({ loading: true });
  const [selected, setSelected] = (0, import_react4.useState)();
  (0, import_react4.useEffect)(() => {
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
  const references = (0, import_react4.useMemo)(() => citationReferences(history.entries), [history]);
  const ids = [...references.keys()];
  const snapshots = useCitationSnapshots(bridge, JSON.stringify(ids.sort()), revision);
  const { documents, unavailable } = (0, import_react4.useMemo)(() => mergeCitedDocuments(references, snapshots), [references, snapshots]);
  const loading = historyStatus.loading || ids.some((id) => {
    const snapshot = snapshots.get(id);
    return !snapshot || snapshot.errorRevision !== void 0 && snapshot.errorRevision < revision;
  });
  const snapshotError = ids.some((id) => snapshots.get(id)?.errorRevision === revision);
  const incomplete = historyStatus.error || snapshotError || unavailable;
  const document2 = documents.find((item) => item.key === selected);
  return /* @__PURE__ */ import_react4.default.createElement("section", { className: "tbea-library tbea-cited-documents", "aria-label": "\u5F15\u7528\u6587\u6863" }, document2 ? /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-cited-preview" }, /* @__PURE__ */ import_react4.default.createElement(
    DocumentReader,
    {
      key: document2.key,
      bridge,
      libraryId: document2.knowledgeBaseId,
      documentInfo: { id: document2.documentId, name: document2.documentName },
      requestPreview: true,
      backLabel: "\u8FD4\u56DE\u5F15\u7528\u6587\u6863",
      close: () => setSelected(void 0)
    }
  )) : /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, loading && /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-library-state", role: "status" }, /* @__PURE__ */ import_react4.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u6C47\u603B\u4F1A\u8BDD\u5F15\u7528\u2026"), incomplete && /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-library-state tbea-library-error", role: "status" }, /* @__PURE__ */ import_react4.default.createElement("span", null, historyStatus.error || (snapshotError ? "\u90E8\u5206\u53C2\u8003\u6765\u6E90\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u3002" : "\u90E8\u5206\u53C2\u8003\u6765\u6E90\u7F3A\u5C11\u6587\u6863\u6807\u8BC6\uFF0C\u53EF\u5728\u5BF9\u5E94\u8F6E\u6B21\u67E5\u770B\u3002")), (historyStatus.error || snapshotError) && /* @__PURE__ */ import_react4.default.createElement("button", { className: "tbea-library-button", type: "button", onClick: () => setRevision((value) => value + 1) }, "\u91CD\u8BD5")), !loading && !incomplete && !documents.length && /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-library-state" }, "\u672C\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u516C\u53F8\u77E5\u8BC6\u5E93\u5F15\u7528\u6587\u6863\u3002"), /* @__PURE__ */ import_react4.default.createElement("ul", { className: "tbea-cited-list", "aria-label": "\u672C\u4F1A\u8BDD\u7684\u77E5\u8BC6\u6587\u6863" }, documents.map((item) => /* @__PURE__ */ import_react4.default.createElement("li", { key: item.key, className: "tbea-cited-row" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "tbea-cited-document" }, /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "tbea-cited-name", onClick: () => setSelected(item.key) }, /* @__PURE__ */ import_react4.default.createElement(FileText, { size: 16, "aria-hidden": "true" }), /* @__PURE__ */ import_react4.default.createElement("span", null, item.documentName)), /* @__PURE__ */ import_react4.default.createElement("p", null, item.knowledgeBaseName || "\u516C\u53F8\u77E5\u8BC6\u5E93", " \xB7 ", item.turns.length === 1 ? `\u7B2C ${item.turns[0]} \u8F6E` : `\u5F15\u7528\u4E8E ${item.turns.length} \u8F6E`)), item.turns.length === 1 ? /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: (event) => showChatTurn(event, openView, item.turns[0]) }, "\u67E5\u770B\u5F15\u7528") : /* @__PURE__ */ import_react4.default.createElement("details", { className: "tbea-cited-turns" }, /* @__PURE__ */ import_react4.default.createElement("summary", { className: "tbea-library-button" }, "\u67E5\u770B\u5F15\u7528"), /* @__PURE__ */ import_react4.default.createElement("ul", null, item.turns.map((turn) => /* @__PURE__ */ import_react4.default.createElement("li", { key: turn }, /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "tbea-library-button", onClick: (event) => showChatTurn(event, openView, turn) }, "\u7B2C ", turn, " \u8F6E"))))))))));
}

// plugin/src/display-transport.mjs
var displayPath = "/api/tbea-knowledge";

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
    if (response.ok && mediaType?.startsWith("image/")) {
      return { mediaType, bytes: new Uint8Array(await response.arrayBuffer()) };
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      throw new Error(result?.error?.message || `\u77E5\u8BC6\u5C55\u793A\u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${response.status}\uFF09`);
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
    inject: (sessionId) => ({ selection, selectionSessionId: sessionId })
  }, KnowledgeSelection));
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "tbea-knowledge-prefetch",
    inject: () => ({ bridge })
  }, PrefetchedKnowledge));
  ctx.slots.inject("conversation.view", () => ctx.slots.register({
    name: "conversation.view",
    id: "tbea-cited-documents",
    order: 50,
    label: () => "\u5F15\u7528\u6587\u6863",
    inject: (sessionId) => ({ bridge, binding: ctx.sessions.binding(sessionId) })
  }, CitedDocumentsView));
}
function LibraryPanelIcon({ size = 16, className }) {
  return /* @__PURE__ */ import_react5.default.createElement(BookOpen, { size, className, "aria-hidden": "true" });
}
function KnowledgeSelection({ selection, selectionSessionId }) {
  const subscribe = (0, import_react5.useCallback)((listener) => selection.subscribe(selectionSessionId, listener), [selection, selectionSessionId]);
  const snapshot = (0, import_react5.useCallback)(() => selection.get(selectionSessionId), [selection, selectionSessionId]);
  const state = (0, import_react5.useSyncExternalStore)(subscribe, snapshot, snapshot);
  const serviceError = state.servicePhase === "error";
  const serviceStopped = state.servicePhase === "stopped";
  if (!state.selected && !state.error && !state.pending && !serviceError && !serviceStopped && state.servicePhase !== "starting") return null;
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-selection-dock" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-selection", "aria-label": "\u516C\u53F8\u77E5\u8BC6\u5E93\u6765\u6E90\u9009\u62E9" }, state.selected ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-selection-chip" }, /* @__PURE__ */ import_react5.default.createElement(BookOpen, { size: 14 }), /* @__PURE__ */ import_react5.default.createElement("span", null, "\u516C\u53F8\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", "aria-label": "\u53D6\u6D88\u516C\u53F8\u77E5\u8BC6\u5E93", title: state.autoRetrieveKnowledge === false ? "\u53D6\u6D88\u540E\uFF0C\u9700\u624B\u52A8\u9009\u62E9\u624D\u4F1A\u67E5\u8BE2\u516C\u53F8\u77E5\u8BC6\u5E93" : "\u53D6\u6D88\u540E\u7531\u6A21\u578B\u6309\u9700\u5224\u65AD\u662F\u5426\u67E5\u5E93", disabled: state.pending, onClick: () => {
    void selection.select(selectionSessionId, false);
  } }, /* @__PURE__ */ import_react5.default.createElement(X, { size: 13 }))) : null, state.pending || state.phase === "searching" ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-selection-status", role: "status" }, /* @__PURE__ */ import_react5.default.createElement(LoaderCircle, { size: 13, className: "tbea-spin" }), state.pending ? state.pendingAction === "service" ? "\u6B63\u5728\u542F\u52A8\u516C\u53F8\u77E5\u8BC6\u670D\u52A1\u2026" : "\u6B63\u5728\u4FDD\u5B58\u9009\u62E9\u2026" : state.message) : null, state.phase === "partial" && !state.pending ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-selection-status", role: "status" }, state.message) : null, state.servicePhase === "starting" && !state.pending ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-selection-status", role: "status" }, /* @__PURE__ */ import_react5.default.createElement(LoaderCircle, { size: 13, className: "tbea-spin" }), "\u6B63\u5728\u542F\u52A8\u516C\u53F8\u77E5\u8BC6\u670D\u52A1\u2026") : null, serviceStopped ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-selection-status", role: "status" }, state.serviceMessage) : null, state.error || serviceError || state.phase === "error" || state.phase === "stopped" ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-selection-error", role: "alert" }, state.error || (serviceError ? state.serviceMessage : state.message), serviceError ? /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-icon", type: "button", title: "\u91CD\u8BD5\u542F\u52A8\u77E5\u8BC6\u670D\u52A1", "aria-label": "\u91CD\u8BD5\u542F\u52A8\u77E5\u8BC6\u670D\u52A1", disabled: state.pending, onClick: () => {
    void selection.retry(selectionSessionId);
  } }, /* @__PURE__ */ import_react5.default.createElement(RefreshCw, { size: 16 })) : null) : null));
}
function PrefetchedKnowledge({ node, bridge }) {
  const view = node.data?.view;
  if (view?.schema !== "tbea-view/v1") return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-error", role: "alert" }, "\u516C\u53F8\u77E5\u8BC6\u68C0\u7D22\u8BB0\u5F55\u7F3A\u5C11\u6765\u6E90\u4FE1\u606F\uFF0C\u8BF7\u67E5\u770B\u8FD0\u884C\u8F68\u8FF9\u3002");
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-prefetched" }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-prefetched-label" }, "\u5DF2\u5148\u68C0\u7D22\u516C\u53F8\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react5.default.createElement(Sources, { view, bridge }));
}
function textOf(block) {
  return (block?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}
function errorOf(block) {
  const text = textOf(block);
  try {
    const data = JSON.parse(text);
    return data.message || text;
  } catch {
    return text;
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
  if (!result) return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react5.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u68C0\u7D22\u516C\u53F8\u77E5\u8BC6\u2026");
  if (props.block.isError) return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-error", role: "alert" }, "\u77E5\u8BC6\u68C0\u7D22\u5931\u8D25\uFF1A", errorOf(props.block) || "\u8BF7\u6C42\u5DF2\u505C\u6B62\u6216\u672A\u5B8C\u6210");
  if (!view?.snapshotId) return /* @__PURE__ */ import_react5.default.createElement("pre", { className: "tbea-fallback" }, textOf(props.block) || "\u5F53\u524D\u7ED3\u679C\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u6765\u6E90\u4FE1\u606F");
  return /* @__PURE__ */ import_react5.default.createElement(Sources, { view, bridge: props.bridge });
}
function Sources({ view, bridge }) {
  const panelId = (0, import_react5.useId)();
  const [open, setOpen] = (0, import_react5.useState)(false);
  const [snapshot, setSnapshot] = (0, import_react5.useState)(null);
  const [error, setError] = (0, import_react5.useState)("");
  const [loading, setLoading] = (0, import_react5.useState)(false);
  const [revision, setRevision] = (0, import_react5.useState)(0);
  const coverage = view.coverage || snapshot?.coverage;
  const partial = coverage && coverage.completed < coverage.requested;
  (0, import_react5.useEffect)(() => {
    if (!open) return;
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
  }, [open, view.snapshotId, bridge, revision]);
  return /* @__PURE__ */ import_react5.default.createElement("section", { className: "tbea-sources", "aria-label": "\u516C\u53F8\u77E5\u8BC6\u53C2\u8003\u6765\u6E90" }, /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-source-toggle", type: "button", "aria-expanded": open, "aria-controls": panelId, onClick: () => setOpen(!open) }, open ? /* @__PURE__ */ import_react5.default.createElement(ChevronDown, { size: 16 }) : /* @__PURE__ */ import_react5.default.createElement(ChevronRight, { size: 16 }), /* @__PURE__ */ import_react5.default.createElement(BookOpen, { size: 16 }), /* @__PURE__ */ import_react5.default.createElement("strong", null, "\u53C2\u8003\u6765\u6E90"), /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-count" }, view.count ?? "\u2014"), /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-query", title: view.query }, view.query), view.mode === "mock" ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-demo" }, "\u6F14\u793A") : null, partial ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-count", title: "\u90E8\u5206\u77E5\u8BC6\u5E93\u672A\u5B8C\u6210\u68C0\u7D22" }, "\u5DF2\u67E5 ", coverage.completed, "/", coverage.requested, " \u5E93") : null, view.evidenceStatus === "partial" ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-count", title: "\u53EA\u627E\u5230\u90E8\u5206\u6240\u95EE\u4E8B\u9879\u7684\u4F9D\u636E" }, "\u90E8\u5206\u6709\u4F9D\u636E") : null), open ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-source-body", id: panelId, "aria-busy": loading }, loading ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react5.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u8BFB\u53D6\u6765\u6E90\u2026") : null, error ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-error", role: "alert" }, error, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "tbea-icon", title: "\u91CD\u65B0\u8BFB\u53D6\u6765\u6E90", onClick: () => setRevision((r) => r + 1) }, /* @__PURE__ */ import_react5.default.createElement(RefreshCw, { size: 15 }))) : null, !loading && !error && snapshot?.citations.length === 0 ? /* @__PURE__ */ import_react5.default.createElement("p", { className: "tbea-empty" }, snapshot.retrievalSkipped ? "\u672C\u6B21\u95EE\u9898\u65E0\u9700\u67E5\u8BE2\u516C\u53F8\u77E5\u8BC6\u5E93\u3002" : partial ? "\u672C\u6B21\u68C0\u7D22\u8303\u56F4\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u68C0\u7D22\u7684\u77E5\u8BC6\u5E93\u4E2D\u672A\u627E\u5230\u76F8\u5173\u4F9D\u636E\uFF0C\u53EF\u91CD\u65B0\u53D1\u9001\u95EE\u9898\u3002" : "\u672A\u68C0\u7D22\u5230\u76F8\u5173\u4F9D\u636E\uFF0C\u8BF7\u8865\u5145\u4EA7\u54C1\u3001\u5730\u533A\u6216\u6807\u51C6\u7248\u672C\u7B49\u6761\u4EF6\u3002") : null, !loading && !error && snapshot?.citations.map((c) => /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-citation-group", key: c.citationId }, /* @__PURE__ */ import_react5.default.createElement(Citation, { citation: c, snapshotId: view.snapshotId, bridge, onRefresh: setSnapshot }), c.equivalentSources?.length ? /* @__PURE__ */ import_react5.default.createElement(EquivalentSources, { sources: c.equivalentSources, snapshotId: view.snapshotId, bridge, onRefresh: setSnapshot }) : null))) : null);
}
function EquivalentSources({ sources, snapshotId, bridge, onRefresh }) {
  const [open, setOpen] = (0, import_react5.useState)(false);
  return /* @__PURE__ */ import_react5.default.createElement("details", { className: "tbea-related-sources", onToggle: (event) => setOpen(event.currentTarget.open) }, /* @__PURE__ */ import_react5.default.createElement("summary", null, "\u5176\u4ED6\u6765\u6E90\uFF08", sources.length, "\uFF09"), open ? sources.map((source) => /* @__PURE__ */ import_react5.default.createElement(Citation, { key: source.citationId, citation: source, snapshotId, bridge, onRefresh })) : null);
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
  const contentId = (0, import_react5.useId)();
  const detailId = (0, import_react5.useId)();
  const hasPreview = c.content.length > 220 || c.content.split(/\r?\n/).length > 5;
  const [expanded, setExpanded] = (0, import_react5.useState)(false);
  const [detail, setDetail] = (0, import_react5.useState)(false);
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const [error, setError] = (0, import_react5.useState)("");
  const [copied, setCopied] = (0, import_react5.useState)(false);
  const timer = (0, import_react5.useRef)();
  (0, import_react5.useEffect)(() => () => clearTimeout(timer.current), []);
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
  return /* @__PURE__ */ import_react5.default.createElement("article", { className: "tbea-citation", id: `tbea-${c.citationId}` }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-citation-head" }, /* @__PURE__ */ import_react5.default.createElement(FileText, { size: 16 }), /* @__PURE__ */ import_react5.default.createElement("strong", { title: c.documentName }, c.documentName), /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-icon", type: "button", title: copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", "aria-label": copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", onClick: copy }, copied ? /* @__PURE__ */ import_react5.default.createElement(Check, { size: 16 }) : /* @__PURE__ */ import_react5.default.createElement(Copy, { size: 16 })), /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-sr-only", role: "status" }, copied ? "\u5207\u7247\u5185\u5BB9\u5DF2\u590D\u5236" : "")), /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-meta" }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-citation-id", title: "\u56DE\u7B54\u5BF9\u5E94\u7684\u5F15\u7528\u7F16\u53F7" }, c.citationId), /* @__PURE__ */ import_react5.default.createElement("span", null, c.knowledgeBaseName), c.page ? /* @__PURE__ */ import_react5.default.createElement("span", null, "\u7B2C ", c.page, " \u9875") : null, typeof c.score === "number" ? /* @__PURE__ */ import_react5.default.createElement("span", { title: "\u68C0\u7D22\u76F8\u5173\u5206\u6570\uFF0C\u4E0D\u4EE3\u8868\u7B54\u6848\u6B63\u786E\u7387" }, "\u76F8\u5173\u5206\u6570 ", c.score.toFixed(3)) : null), c.content ? /* @__PURE__ */ import_react5.default.createElement("p", { id: contentId, className: `tbea-content ${hasPreview && !expanded ? "tbea-collapsed" : ""}` }, c.content) : null, hasPreview ? /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-text-button", type: "button", "aria-expanded": expanded, "aria-controls": contentId, onClick: () => setExpanded(!expanded) }, expanded ? "\u6536\u8D77\u6587\u5B57" : "\u5C55\u5F00\u6587\u5B57") : null, c.tables.map((table, index) => /* @__PURE__ */ import_react5.default.createElement(Table, { key: index, table, index })), c.images.length ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-gallery" }, c.images.map((image) => /* @__PURE__ */ import_react5.default.createElement(ImagePreview, { key: image.id, image, snapshotId, bridge }))) : null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-citation-actions" }, /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-text-button", type: "button", "aria-expanded": detail, "aria-controls": detailId, onClick: () => setDetail(!detail) }, detail ? "\u6536\u8D77\u5207\u7247\u8BE6\u60C5" : "\u5207\u7247\u8BE6\u60C5"), /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-icon", type: "button", disabled: busy, title: "\u91CD\u65B0\u83B7\u53D6\u5E73\u53F0\u5207\u7247\u8BE6\u60C5", "aria-label": "\u91CD\u65B0\u83B7\u53D6\u5E73\u53F0\u5207\u7247\u8BE6\u60C5", onClick: refresh }, busy ? /* @__PURE__ */ import_react5.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }) : /* @__PURE__ */ import_react5.default.createElement(RefreshCw, { size: 16 }))), detail ? /* @__PURE__ */ import_react5.default.createElement("dl", { className: "tbea-details", id: detailId }, /* @__PURE__ */ import_react5.default.createElement("dt", null, "\u6587\u6863"), /* @__PURE__ */ import_react5.default.createElement("dd", null, c.documentName), /* @__PURE__ */ import_react5.default.createElement("dt", null, "\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react5.default.createElement("dd", null, c.knowledgeBaseName), /* @__PURE__ */ import_react5.default.createElement("dt", null, "\u5207\u7247 ID"), /* @__PURE__ */ import_react5.default.createElement("dd", null, c.chunkId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react5.default.createElement("dt", null, "\u6587\u6863 ID"), /* @__PURE__ */ import_react5.default.createElement("dd", null, c.documentId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react5.default.createElement("dt", null, "\u77E5\u8BC6\u5E93 ID"), /* @__PURE__ */ import_react5.default.createElement("dd", null, c.knowledgeBaseId)) : null, error ? /* @__PURE__ */ import_react5.default.createElement("p", { className: "tbea-error", role: "alert" }, error) : null);
}
function Table({ table, index }) {
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-table-scroll", tabIndex: 0, role: "region", "aria-label": `\u5207\u7247\u8868\u683C ${index + 1}` }, /* @__PURE__ */ import_react5.default.createElement("table", { className: "tbea-table" }, /* @__PURE__ */ import_react5.default.createElement("tbody", null, table.rows.map((row, r) => /* @__PURE__ */ import_react5.default.createElement("tr", { key: r }, row.map((cell, column) => {
    const Tag = cell.header ? "th" : "td";
    return /* @__PURE__ */ import_react5.default.createElement(Tag, { key: column, colSpan: cell.colSpan, rowSpan: cell.rowSpan }, cell.text);
  }))))));
}
function ImagePreview({ image, snapshotId, bridge }) {
  const [src, setSrc] = (0, import_react5.useState)("");
  const [error, setError] = (0, import_react5.useState)("");
  const [retry, setRetry] = (0, import_react5.useState)(0);
  const [open, setOpen] = (0, import_react5.useState)(false);
  (0, import_react5.useEffect)(() => {
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
  return /* @__PURE__ */ import_react5.default.createElement("figure", { className: "tbea-image" }, /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-image-button", type: "button", title: "\u67E5\u770B\u5927\u56FE", "aria-label": "\u67E5\u770B\u5927\u56FE", disabled: !src, onClick: () => setOpen(true) }, src ? /* @__PURE__ */ import_react5.default.createElement("img", { src, alt: image.caption || "\u77E5\u8BC6\u5E93\u5173\u8054\u56FE\u7247", onError: () => {
    setError("\u56FE\u7247\u65E0\u6CD5\u89E3\u7801\uFF0C\u8BF7\u5237\u65B0\u5207\u7247\u540E\u91CD\u8BD5");
    setSrc("");
  } }) : error ? /* @__PURE__ */ import_react5.default.createElement(Image, { size: 24 }) : /* @__PURE__ */ import_react5.default.createElement(LoaderCircle, { size: 20, className: "tbea-spin" })), image.caption ? /* @__PURE__ */ import_react5.default.createElement("figcaption", null, image.caption) : null, error ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-error" }, error, /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-icon", title: "\u91CD\u8BD5\u56FE\u7247", type: "button", onClick: () => setRetry((r) => r + 1) }, /* @__PURE__ */ import_react5.default.createElement(RefreshCw, { size: 15 }))) : null, open && src ? /* @__PURE__ */ import_react5.default.createElement(ImageModal, { src, caption: image.caption || "\u77E5\u8BC6\u5E93\u5173\u8054\u56FE\u7247", onClose: () => setOpen(false) }) : null);
}
function ImageModal({ src, caption, onClose }) {
  const [scale, setScale] = (0, import_react5.useState)(1);
  const [natural, setNatural] = (0, import_react5.useState)();
  const [fit, setFit] = (0, import_react5.useState)(1);
  const dialog = (0, import_react5.useRef)();
  const viewport = (0, import_react5.useRef)();
  const closeButton = (0, import_react5.useRef)();
  (0, import_react5.useEffect)(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node.showModal();
    closeButton.current?.focus();
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  (0, import_react5.useEffect)(() => {
    if (!natural) return;
    const node = viewport.current;
    const update = () => setFit(Math.max(0.01, Math.min((node.clientWidth - 32) / natural.width, (node.clientHeight - 32) / natural.height, 1)));
    const observer = new ResizeObserver(update);
    observer.observe(node);
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
  return /* @__PURE__ */ import_react5.default.createElement("dialog", { className: "tbea-image-modal", ref: dialog, "aria-label": caption, onKeyDown: keepFocus, onCancel: (event) => {
    event.preventDefault();
    onClose();
  }, onClick: (event) => {
    if (event.target === event.currentTarget) onClose();
  } }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-modal-head" }, /* @__PURE__ */ import_react5.default.createElement("strong", { title: caption }, caption), /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-modal-tools", role: "toolbar", "aria-label": "\u56FE\u7247\u9884\u89C8\u5DE5\u5177" }, /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-icon", title: "\u7F29\u5C0F", "aria-label": "\u7F29\u5C0F", type: "button", disabled: scale <= 0.5, onClick: () => setScale((s) => Math.max(0.5, s - 0.25)) }, /* @__PURE__ */ import_react5.default.createElement(ZoomOut, { size: 16 })), /* @__PURE__ */ import_react5.default.createElement("span", { className: "tbea-zoom-label", role: "status", "aria-label": "\u76F8\u5BF9\u9002\u914D\u5C3A\u5BF8\u7684\u7F29\u653E\u6BD4\u4F8B" }, Math.round(scale * 100), "%"), /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-icon", title: "\u6062\u590D\u5927\u5C0F", "aria-label": "\u6062\u590D\u5927\u5C0F", type: "button", onClick: () => setScale(1) }, /* @__PURE__ */ import_react5.default.createElement(RotateCcw, { size: 16 })), /* @__PURE__ */ import_react5.default.createElement("button", { className: "tbea-icon", title: "\u653E\u5927", "aria-label": "\u653E\u5927", type: "button", disabled: scale >= 4, onClick: () => setScale((s) => Math.min(4, s + 0.25)) }, /* @__PURE__ */ import_react5.default.createElement(ZoomIn, { size: 16 })), /* @__PURE__ */ import_react5.default.createElement("a", { className: "tbea-icon", title: "\u4E0B\u8F7D\u56FE\u7247", "aria-label": "\u4E0B\u8F7D\u56FE\u7247", href: src, download: "\u77E5\u8BC6\u5E93\u56FE\u7247.png" }, /* @__PURE__ */ import_react5.default.createElement(Download, { size: 16 })), /* @__PURE__ */ import_react5.default.createElement("button", { ref: closeButton, className: "tbea-icon", title: "\u5173\u95ED\u56FE\u7247", "aria-label": "\u5173\u95ED\u56FE\u7247", type: "button", onClick: onClose }, /* @__PURE__ */ import_react5.default.createElement(X, { size: 16 })))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-modal-image", ref: viewport, tabIndex: 0, role: "region", "aria-label": "\u56FE\u7247\u9884\u89C8\u533A\u57DF" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "tbea-modal-canvas" }, /* @__PURE__ */ import_react5.default.createElement("img", { src, alt: caption, onLoad: (event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }), style: { width: natural ? natural.width * fit * scale : "100%", visibility: natural ? "visible" : "hidden" } }))));
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
