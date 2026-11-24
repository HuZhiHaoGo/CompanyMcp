import { createKnowledgeServer } from '../../src/server.ts';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { configIdentity,SERVICE_VERSION,RUNTIME_PROTOCOL } from '../../src/runtime.ts';

// 热重载及同进程多窗口共用监听实例，最后一个使用者释放后才关闭。
const registryKey = Symbol.for(`tbea-knowledge.services.${SERVICE_VERSION}`);
const registry = globalThis[registryKey] ||= new Map();
export class ServiceManager {
  constructor(config,options={}) {
    this.config=config; this.identity=configIdentity(config); this.token=Symbol('DSH owner');
    this.demoDirectory=options.demoDirectory || fileURLToPath(new URL('../../dist/demo/',import.meta.url));
    this.pdfAssetsDirectory = options.pdfAssetsDirectory;
    this.state={ servicePhase:'starting',serviceMessage:'正在启动公司知识服务…' }; this.closed=false;
  }
  snapshot() {
    return this.entry?.paused
      ? { servicePhase: 'stopped', serviceMessage: '公司知识服务已暂停，重新启动匠宝后恢复。' }
      : this.state;
  }
  async probe() {
    const base=`http://127.0.0.1:${this.config.port}`; let response;
    for(let attempt=0;attempt<2;attempt++) {
      try { response=await fetch(base+'/health',{ headers:{ Connection:'close' },signal:AbortSignal.timeout(1500),redirect:'error' }); break; }
      catch(error) {
        if(error.cause?.code==='ECONNREFUSED') return false;
        // 旧服务刚关闭时，连接池可能命中已失效的连接；仅重查一次只读健康接口。
        // 这里不重放任何用户检索，更不会重发模型请求或工作流。
        if(attempt===0 && ['ECONNRESET','EPIPE','UND_ERR_SOCKET'].includes(error.cause?.code)) continue;
        throw new Error('无法确认本机知识服务状态，请检查端口占用和本机网络权限');
      }
    }
    let health; try { health=await response.json(); } catch { throw new Error('知识服务端口被其他程序占用，请修改配置端口或关闭占用程序'); }
    if(!response.ok || health?.name!=='tbea-knowledge' || health?.protocol!=='tbea-knowledge/v1') {
      if(health?.protocol==='tbea-knowledge/v1') throw new Error('检测到旧版知识服务，请关闭原 Start-Service.ps1 窗口后重启 DSH');
      throw new Error('知识服务端口被其他程序占用，请修改配置端口或关闭占用程序');
    }
    if(health.version!==SERVICE_VERSION) throw new Error('检测到不同版本的知识服务，请关闭原服务并重新启动 DSH');
    let runtime;
    try { runtime=await fetch(base+'/runtime',{ headers:{ Authorization:`Bearer ${this.config.serviceToken}` },signal:AbortSignal.timeout(1500),redirect:'error' }); }
    catch { throw new Error('知识服务身份检查连接失败，请重试或重新启动原服务'); }
    if(runtime.status===401) throw new Error('该端口的知识服务口令与本配置不同，请检查配置或使用其他端口');
    if(!runtime.ok) throw new Error('知识服务身份检查失败，请关闭原服务后重启 DSH');
    let details; try { details=await runtime.json(); } catch { throw new Error('知识服务身份响应格式不正确，请关闭原服务后重试'); }
    if(details?.schema!==RUNTIME_PROTOCOL || details?.configIdentity!==this.identity) throw new Error('该端口运行的知识服务配置不同，请重启原服务或为不同配置设置不同端口');
    if(details.owner==='dsh' && details.pid!==process.pid) throw new Error('该端口由另一个 DSH 进程管理，请为独立实例设置不同端口');
    return true;
  }
  async boot(entry) {
    if(await this.probe()) return;
    if(this.config.service?.autoStart===false) throw new Error('自动启动已关闭，请先运行 Start-Service.ps1');
    let app;
    try { app=await createKnowledgeServer(this.config,{ managed:true,demoDirectory:this.demoDirectory, pdfAssetsDirectory:this.pdfAssetsDirectory, onPause: () => { entry.paused = true; },
      takeSemanticModel: id => {
        const model = entry.semanticModels.get(id);
        entry.semanticModels.delete(id);
        return model;
      },
    }); }
    catch { throw new Error('无法初始化知识缓存，请检查 dataDirectory 是否为可写目录'); }
    if(!entry.owners.size) { await app.close(); return; }
    try { await app.listen(); entry.app=app; }
    catch(error) {
      await app.close();
      // 独立进程同时启动时核对占用者；不杀进程、不自动改端口。
      if(error.code==='EADDRINUSE') {
        if(await this.probe()) return;
        throw new Error('知识服务端口已被占用，请检查配置');
      }
      throw new Error('公司知识服务启动失败，请检查端口权限和 data 目录写入权限');
    }
  }
  async withSemanticModel(model, call) {
    const entry = this.entry;
    if (!model || this.closed || !entry?.app || entry.paused) return call();
    const id = randomUUID();
    entry.semanticModels.set(id, model);
    try { return await call(id); }
    finally { entry.semanticModels.delete(id); }
  }
  async ensure() {
    if(this.closed) throw new Error('公司知识插件正在退出');
    try {
      let entry=registry.get(this.config.port);
      if(entry?.closing) { await entry.closing; return this.ensure(); }
      if(entry && entry.identity!==this.identity) throw new Error('同一端口不能同时启动不同配置的知识服务');
      if(!entry) { entry={ identity:this.identity,owners:new Set(),app:null,semanticModels:new Map() }; registry.set(this.config.port,entry); }
      entry.owners.add(this.token); this.entry=entry;
      if (entry.paused) throw new Error(this.snapshot().serviceMessage);
      if(!entry.app?.server.listening) {
        if(!entry.starting) {
          this.state={ servicePhase:'starting',serviceMessage:'正在启动公司知识服务…' };
          entry.starting=this.boot(entry).finally(()=>{ entry.starting=undefined; });
        }
        await entry.starting;
      }
      if(this.closed) throw new Error('公司知识插件正在退出');
      if (entry.paused) throw new Error(this.snapshot().serviceMessage);
      this.state={ servicePhase:'ready',serviceMessage:'公司知识服务已就绪' };
    } catch(error) {
      if (this.closed) throw new Error('公司知识插件正在退出');
      this.state={ servicePhase:'error',serviceMessage:error.message || '公司知识服务启动失败' }; throw error;
    }
  }
  async close() {
    if(this.closed) return this.closing;
    this.closed=true; const entry=this.entry;
    if(!entry) return;
    entry.owners.delete(this.token);
    if(entry.owners.size) return;
    entry.closing=(async()=>{
      try { await entry.starting?.catch(()=>{}); await entry.app?.close(); }
      finally { if(registry.get(this.config.port)===entry) registry.delete(this.config.port); }
    })();
    this.closing=entry.closing; await this.closing;
  }
}
