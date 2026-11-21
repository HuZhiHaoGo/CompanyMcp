import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedTasks } from '../src/shared-tasks.ts';

test('共享图片/切片任务去重，一个窗口取消不影响其他窗口',async()=>{
  const tasks=new SharedTasks(); const a=new AbortController(); const b=new AbortController(); let release; let upstream; let calls=0;
  const work=signal=>{ calls++; upstream=signal; return new Promise(resolve=>{ release=resolve; }); };
  const first=tasks.run('image',a.signal,work); const second=tasks.run('image',b.signal,work);
  await new Promise(resolve=>setImmediate(resolve)); assert.equal(calls,1);
  const rejection=assert.rejects(first,/abort/i); a.abort(); await rejection; assert.equal(upstream.aborted,false);
  release('bytes'); assert.equal(await second,'bytes'); assert.equal(tasks.entries.size,0);
});
test('所有窗口取消才中断共享上游，随后重试不复用已取消任务',async()=>{
  const tasks=new SharedTasks(); const controller=new AbortController(); let aborted=false;
  const request=tasks.run('chunk',controller.signal,signal=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{ aborted=true; reject(signal.reason); },{ once:true })));
  await new Promise(resolve=>setImmediate(resolve));
  const rejection=assert.rejects(request,/abort/i); controller.abort(); await rejection; assert.equal(aborted,true);
  assert.equal(await tasks.run('chunk',undefined,async()=>42),42);
});
