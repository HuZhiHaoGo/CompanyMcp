import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const common = { bundle: true, target: 'node24', platform: 'node', format: 'esm', sourcemap: true, banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' } };
await fs.mkdir(path.join(root, 'dist/demo'), { recursive: true });
await fs.mkdir(path.join(root, 'plugin/lib'), { recursive: true });
await build({ ...common, entryPoints: [path.join(root, 'src/server.ts')], outfile: path.join(root, 'dist/server.mjs') });
await build({ ...common, entryPoints: [path.join(root, 'scripts/doctor.mjs')], outfile: path.join(root, 'dist/doctor.mjs') });
await build({ ...common, entryPoints: [path.join(root, 'scripts/service-control.mjs')], outfile: path.join(root, 'dist/service-control.mjs') });
await build({ ...common, entryPoints: [path.join(root, 'plugin/src/host.mjs')], outfile: path.join(root, 'plugin/lib/index.js') });
await build({ entryPoints: [path.join(root, 'plugin/src/client.jsx')], bundle: true, outfile: path.join(root, 'plugin/lib/client.js'), platform: 'browser', target: 'chrome120', format: 'cjs', sourcemap: true,
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'text' },
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-plugin-tbea-knowledge",factory:(require)=>{var module={exports:{}};var exports=module.exports;' }, footer: { js: 'return module.exports;}});' },
});
await build({ entryPoints: [path.join(root, 'demo/entry.jsx')], bundle: true, outfile: path.join(root, 'dist/demo/demo.js'), platform: 'browser', target: 'chrome120', format: 'esm', loader: { '.css': 'text' } });
await fs.copyFile(path.join(root, 'demo/index.html'), path.join(root, 'dist/demo/index.html'));
// 演示样式随 JS 一起内嵌，此文件保留为页面的独立静态请求。
await fs.writeFile(path.join(root, 'dist/demo/demo.css'), '/* Styles are bundled in demo.js. */\n');
console.log('Build complete: dist/server.mjs, plugin/lib, dist/demo');
