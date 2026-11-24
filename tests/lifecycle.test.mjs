import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { readConfig } from '../src/config.ts';
import { DESKTOP_CONFIG_TEMPLATE, DESKTOP_DEPLOYMENT_CONFIG, desktopConfigLocations } from '../src/desktop-config.ts';
import { initializeDesktopConfig } from '../src/desktop-initialization.ts';
import { createKnowledgeServer } from '../src/server.ts';
import { configIdentity,SERVICE_VERSION,RUNTIME_PROTOCOL } from '../src/runtime.ts';
import { ServiceManager } from '../plugin/src/service-manager.mjs';
import { apply } from '../plugin/lib/index.js';
import { initialize } from '../scripts/init.mjs';
import { requestDisplay } from './display-route.mjs';

async function fixture(t) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tbea-启动 空格-'));
  t.after(()=>fs.rm(directory,{ recursive:true,force:true }));
  const listener=net.createServer(); await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
  const port=listener.address().port; await new Promise(resolve=>listener.close(resolve));
  const raw=JSON.parse(await fs.readFile(new URL('../config/example.json',import.meta.url),'utf8'));
  raw.port=port; raw.serviceToken='l'.repeat(64); raw.dataDirectory=path.join(directory,'资料 缓存');
  const file=path.join(directory,'本地 配置.json'); await fs.writeFile(file,JSON.stringify(raw));
  return { config:await readConfig(file),file,directory,base:`http://127.0.0.1:${port}` };
}
async function eventually(task) {
  for(let i=0;i<80;i++) { if(await task()) return; await new Promise(resolve=>setTimeout(resolve,25)); }
  throw new Error('状态未在预期时间内完成');
}
async function host(file,install=apply) {
  const effects=[]; let route; const tools=new Map();
  await install({ on(){},effect:fn=>effects.push(fn()),tools:{ register:tool=>tools.set(tool.name,tool) },connection:{ fetch:{ register:value=>{ route=value; } } } },{ configFile:file,projectRoot:fileURLToPath(new URL('../',import.meta.url)) });
  return { tools,rpc:(endpoint,args={})=>requestDisplay(route,endpoint,args),
    close:async()=>{ for(const dispose of effects.reverse()) await dispose(); } };
}
const gone=base=>fetch(base+'/health',{ signal:AbortSignal.timeout(500) }).then(()=>false,()=>true);
const control = (action, filename) => promisify(execFile)(process.execPath, [
  fileURLToPath(new URL('../dist/service-control.mjs', import.meta.url)), action, filename,
], { windowsHide: true });

test('托管服务关停核对口令、运行方式及配置，暂停期间不被自动拉起', async t => {
  const { file, config, base } = await fixture(t);
  const first = await host(file);
  t.after(() => first.close());
  await eventually(async () => (await first.rpc('selection', { sessionId: 'stop' })).value.servicePhase === 'ready');
  assert.equal((await first.rpc('select', { sessionId: 'stop', selected: true })).ok, true);
  const body = { configIdentity: configIdentity(config), owner: 'dsh' };
  const stop = (data, token) => fetch(base + '/shutdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  assert.equal((await stop(body)).status, 401);
  assert.equal((await stop({ ...body, owner: 'manual' }, config.serviceToken)).status, 409);
  assert.equal((await stop({ ...body, configIdentity: 'other' }, config.serviceToken)).status, 409);
  await assert.rejects(control('stop-manual', file), /由匠宝托管/);
  await control('stop-managed', file);
  assert.equal(await gone(base), true);
  assert.equal((await first.rpc('selection', { sessionId: 'stop' })).value.servicePhase, 'stopped');
  assert.equal((await first.rpc('service-retry')).ok, false);
  assert.equal(await gone(base), true);
  await first.close();
  const second = await host(file);
  t.after(() => second.close());
  await eventually(async () => (await second.rpc('selection', { sessionId: 'stop' })).value.servicePhase === 'ready');
  assert.equal((await second.rpc('selection', { sessionId: 'stop' })).value.selected, true);
});

test('卸载流程保留独立 MCP，显式关停和自动启动设置各自生效', async t => {
  const { file, config, base } = await fixture(t);
  const manual = await createKnowledgeServer(config);
  t.after(() => manual.close());
  await manual.listen();
  assert.match((await control('stop-for-uninstall', file)).stdout, /独立 MCP 仍在运行/);
  await assert.rejects(control('check-stopped', file), /先完全退出匠宝/);
  await control('disable-auto-start', file);
  const disabled = await readConfig(file);
  assert.equal(disabled.service.autoStart, false);
  assert.equal(configIdentity(disabled), configIdentity(config));
  assert.equal(await gone(base), false);
  await control('stop-manual', file);
  await control('check-stopped', file);
  await control('enable-auto-start', file);
  assert.equal((await readConfig(file)).service.autoStart, true);
});

test('Host 加载即自动启动、中文空格路径、真实 MCP、退出释放端口及再次启动',async t=>{
  const { file,base }=await fixture(t); const first=await host(file); t.after(()=>first.close());
  // 只读界面状态，不能靠首次工具调用代替启动时自动运行。
  await eventually(async()=> (await first.rpc('selection',{ sessionId:'a' })).value.servicePhase==='ready');
  assert.equal((await fetch(base+'/health').then(r=>r.json())).version,SERVICE_VERSION);
  assert.equal((await fetch(base+'/runtime')).status,401);
  assert.equal((await fetch(base+'/demo')).status,200,'Host 内的演示资源路径仍正确');
  const value=await first.tools.get('mcp__tbea__search_knowledge').execute({ query:'设计要求' },{ signal:new AbortController().signal });
  assert.equal(value.model.hitCount,2);
  assert.equal((await first.rpc('select',{ sessionId:'a',selected:true })).ok,true);
  await first.close(); assert.equal(await gone(base),true);
  const second=await host(file); t.after(()=>second.close());
  await eventually(async()=> (await second.rpc('selection',{ sessionId:'a' })).value.servicePhase==='ready');
  assert.equal((await second.rpc('selection',{ sessionId:'a' })).value.selected,true);
  await second.close(); assert.equal(await gone(base),true);
});

test('并发启动和同进程多实例共用服务，最后一个退出才关闭',async t=>{
  const { config,base }=await fixture(t);
  const a=new ServiceManager(config); const b=new ServiceManager(config);
  t.after(async()=>{ await a.close(); await b.close(); });
  await Promise.all(Array.from({ length:12 },(_,i)=>(i%2 ? a : b).ensure()));
  assert.equal(a.entry.app,b.entry.app);
  await a.close(); assert.equal((await fetch(base+'/health')).status,200);
  await b.ensure(); await b.close(); await b.close(); assert.equal(await gone(base),true);
});

test('复用配置一致的手动服务，插件退出不关闭手动服务',async t=>{
  const { config,base }=await fixture(t); const app=await createKnowledgeServer(config); await app.listen();
  const manager=new ServiceManager(config); t.after(async()=>{ await manager.close(); await app.close(); });
  let searches=0; const original=app.service.search.bind(app.service);
  app.service.search=(...args)=>{ searches++; return original(...args); };
  await manager.ensure(); assert.equal(manager.entry.app,null); assert.equal(searches,0,'启动核对不检索正式资料');
  await manager.close(); assert.equal((await fetch(base+'/health')).status,200);
});

test('不同配置及不同口令不复用已有服务，原服务保持运行',async t=>{
  const { config,base }=await fixture(t); const app=await createKnowledgeServer(config); await app.listen();
  const wrong=new ServiceManager({ ...config,knowledgeBases:[{ id:'other',name:'other' }] });
  t.after(async()=>{ await wrong.close(); await app.close(); });
  await assert.rejects(wrong.ensure(),/配置不同/); await wrong.close();
  const wrongToken=new ServiceManager({ ...config,serviceToken:'x'.repeat(64) }); t.after(()=>wrongToken.close());
  await assert.rejects(wrongToken.ensure(),/口令/);
  assert.equal((await fetch(base+'/health')).status,200);
});

test('端口占用或旧版服务有明确提示，冲突解除后可以重试启动',async t=>{
  const { config,base }=await fixture(t); let legacy=false;
  const other=http.createServer((_req,res)=>{ res.writeHead(200,{ 'content-type':'application/json' }); res.end(JSON.stringify(legacy ? { protocol:'tbea-knowledge/v1',version:'0.1.0' } : { name:'unrelated' })); });
  await new Promise(resolve=>other.listen(config.port,'127.0.0.1',resolve));
  const manager=new ServiceManager(config); t.after(async()=>{ await manager.close(); if(other.listening) await new Promise(resolve=>other.close(resolve)); });
  await assert.rejects(manager.ensure(),/其他程序占用/); assert.equal(other.listening,true);
  legacy=true; await assert.rejects(manager.ensure(),/旧版/);
  await new Promise(resolve=>other.close(resolve)); await manager.ensure();
  assert.equal((await fetch(base+'/health')).status,200); assert.equal(manager.snapshot().servicePhase,'ready');
});

test('关闭自动启动时保留手动模式，启动失败配置可以安全退出',async t=>{
  const { config }=await fixture(t); config.service={ autoStart:false };
  const manager=new ServiceManager(config); t.after(()=>manager.close());
  await assert.rejects(manager.ensure(),/自动启动已关闭/);
  const app=await createKnowledgeServer(config); await app.listen(); t.after(()=>app.close());
  await manager.ensure(); assert.equal(manager.snapshot().servicePhase,'ready');
});

test('启动中退出和热重载竞态不遗留服务，新实例可正常启动',async t=>{
  const { config,base }=await fixture(t); const first=new ServiceManager(config);
  const rejection=assert.rejects(first.ensure(),/正在退出/); const cleanup=first.close();
  const second=new ServiceManager(config); t.after(()=>second.close());
  await Promise.all([rejection,cleanup,second.ensure()]);
  assert.equal((await fetch(base+'/health')).status,200);
  await second.close(); assert.equal(await gone(base),true);
});

test('缓存目录不可写时报告可读错误，服务异常停止后下次调用前可恢复',async t=>{
  const { config,base,directory }=await fixture(t); const blocker=path.join(directory,'普通文件'); await fs.writeFile(blocker,'x');
  const bad=new ServiceManager({ ...config,dataDirectory:blocker }); t.after(()=>bad.close());
  await assert.rejects(bad.ensure(),/缓存/); await bad.close();
  const manager=new ServiceManager(config); t.after(()=>manager.close()); await manager.ensure();
  await manager.entry.app.close(); assert.equal(await gone(base),true);
  await manager.ensure(); assert.equal((await fetch(base+'/health')).status,200);
});

test('另一个 DSH 进程管理的服务不被接管，配置身份不受 JSON 属性顺序影响',async t=>{
  const { config }=await fixture(t);
  assert.equal(configIdentity(config),configIdentity(Object.fromEntries(Object.entries(config).reverse())));
  const remote=http.createServer((req,res)=>{
    res.writeHead(200,{ 'content-type':'application/json' });
    res.end(JSON.stringify(req.url==='/health' ? { name:'tbea-knowledge',protocol:'tbea-knowledge/v1',version:SERVICE_VERSION } :
      { schema:RUNTIME_PROTOCOL,configIdentity:configIdentity(config),owner:'dsh',pid:process.pid+100000 }));
  });
  await new Promise(resolve=>remote.listen(config.port,'127.0.0.1',resolve));
  const manager=new ServiceManager(config); t.after(async()=>{ await manager.close(); await new Promise(resolve=>remote.close(resolve)); });
  await assert.rejects(manager.ensure(),/另一个 DSH 进程/); assert.equal(remote.listening,true);
});

test('错误知识库及自动启动字段在启动前校验，避免模糊 TypeError',async t=>{
  const { config,file }=await fixture(t);
  await fs.writeFile(file,JSON.stringify({ ...config,knowledgeBases:[{ id:123,name:'错误' }] })); await assert.rejects(readConfig(file),/字符串/);
  await fs.writeFile(file,JSON.stringify({ ...config,service:{ autoStart:'true' } })); await assert.rejects(readConfig(file),/autoStart/);
  await fs.writeFile(file,JSON.stringify({ ...config,autoRetrieveKnowledge:'false' })); await assert.rejects(readConfig(file),/autoRetrieveKnowledge/);
  await fs.writeFile(file,'\uFEFF'+JSON.stringify(config)); assert.equal((await readConfig(file)).port,config.port,'兼容 Windows UTF-8 BOM 配置');
});

test('Host 进程直接退出也不会遗留独立 MCP 子进程或监听端口',{ timeout:8000 },async t=>{
  const { file,base,directory }=await fixture(t); const probe=path.join(directory,'host-exit.mjs');
  await fs.writeFile(probe,`import { pathToFileURL } from 'node:url';
const { apply }=await import(pathToFileURL(process.argv[2]).href);
let route;
await apply({ on(){},effect:fn=>fn(),tools:{ register(){} },connection:{ fetch:{ register:value=>{ route=value; } } } },{ configFile:process.argv[3] });
for(let i=0;i<100;i++) {
  const response=await route.fetch(new Request('http://localhost'+route.path,{
    method:'POST',headers:{ 'content-type':'application/json' },body:JSON.stringify({ endpoint:'selection',args:{ sessionId:'exit-test' } }),
  }));
  const result=await response.json();
  if(result.value?.servicePhase==='ready') { process.send({ ready:true }); break; }
  if(result.value?.servicePhase==='error') throw new Error(result.value.serviceMessage);
  await new Promise(resolve=>setTimeout(resolve,20));
}
process.on('message',()=>process.exit(0));
`);
  const child=spawn(process.execPath,[probe,fileURLToPath(new URL('../plugin/lib/index.js',import.meta.url)),file],{ windowsHide:true,stdio:['ignore','pipe','pipe','ipc'] });
  let errors=''; child.stderr.on('data',data=>{ errors+=data; });
  t.after(()=>{ if(child.exitCode===null) child.kill(); });
  await new Promise((resolve,reject)=>{
    child.once('message',message=>message.ready && resolve()); child.once('error',reject);
    child.once('exit',()=>reject(new Error(errors || 'Host 未完成自动启动即退出')));
  });
  assert.equal((await fetch(base+'/health')).status,200);
  const exited=new Promise(resolve=>child.once('exit',resolve)); child.send('exit'); await exited;
  await eventually(()=>gone(base));
});

test('已有 BOM 配置升级初始化不覆盖凭证及自动启动偏好',async t=>{
  const { config,directory }=await fixture(t);
  await fs.mkdir(path.join(directory,'config')); await fs.mkdir(path.join(directory,'plugin'));
  const filename=path.join(directory,'config/local.json'); const contents='\uFEFF'+JSON.stringify({ ...config,service:{ autoStart:false } });
  await fs.writeFile(filename,contents); await initialize(directory);
  assert.equal(await fs.readFile(filename,'utf8'),contents);
  assert.ok((await fs.readFile(path.join(directory,'plugin/cordis.patch.yml'),'utf8')).includes('configFile:'));
});

test('Desktop 首次并发初始化只发布一次完整配置，后续保留文件', async t => {
  const { directory } = await fixture(t);
  const packageRoot = path.join(directory, 'installed-plugin');
  const deployment = path.join(packageRoot, DESKTOP_DEPLOYMENT_CONFIG);
  const template = path.join(packageRoot, DESKTOP_CONFIG_TEMPLATE);
  const sources = [deployment, template];
  const locations = desktopConfigLocations(path.join(directory, 'actual Harness'), packageRoot);
  await fs.mkdir(path.dirname(template), { recursive: true });
  await assert.rejects(initializeDesktopConfig(locations, sources), /也找不到初始化来源/);
  await assert.rejects(fs.stat(locations.filename), { code: 'ENOENT' });

  const seed = JSON.parse(await fs.readFile(new URL('../config/example.json', import.meta.url), 'utf8'));
  delete seed.serviceToken;
  seed.documentPreview.enabled = false;
  seed.dataDirectory = '../data';
  await fs.writeFile(template, JSON.stringify(seed));
  await fs.writeFile(deployment, JSON.stringify({ ...seed, mode: 'live' }));
  await assert.rejects(initializeDesktopConfig(locations, sources), /正式模式缺少 accessKey/);
  await assert.rejects(fs.stat(locations.filename), { code: 'ENOENT' });

  await fs.rm(deployment);
  const results = await Promise.all(Array.from({ length: 8 }, () => initializeDesktopConfig(locations, sources)));
  const contents = await fs.readFile(locations.filename, 'utf8');
  const saved = JSON.parse(contents);
  assert.equal(results.filter(result => result.written).length, 1);
  assert.match(saved.serviceToken, /^[a-f0-9]{64}$/);
  assert.ok(results.every(result => result.config.serviceToken === saved.serviceToken));
  assert.equal(saved.dataDirectory, undefined);
  assert.deepEqual(await fs.readdir(path.dirname(locations.filename)), [path.basename(locations.filename)]);

  // 新安装包里的配置变化也不覆盖已有配置。
  await fs.writeFile(template, '{ invalid json');
  assert.equal((await initializeDesktopConfig(locations, sources)).written, false);
  assert.equal(await fs.readFile(locations.filename, 'utf8'), contents);
  await fs.writeFile(deployment, JSON.stringify({ ...seed, serviceToken: 'r'.repeat(64) }));
  const replaced = await initializeDesktopConfig(locations, sources, true);
  assert.equal(replaced.written, true);
  assert.equal(JSON.parse(await fs.readFile(locations.filename, 'utf8')).serviceToken, 'r'.repeat(64));
});

test('插件复制到 DSH profile 后仍可自动启动、检索并找到项目演示资源',async t=>{
  const { file,directory,base }=await fixture(t);
  const installed=path.join(directory,'profile/node_modules/dsh-plugin-tbea-knowledge');
  await fs.mkdir(path.join(installed,'lib'),{ recursive:true });
  await fs.copyFile(new URL('../plugin/lib/index.js',import.meta.url),path.join(installed,'lib/index.js'));
  await fs.writeFile(path.join(installed,'package.json'),'{"type":"module"}');
  const { apply:install }=await import(pathToFileURL(path.join(installed,'lib/index.js')).href);
  const plugin=await host(file,install); t.after(()=>plugin.close());
  assert.equal((await plugin.rpc('service-retry')).ok,true);
  assert.equal((await fetch(base+'/demo')).status,200);
  const value=await plugin.tools.get('mcp__tbea__search_knowledge').execute({ query:'设计要求' },{ signal:new AbortController().signal });
  assert.equal(value.model.hitCount,2); await plugin.close(); assert.equal(await gone(base),true);
});
