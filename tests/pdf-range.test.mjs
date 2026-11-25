import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate, setTimeout } from 'node:timers/promises';
import { createPdfRangeReader } from '../plugin/src/pdf-range.ts';

const busy = () => Object.assign(new Error('等待检索的请求过多，请稍后重试'), { code: 'SERVICE_BUSY' });

test('PDF 并行预览各自限制分块并发，合并跨块的字节区间', async () => {
  const sample = Buffer.alloc(4826681).map((_, index) => index % 251);
  const ranges = Array.from({ length: 26 }, (_, index) => [index * 65536, (index + 1) * 65536]);
  ranges.push([2 * 1024 * 1024, sample.length]);
  const active = new Map(), peak = new Map();
  const bridge = async (action, { previewId, begin, end }) => {
    assert.equal(action, 'library-pdf-range');
    assert.ok(end - begin <= 1024 * 1024);
    active.set(previewId, (active.get(previewId) ?? 0) + 1);
    peak.set(previewId, Math.max(peak.get(previewId) ?? 0, active.get(previewId)));
    await setImmediate();
    active.set(previewId, active.get(previewId) - 1);
    return { bytes: sample.subarray(begin, end) };
  };
  await Promise.all(['first', 'second'].map(id => new Promise((resolve, reject) => {
    const expected = new Map(ranges);
    const read = createPdfRangeReader(bridge, id, new AbortController().signal, (begin, data) => {
      const end = expected.get(begin);
      assert.ok(end !== undefined);
      assert.deepEqual(Buffer.from(data), sample.subarray(begin, end));
      expected.delete(begin);
      if (!expected.size) resolve();
    }, reject);
    for (const [begin, end] of ranges) read(begin, end);
  })));
  assert.deepEqual([...peak.values()], [2, 2]);
});

test('PDF 分块仅重试临时繁忙，至多重试两次并保留失败区间', async () => {
  for (const [failures, makeError, expectedCode, expectedAttempts] of [
    [2, busy, undefined, 3],
    [3, busy, 'SERVICE_BUSY', 3],
    [1, () => Object.assign(new Error('expired'), { code: 'PREVIEW_NOT_FOUND' }), 'PREVIEW_NOT_FOUND', 1],
  ]) {
    let attempts = 0;
    const outcome = await new Promise(resolve => {
      const read = createPdfRangeReader(async () => {
        if (++attempts <= failures) throw makeError();
        return { bytes: Uint8Array.of(5, 6) };
      }, 'preview', new AbortController().signal, (_begin, data) => resolve(data), resolve);
      read(5, 7);
    });
    assert.equal(attempts, expectedAttempts);
    if (expectedCode) {
      assert.ok(outcome instanceof Error);
      assert.deepEqual([outcome.code, outcome.begin, outcome.end, outcome.retries], [expectedCode, 5, 7, expectedAttempts - 1]);
      if (expectedCode === 'SERVICE_BUSY') assert.match(outcome.message, /PDF 读取繁忙/);
    } else {
      assert.deepEqual(outcome, Uint8Array.of(5, 6));
    }
  }
});

test('取消 PDF 预览清理排队读取、进行中的请求和待重试计时器', async () => {
  const controller = new AbortController();
  const started = [];
  let canceled = false;
  const read = createPdfRangeReader(async (_action, { begin }, signal) => {
    started.push(begin);
    if (begin === 0) throw busy();
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => {
      canceled = true;
      reject(signal.reason);
    }, { once: true }));
  }, 'preview', controller.signal, () => assert.fail('Canceled preview delivered data'), () => assert.fail('Canceled preview reported an error'));
  read(0, 1);
  read(1, 2);
  read(2, 3);
  await setImmediate();
  controller.abort();
  read(3, 4);
  await setTimeout(320);
  assert.equal(canceled, true);
  assert.deepEqual(started, [0, 1]);
});
