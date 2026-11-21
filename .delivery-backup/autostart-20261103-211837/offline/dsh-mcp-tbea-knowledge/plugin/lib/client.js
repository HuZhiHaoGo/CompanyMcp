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
var style_default = "/* \u8DDF\u968F Harness 0.2.2-alpha.2 \u7684\u4E3B\u9898\u53D8\u91CF\uFF1B\u540E\u5907\u503C\u4EC5\u7528\u4E8E\u72EC\u7ACB\u6F14\u793A\u3002\n   \u4E0D\u5199\u5165\u5BBF\u4E3B\u53D8\u91CF\uFF0C\u4E0D\u4EE5\u7CFB\u7EDF\u6DF1\u8272\u5A92\u4F53\u67E5\u8BE2\u8986\u76D6 DSH \u7684\u624B\u52A8\u4E3B\u9898\u3002 */\n:where(.tbea-sources,.tbea-selection,.tbea-prefetched,.tbea-image-modal,.tbea-status,.tbea-error,.tbea-fallback) {\n  --tbea-fg:var(--dsw-alias-label-primary,#0f1115);\n  --tbea-muted:var(--dsw-alias-label-secondary,#61666b);\n  --tbea-subtle:var(--dsw-alias-label-tertiary,#81858c);\n  --tbea-surface:var(--dsw-alias-bg-layer-1,#fff);\n  --tbea-soft:var(--dsw-alias-markdown-code-block,#f9fafb);\n  --tbea-border:var(--dsw-alias-border-l2,rgba(0,0,0,.1));\n  --tbea-hover:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06));\n  --tbea-active:var(--dsw-alias-interactive-bg-active,rgba(38,49,72,.1));\n  --tbea-accent:var(--dsw-alias-state-business-primary,#4176e6);\n  --tbea-accent-bg:var(--dsw-alias-state-business-tertiary,#e4edfd);\n  --tbea-danger:var(--dsw-alias-state-error-primary,#ec1313);\n  box-sizing:border-box; min-width:0;\n  font-family:var(--dsw-font-family,system-ui,sans-serif);\n  font-size:var(--dsh-content-font-size,14px);\n  line-height:calc(24px + var(--dsh-content-font-delta,0px));\n  color:var(--tbea-fg);\n}\nbody[data-ds-dark-theme] :where(.tbea-sources,.tbea-selection,.tbea-prefetched,.tbea-image-modal,.tbea-status,.tbea-error,.tbea-fallback) {\n  --tbea-fg:var(--dsw-alias-label-primary,#f9fafb);\n  --tbea-muted:var(--dsw-alias-label-secondary,#adb2b8);\n  --tbea-subtle:var(--dsw-alias-label-tertiary,#81858c);\n  --tbea-surface:var(--dsw-alias-bg-layer-1,#232324);\n  --tbea-soft:var(--dsw-alias-markdown-code-block,#1b1b1c);\n  --tbea-border:var(--dsw-alias-border-l2,rgba(255,255,255,.12));\n  --tbea-hover:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));\n  --tbea-active:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.14));\n  --tbea-accent:var(--dsw-alias-state-business-primary,#7aaaff);\n  --tbea-accent-bg:var(--dsw-alias-state-business-tertiary,#34415b);\n  --tbea-danger:var(--dsw-alias-state-error-primary,#f25a5a);\n}\n.tbea-sources *,.tbea-image-modal *,.tbea-selection * { box-sizing:border-box; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) :where(button,a) { font-family:inherit; font-size:inherit; line-height:inherit; -webkit-app-region:no-drag; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) button { appearance:none; cursor:pointer; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) :where(button,a):focus-visible,\n.tbea-table-scroll:focus-visible,.tbea-modal-image:focus-visible { outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--tbea-accent)); outline-offset:-2px; }\n:where(.tbea-sources,.tbea-image-modal,.tbea-selection) button:disabled { opacity:.4; cursor:not-allowed; }\n.tbea-sources svg,.tbea-selection svg,.tbea-image-modal svg { flex:none; stroke-width:1.7; }\n\n/* \u4E0E\u539F\u751F PlanChip / Button.sm \u5171\u7528 28px \u9AD8\u5EA6\u548C 8px \u5706\u89D2\u5C42\u7EA7\u3002 */\n.tbea-selection { display:flex; align-items:center; flex-wrap:wrap; gap:6px 8px; padding:4px 0; }\n.tbea-selection-chip { display:inline-flex; align-items:center; flex:none; gap:4px; height:28px; padding:0 4px 0 8px; border:0; border-radius:var(--dsw-radius-sm,8px); font-size:13px; font-weight:500; line-height:20px; color:var(--tbea-accent); background:var(--tbea-accent-bg); }\n.tbea-selection-chip button { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; padding:0; border:0; border-radius:var(--dsw-radius-xs,4px); background:transparent; color:inherit; }\n.tbea-selection-status,.tbea-selection-error { display:inline-flex; align-items:center; gap:6px; min-width:0; font-size:12px; line-height:18px; color:var(--tbea-muted); overflow-wrap:anywhere; }\n.tbea-selection-error { color:var(--tbea-danger); }\n.tbea-prefetched { width:100%; padding:4px 0; }\n.tbea-prefetched-label { font-size:var(--dsh-content-font-size-secondary,13px); color:var(--tbea-subtle); }\n\n.tbea-sources { width:100%; margin:8px 0; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-md,12px); background:transparent; }\n.tbea-source-toggle { display:flex; align-items:center; gap:6px; width:100%; min-height:36px; padding:4px 10px; border:0; border-radius:inherit; background:transparent; color:var(--tbea-muted); text-align:left; font-size:var(--dsh-content-font-size-secondary,13px); }\n.tbea-source-toggle strong { flex:none; font-weight:500; }\n.tbea-count,.tbea-demo { flex:none; padding:0 6px; border-radius:var(--dsw-radius-xs,4px); font-size:12px; line-height:20px; background:var(--tbea-hover); color:var(--tbea-muted); }\n.tbea-query { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--tbea-subtle); font-size:12px; }\n.tbea-source-body { padding:0 12px; border-top:1px solid var(--tbea-border); }\n.tbea-citation { min-width:0; padding:12px 0; border-bottom:1px solid var(--tbea-border); }\n.tbea-citation:last-child { border-bottom:0; }\n.tbea-citation-head { display:grid; grid-template-columns:16px minmax(0,1fr) 28px; align-items:start; gap:6px; min-height:28px; }\n.tbea-citation-head>svg { margin-top:6px; color:var(--tbea-subtle); }\n.tbea-citation-head strong { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-width:0; padding-top:3px; overflow:hidden; font-size:var(--dsh-content-font-size-secondary,13px); font-weight:500; line-height:22px; overflow-wrap:anywhere; }\n.tbea-citation-id { color:var(--tbea-subtle); font:12px/18px var(--ds-font-family-code,Consolas,monospace); overflow-wrap:anywhere; }\n.tbea-meta { display:flex; flex-wrap:wrap; gap:2px 12px; margin-top:4px; color:var(--tbea-subtle); font-size:12px; line-height:18px; overflow-wrap:anywhere; }\n.tbea-content { margin:10px 0 4px; white-space:pre-wrap; overflow-wrap:anywhere; user-select:text; }\n.tbea-content.tbea-collapsed { display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical; overflow:hidden; }\n.tbea-text-button { display:inline-flex; align-items:center; justify-content:center; min-height:28px; padding:0 8px; border:0; border-radius:var(--dsw-radius-sm,8px); color:var(--tbea-muted); background:transparent; font-size:12px; line-height:18px; text-decoration:none; }\n.tbea-icon { display:inline-flex; align-items:center; justify-content:center; flex:none; width:28px; height:28px; padding:0; border:0; border-radius:var(--dsw-radius-sm,8px); color:var(--tbea-muted); background:transparent; text-decoration:none; }\n.tbea-icon svg { width:16px; height:16px; }\n.tbea-citation-actions { display:flex; flex-wrap:wrap; align-items:center; gap:4px; margin:6px -8px 0; }\n@media (hover:hover) {\n  .tbea-source-toggle:hover,.tbea-icon:hover:not(:disabled),.tbea-text-button:hover:not(:disabled),.tbea-selection-chip button:hover:not(:disabled) { background:var(--tbea-hover); color:var(--tbea-fg); }\n  .tbea-image-button:hover:not(:disabled) { border-color:var(--tbea-accent); }\n}\n.tbea-icon:active:not(:disabled),.tbea-text-button:active:not(:disabled),.tbea-source-toggle:active { background:var(--tbea-active); }\n\n.tbea-table-scroll { max-width:100%; max-height:360px; overflow:auto; overscroll-behavior:contain; margin:12px 0; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-sm,8px); }\n.tbea-table { min-width:100%; border-collapse:collapse; font-size:var(--dsh-content-font-size-secondary,13px); line-height:calc(22px + var(--dsh-content-font-delta-secondary,0px)); color:var(--tbea-fg); }\n.tbea-table th,.tbea-table td { min-width:90px; max-width:500px; padding:8px 12px; border:1px solid var(--tbea-border); text-align:left; vertical-align:top; white-space:pre-wrap; overflow-wrap:anywhere; }\n.tbea-table th { background:var(--tbea-soft); font-weight:500; }\n.tbea-gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; margin:12px 0; }\n.tbea-image { min-width:0; margin:0; }\n.tbea-image-button { display:grid; place-items:center; position:relative; overflow:hidden; width:100%; height:160px; padding:8px; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-sm,8px); background:var(--tbea-soft); color:var(--tbea-muted); }\n.tbea-image-button:not(:disabled) { cursor:zoom-in; }\n.tbea-image-button img { display:block; position:absolute; inset:8px; width:calc(100% - 16px); height:calc(100% - 16px); object-fit:contain; }\n.tbea-image figcaption { margin-top:4px; color:var(--tbea-subtle); font-size:12px; line-height:18px; overflow-wrap:anywhere; }\n.tbea-details { display:grid; grid-template-columns:72px minmax(0,1fr); gap:6px 8px; padding:12px; margin:8px 0; border-radius:var(--dsw-radius-sm,8px); background:var(--tbea-soft); font-size:12px; line-height:20px; }\n.tbea-details dt { color:var(--tbea-subtle); }\n.tbea-details dd { margin:0; overflow-wrap:anywhere; user-select:text; }\n.tbea-error { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 0; color:var(--tbea-danger); font-size:12px; line-height:20px; overflow-wrap:anywhere; }\n.tbea-status { display:flex; align-items:center; gap:6px; padding:8px 0; color:var(--tbea-subtle); font-size:var(--dsh-content-font-size-secondary,13px); }\n.tbea-empty { margin:12px 0; color:var(--tbea-muted); }\n.tbea-fallback { max-height:300px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; font-family:var(--ds-font-family-code,Consolas,monospace); }\n.tbea-sr-only { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }\n.tbea-spin { animation:tbea-spin 1s linear infinite; }\n@keyframes tbea-spin { to { transform:rotate(360deg); } }\n@media (prefers-reduced-motion:reduce) { .tbea-spin { animation-duration:2s; } }\n\n/* \u6807\u9898\u6362\u884C\u548C\u5B57\u4F53\u653E\u5927\u65F6\uFF0C\u7531\u5B9E\u9645\u9AD8\u5EA6\u5206\u914D\u56FE\u7247\u7A7A\u95F4\uFF0C\u4E0D\u5199\u6B7B\u51CF\u6CD5\u3002 */\n.tbea-image-modal { position:fixed; inset:var(--dsh-frame-chrome-top,0px) 0 0; width:min(1100px,calc(100vw - 32px)); max-width:calc(100vw - 32px); height:min(800px,calc(100dvh - var(--dsh-frame-chrome-top,0px) - 32px)); max-height:calc(100dvh - var(--dsh-frame-chrome-top,0px) - 32px); margin:auto; padding:0; overflow:hidden; border:1px solid var(--tbea-border); border-radius:var(--dsw-radius-lg,16px); background:var(--tbea-surface); }\n.tbea-image-modal[open] { display:flex; flex-direction:column; }\n.tbea-image-modal::backdrop { background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.5)); }\n.tbea-modal-head { display:flex; flex:none; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; min-height:48px; padding:8px 12px; border-bottom:1px solid var(--tbea-border); }\n.tbea-modal-head strong { flex:1 1 100px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:var(--dsh-content-font-size-secondary,13px); font-weight:500; }\n.tbea-modal-tools { display:flex; align-items:center; flex:none; gap:4px; }\n.tbea-zoom-label { min-width:40px; text-align:center; color:var(--tbea-subtle); font-size:12px; line-height:20px; font-variant-numeric:tabular-nums; }\n.tbea-modal-image { flex:1; min-height:0; width:100%; padding:16px; overflow:auto; overscroll-behavior:contain; background:var(--tbea-soft); }\n.tbea-modal-canvas { display:flex; align-items:center; justify-content:center; min-width:100%; min-height:100%; width:max-content; }\n.tbea-modal-image img { display:block; flex:none; height:auto; max-width:none; object-fit:contain; }\n@media(max-width:480px) {\n  .tbea-source-toggle { flex-wrap:wrap; }\n  .tbea-query { flex-basis:100%; order:1; padding-left:22px; }\n  .tbea-source-body { padding:0 10px; }\n  .tbea-modal-head strong { flex-basis:100%; }\n  .tbea-modal-tools { width:100%; justify-content:flex-end; }\n}\n";

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
    return data.schema === "tbea-knowledge/v1" ? { snapshotId: data.snapshotId, count: data.hitCount, query: data.query, mode: data.mode } : null;
  } catch {
    return null;
  }
}
function KnowledgeTool(props) {
  const result = props.phase === "result";
  const view = result ? viewOf(props.block) : null;
  if (!result) return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u68C0\u7D22\u516C\u53F8\u77E5\u8BC6\u2026");
  if (props.block.isError) return /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-error", role: "alert" }, "\u77E5\u8BC6\u68C0\u7D22\u5931\u8D25\uFF1A", errorOf(props.block) || "\u8BF7\u6C42\u5DF2\u505C\u6B62\u6216\u672A\u5B8C\u6210");
  if (!view?.snapshotId) return /* @__PURE__ */ import_react3.default.createElement("pre", { className: "tbea-fallback" }, textOf(props.block) || "\u5F53\u524D\u7ED3\u679C\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u6765\u6E90\u4FE1\u606F");
  return /* @__PURE__ */ import_react3.default.createElement(Sources, { view, bridge: props.bridge });
}
function Sources({ view, bridge }) {
  const panelId = (0, import_react3.useId)();
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
  return /* @__PURE__ */ import_react3.default.createElement("section", { className: "tbea-sources", "aria-label": "\u516C\u53F8\u77E5\u8BC6\u53C2\u8003\u6765\u6E90" }, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-source-toggle", type: "button", "aria-expanded": open, "aria-controls": panelId, onClick: () => setOpen(!open) }, open ? /* @__PURE__ */ import_react3.default.createElement(ChevronDown, { size: 16 }) : /* @__PURE__ */ import_react3.default.createElement(ChevronRight, { size: 16 }), /* @__PURE__ */ import_react3.default.createElement(BookOpen, { size: 16 }), /* @__PURE__ */ import_react3.default.createElement("strong", null, "\u53C2\u8003\u6765\u6E90"), /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-count" }, view.count ?? "\u2014"), /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-query", title: view.query }, view.query), view.mode === "mock" ? /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-demo" }, "\u6F14\u793A") : null), open ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-source-body", id: panelId, "aria-busy": loading }, loading ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-status", role: "status" }, /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }), "\u6B63\u5728\u8BFB\u53D6\u6765\u6E90\u2026") : null, error ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-error", role: "alert" }, error, /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "tbea-icon", title: "\u91CD\u65B0\u8BFB\u53D6\u6765\u6E90", onClick: () => setRevision((r) => r + 1) }, /* @__PURE__ */ import_react3.default.createElement(RefreshCw, { size: 15 }))) : null, !loading && !error && snapshot?.citations.length === 0 ? /* @__PURE__ */ import_react3.default.createElement("p", { className: "tbea-empty" }, "\u672A\u68C0\u7D22\u5230\u76F8\u5173\u4F9D\u636E\uFF0C\u8BF7\u8865\u5145\u4EA7\u54C1\u3001\u5730\u533A\u6216\u6807\u51C6\u7248\u672C\u7B49\u6761\u4EF6\u3002") : null, snapshot?.citations.map((c) => /* @__PURE__ */ import_react3.default.createElement(Citation, { key: c.citationId, citation: c, snapshotId: view.snapshotId, bridge, onRefresh: setSnapshot }))) : null);
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
  const contentId = (0, import_react3.useId)();
  const detailId = (0, import_react3.useId)();
  const hasPreview = c.content.length > 220 || c.content.split(/\r?\n/).length > 5;
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
  return /* @__PURE__ */ import_react3.default.createElement("article", { className: "tbea-citation", id: `tbea-${c.citationId}` }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-citation-head" }, /* @__PURE__ */ import_react3.default.createElement(FileText, { size: 16 }), /* @__PURE__ */ import_react3.default.createElement("strong", { title: c.documentName }, c.documentName), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", type: "button", title: copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", "aria-label": copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5207\u7247\u5185\u5BB9", onClick: copy }, copied ? /* @__PURE__ */ import_react3.default.createElement(Check, { size: 16 }) : /* @__PURE__ */ import_react3.default.createElement(Copy, { size: 16 })), /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-sr-only", role: "status" }, copied ? "\u5207\u7247\u5185\u5BB9\u5DF2\u590D\u5236" : "")), /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-meta" }, /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-citation-id", title: "\u56DE\u7B54\u5BF9\u5E94\u7684\u5F15\u7528\u7F16\u53F7" }, c.citationId), /* @__PURE__ */ import_react3.default.createElement("span", null, c.knowledgeBaseName), c.page ? /* @__PURE__ */ import_react3.default.createElement("span", null, "\u7B2C ", c.page, " \u9875") : null, typeof c.score === "number" ? /* @__PURE__ */ import_react3.default.createElement("span", { title: "\u68C0\u7D22\u76F8\u5173\u5206\u6570\uFF0C\u4E0D\u4EE3\u8868\u7B54\u6848\u6B63\u786E\u7387" }, "\u76F8\u5173\u5206\u6570 ", c.score.toFixed(3)) : null), c.content ? /* @__PURE__ */ import_react3.default.createElement("p", { id: contentId, className: `tbea-content ${hasPreview && !expanded ? "tbea-collapsed" : ""}` }, c.content) : null, hasPreview ? /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-text-button", type: "button", "aria-expanded": expanded, "aria-controls": contentId, onClick: () => setExpanded(!expanded) }, expanded ? "\u6536\u8D77\u6587\u5B57" : "\u5C55\u5F00\u6587\u5B57") : null, c.tables.map((table, index) => /* @__PURE__ */ import_react3.default.createElement(Table, { key: index, table, index })), c.images.length ? /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-gallery" }, c.images.map((image) => /* @__PURE__ */ import_react3.default.createElement(ImagePreview, { key: image.id, image, snapshotId, bridge }))) : null, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-citation-actions" }, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-text-button", type: "button", "aria-expanded": detail, "aria-controls": detailId, onClick: () => setDetail(!detail) }, detail ? "\u6536\u8D77\u5207\u7247\u8BE6\u60C5" : "\u5207\u7247\u8BE6\u60C5"), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", type: "button", disabled: busy, title: "\u91CD\u65B0\u83B7\u53D6\u5E73\u53F0\u5207\u7247\u8BE6\u60C5", "aria-label": "\u91CD\u65B0\u83B7\u53D6\u5E73\u53F0\u5207\u7247\u8BE6\u60C5", onClick: refresh }, busy ? /* @__PURE__ */ import_react3.default.createElement(LoaderCircle, { size: 16, className: "tbea-spin" }) : /* @__PURE__ */ import_react3.default.createElement(RefreshCw, { size: 16 }))), detail ? /* @__PURE__ */ import_react3.default.createElement("dl", { className: "tbea-details", id: detailId }, /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u6587\u6863"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.documentName), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u77E5\u8BC6\u5E93"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.knowledgeBaseName), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u5207\u7247 ID"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.chunkId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u6587\u6863 ID"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.documentId || "\u5E73\u53F0\u672A\u63D0\u4F9B"), /* @__PURE__ */ import_react3.default.createElement("dt", null, "\u77E5\u8BC6\u5E93 ID"), /* @__PURE__ */ import_react3.default.createElement("dd", null, c.knowledgeBaseId)) : null, error ? /* @__PURE__ */ import_react3.default.createElement("p", { className: "tbea-error", role: "alert" }, error) : null);
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
  const [natural, setNatural] = (0, import_react3.useState)();
  const [fit, setFit] = (0, import_react3.useState)(1);
  const dialog = (0, import_react3.useRef)();
  const viewport = (0, import_react3.useRef)();
  const closeButton = (0, import_react3.useRef)();
  (0, import_react3.useEffect)(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node.showModal();
    closeButton.current?.focus();
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  (0, import_react3.useEffect)(() => {
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
  return /* @__PURE__ */ import_react3.default.createElement("dialog", { className: "tbea-image-modal", ref: dialog, "aria-label": caption, onKeyDown: keepFocus, onCancel: (event) => {
    event.preventDefault();
    onClose();
  }, onClick: (event) => {
    if (event.target === event.currentTarget) onClose();
  } }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-modal-head" }, /* @__PURE__ */ import_react3.default.createElement("strong", { title: caption }, caption), /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-modal-tools", role: "toolbar", "aria-label": "\u56FE\u7247\u9884\u89C8\u5DE5\u5177" }, /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u7F29\u5C0F", "aria-label": "\u7F29\u5C0F", type: "button", disabled: scale <= 0.5, onClick: () => setScale((s) => Math.max(0.5, s - 0.25)) }, /* @__PURE__ */ import_react3.default.createElement(ZoomOut, { size: 16 })), /* @__PURE__ */ import_react3.default.createElement("span", { className: "tbea-zoom-label", role: "status", "aria-label": "\u76F8\u5BF9\u9002\u914D\u5C3A\u5BF8\u7684\u7F29\u653E\u6BD4\u4F8B" }, Math.round(scale * 100), "%"), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u6062\u590D\u5927\u5C0F", "aria-label": "\u6062\u590D\u5927\u5C0F", type: "button", onClick: () => setScale(1) }, /* @__PURE__ */ import_react3.default.createElement(RotateCcw, { size: 16 })), /* @__PURE__ */ import_react3.default.createElement("button", { className: "tbea-icon", title: "\u653E\u5927", "aria-label": "\u653E\u5927", type: "button", disabled: scale >= 4, onClick: () => setScale((s) => Math.min(4, s + 0.25)) }, /* @__PURE__ */ import_react3.default.createElement(ZoomIn, { size: 16 })), /* @__PURE__ */ import_react3.default.createElement("a", { className: "tbea-icon", title: "\u4E0B\u8F7D\u56FE\u7247", "aria-label": "\u4E0B\u8F7D\u56FE\u7247", href: src, download: "\u77E5\u8BC6\u5E93\u56FE\u7247.png" }, /* @__PURE__ */ import_react3.default.createElement(Download, { size: 16 })), /* @__PURE__ */ import_react3.default.createElement("button", { ref: closeButton, className: "tbea-icon", title: "\u5173\u95ED\u56FE\u7247", "aria-label": "\u5173\u95ED\u56FE\u7247", type: "button", onClick: onClose }, /* @__PURE__ */ import_react3.default.createElement(X, { size: 16 })))), /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-modal-image", ref: viewport, tabIndex: 0, role: "region", "aria-label": "\u56FE\u7247\u9884\u89C8\u533A\u57DF" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "tbea-modal-canvas" }, /* @__PURE__ */ import_react3.default.createElement("img", { src, alt: caption, onLoad: (event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }), style: { width: natural ? natural.width * fit * scale : "100%", visibility: natural ? "visible" : "hidden" } }))));
}
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
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
