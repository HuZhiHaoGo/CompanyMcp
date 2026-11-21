interface SharedEntry<T> {
  controller: AbortController;
  users: number;
  settled: boolean;
  promise: Promise<T>;
}

/** 相同图片或切片请求只执行一次；一个窗口取消时，不影响仍在等待的其他窗口。 */
export class SharedTasks<T> {
  private entries = new Map<string, SharedEntry<T>>();

  run(key: string, signal: AbortSignal | undefined, task: (signal: AbortSignal) => T | Promise<T>): Promise<T> {
    signal?.throwIfAborted();
    let entry=this.entries.get(key);
    if(!entry) {
      const controller = new AbortController();
      const promise = Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return task(controller.signal);
      }).finally(() => {
        created.settled = true;
        if (this.entries.get(key) === created) this.entries.delete(key);
      });
      const created = { controller, users: 0, settled: false, promise };
      this.entries.set(key, created);
      entry = created;
    }
    const shared = entry;
    shared.users++;
    return new Promise((resolve,reject)=>{
      let finished=false;
      const settle = (callback: () => void) => {
        if(finished) return; finished=true; signal?.removeEventListener('abort',aborted); shared.users--;
        if(!shared.users && !shared.settled) {
          if(this.entries.get(key)===shared) this.entries.delete(key);
          shared.controller.abort();
        }
        callback();
      };
      const aborted=()=>settle(() => reject(signal?.reason));
      signal?.addEventListener('abort',aborted,{ once:true });
      void shared.promise.then(value => settle(() => resolve(value)), error => settle(() => reject(error)));
    });
  }
}
