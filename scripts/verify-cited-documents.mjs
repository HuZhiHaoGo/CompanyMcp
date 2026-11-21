import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
const root = path.resolve(import.meta.dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.TBEA_TEST_BROWSER || (process.platform === 'win32' && existsSync(chrome) ? chrome : undefined);
const browser = await chromium.launch({ executablePath });
try {
  const page = await browser.newPage({ viewport: { width: 500, height: 700 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<base href="https://example.invalid/profile/"><div data-conversation-content data-conversation-session="session-1"><div id="app" style="height:540px;overflow:auto"></div></div>');
  for (const file of ['node_modules/react/umd/react.development.js','node_modules/react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: path.join(root, file) });
  await page.evaluate(() => {
    window.__ModuleLoader__ = { load: row => { window.plugin = row.factory(id => id === 'react' ? React : undefined); } };
  });
  await page.addScriptTag({ path: path.join(root, 'plugin/lib/client.js') });
  await page.evaluate(() => {
    const E = React.createElement;
    const event = (seq, type, data) => ({ type: 'event', event: { seq, type, data } });
    const view = snapshotId => ({ schema: 'tbea-view/v1', snapshotId });
    const manual = (seq, id) => event(seq, 'user/message', { source: { kind: 'tbea-knowledge-prefetch', view: view(id) } });
    const current = 'c0ffee00-current';
    const citationId = 'Kc0ffee00-1';
    const earlyEvents = [event(1, 'turn/start', { turn: 1 }), manual(2, 'earliest'), event(3, 'turn/end', { turn: 1 })];
    const lateEvents = [event(12, 'turn/start', { turn: 3 }),
      event(13, 'tool/call', { turn: 3, name: 'mcp__tbea__search_knowledge', callId: 'search' }),
      event(14, 'tool/result', { turn: 3, message: { source: { callId: 'search' } }, meta: view(current) }),
      event(15, 'assistant/message', { turn: 3, message: { content: [{ type: 'text', text: '[检修作业规范](Kc0ffee00-1)' }] } }),
      event(16, 'turn/end', { turn: 3 })];
    const deniedEvents = [event(5, 'turn/start', { turn: 2 }), manual(6, 'denied'), event(7, 'turn/end', { turn: 2 })];
    window.pages = 0;
    const listeners = new Set();
    let snapshot = { entries: lateEvents, hasMore: true };
    const eventSource = { getSnapshot: () => snapshot, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
    const session = {
      getSnapshot: () => ({ openState: 'open', loadingOlder: false }),
      async loadOlder() {
        await new Promise(resolve => setTimeout(resolve, 30));
        window.pages++;
        const start = window.pages === 1 ? deniedEvents : earlyEvents;
        snapshot = { entries: [...start, ...snapshot.entries], hasMore: window.pages < 2 };
        for (const fn of listeners) fn();
      }
    };
    const citation = (documentId, documentName) => ({ citationId: 'c-' + documentId, knowledgeBaseId: 'kb-a', knowledgeBaseName: '工程资料', documentId, documentName });
    const common = { ...citation('same', '检修作业规范.pdf'), citationId };
    const earliest = citation('old', '首轮现场记录.pdf');
    window.requests = [];
    window.fetch = async (_url, options) => {
      const { endpoint, args } = JSON.parse(options.body);
      window.requests.push({ endpoint, args });
      if (endpoint === 'selection') return Response.json({ ok: true, value: { selected: false } });
      if (endpoint === 'snapshot') {
        if (args.snapshotId === 'denied') return Response.json({ ok: false, error: { message: '权限已变更' } });
        return Response.json({ ok: true, value: { citations: args.snapshotId === 'earliest' ? [common, earliest] : [common] } });
      }
      if (endpoint === 'library-open') return Response.json({ ok: true, value: { previewId: 'preview', pages: 1 } });
      if (endpoint === 'library-page') {
        const image = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lSkAAAAASUVORK5CYII='), x => x.charCodeAt(0));
        return new Response(image, { headers: { 'content-type': 'image/png' } });
      }
      throw new Error(endpoint);
    };
    let entry, dock;
    plugin.apply({
      effect: callback => callback(),
      commandUi: { register() {} },
      uiConversation: { events: { register() {} } },
      sessions: { binding: sessionId => ({ sessionId, session, eventSource }) },
      slots: { inject: (_name, callback) => callback(), register(spec, component) {
        if (spec.name === 'conversation.view') entry = { spec, component };
        if (spec.name === 'conversation.input.dock') dock = { spec, component };
      } }
    });
    const injected = entry.spec.inject('session-1');
    const dockProps = dock.spec.inject('session-1');
    function App() {
      const [chat, setChat] = React.useState(false);
      const content = chat
        ? E('div', null, ...[1, 2, 3].map(turn => E('div', { key: turn, style: { height: '640px' }, 'data-chat-turn': turn,
          'data-chat-anchor-key': 'turn-' + turn, 'data-chat-flow-kind': 'input-message' }, '问题 ' + turn,
        E('div', { 'data-chat-turn': turn, 'data-chat-flow-kind': 'assistant' },
          E('button', { title: citationId, onClick() { window.nativeFileOpened = true; } }, turn === 3 ? '正文链接' : '跨轮链接 ' + turn)))))
        : E(entry.component, { ...injected, openView(id, focus) { window.jump = [id, focus]; setChat(true); } });
      return E(React.Fragment, null,
        E('div', { 'data-slot': 'conversation.session' }, E('div', { 'data-slot': 'conversation.view' }, content)),
        E('div', { 'data-composer-seat': '' }, E(dock.component, dockProps)));
    }
    ReactDOM.createRoot(document.getElementById('app')).render(E(App));
  });
  const common = page.getByRole('button', { name: '检修作业规范.pdf' });
  await page.getByRole('button', { name: '首轮现场记录.pdf' }).waitFor();
  assert.equal(await common.count(), 1);
  await page.getByText('引用于 2 轮').waitFor();
  await page.getByText('正文已引用').waitFor();
  await page.getByText('部分参考来源暂时无法读取。').waitFor();
  await common.click();
  await page.waitForFunction(() => document.querySelector('.tbea-library-sheet img')?.naturalWidth === 1);
  assert.deepEqual(await page.evaluate(() => requests.find(row => row.endpoint === 'library-open').args), { libraryId: 'kb-a', documentId: 'same' });
  await page.getByRole('button', { name: '返回引用文档' }).click();
  const row = page.locator('.tbea-cited-row', { has: common });
  await row.getByText('查看引用', { exact: true }).click();
  await row.getByRole('button', { name: '第 3 轮' }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-chat-turn') === '3' && document.activeElement.getBoundingClientRect().top < 25);
  assert.deepEqual(await page.evaluate(() => window.jump), ['chat', 'turn:3']);
  await page.getByRole('button', { name: '正文链接' }).click();
  const dialog = page.getByRole('dialog', { name: '知识库引用原文' });
  await dialog.getByRole('heading', { name: '检修作业规范.pdf' }).waitFor();
  await page.waitForFunction(() => document.querySelector('dialog .tbea-library-sheet img')?.naturalWidth === 1);
  await dialog.getByRole('button', { name: '关闭引用预览' }).click();
  await page.getByRole('button', { name: '跨轮链接 1' }).click();
  await dialog.getByRole('alert').getByText('对应轮次没有可打开的知识库引用。').waitFor();
  assert.equal(await page.evaluate(() => window.nativeFileOpened), undefined);
  assert.equal(await page.evaluate(() => window.pages), 2);
  assert.deepEqual(errors, []);
  console.log('Chrome 验证通过：翻阅两页旧历史、同文档去重、权限错误后继续显示、原文 PNG 预览、按轮次跳转。');
} finally { await browser.close(); }
