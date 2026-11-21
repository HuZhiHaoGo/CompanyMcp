import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createKnowledgeServer } from '../src/server.mjs';

const root = path.resolve(import.meta.dirname, '..');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-ui-'));
const config = JSON.parse(await fs.readFile(path.join(root, 'config/example.json'), 'utf8'));
config.port = 17869; config.serviceToken = 'u'.repeat(64); config.dataDirectory = directory;
const app = await createKnowledgeServer(config, { demoDirectory: path.join(root, 'dist/demo') });
let browser;
try {
  await app.listen();
  let executablePath = process.env.TBEA_TEST_BROWSER;
  if (!executablePath && process.platform === 'win32') {
    const cache = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
    for (const name of (await fs.readdir(cache).catch(() => [])).filter(n => /^chromium-\d+$/.test(n)).reverse()) {
      const candidate = path.join(cache, name, 'chrome-win', 'chrome.exe');
      if (await fs.stat(candidate).catch(() => false)) { executablePath = candidate; break; }
    }
  }
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
  for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport }); const errors = [];
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:17869' });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:17869/demo');
    await page.getByRole('button', { name: /参考来源/ }).click();
    await page.getByText('A*B*C', { exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.tbea-gallery img')].length > 0 && [...document.querySelectorAll('.tbea-gallery img')].every(img => img.complete && img.naturalWidth > 0));
    if (!await page.evaluate(() => [...document.querySelectorAll('.tbea-gallery img')].every(img => { const image = img.getBoundingClientRect(); const box = img.parentElement.getBoundingClientRect(); return image.top >= box.top && image.bottom <= box.bottom && image.right <= box.right; }))) throw new Error('Image escapes its preview container');
    await page.getByRole('button', { name: '切片详情', exact: true }).first().click();
    await page.getByText('demo-001', { exact: true }).waitFor();
    await page.getByRole('button', { name: '复制切片内容', exact: true }).first().click();
    if (!(await page.evaluate(() => navigator.clipboard.readText())).includes('A*B*C')) throw new Error('Copy did not preserve engineering table content');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`${name}: horizontal page overflow`);
    await page.screenshot({ path: path.join(root, `test-results/${name}.png`), fullPage: true });
    await page.getByRole('button', { name: '查看大图' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: '放大', exact: true }).click();
    await page.screenshot({ path: path.join(root, `test-results/${name}-image.png`) });
    await page.keyboard.press('Escape');
    if (await page.getByRole('dialog').count()) throw new Error('Image dialog did not close');
    await page.reload(); await page.getByRole('button', { name: /参考来源/ }).click();
    await page.getByText('A*B*C', { exact: true }).waitFor();
    if (errors.length) throw new Error(errors.join('\n'));
    await page.close(); console.log(`${name}: source expansion, table, image, details, zoom, Escape, reload OK`);
  }
} finally {
  await browser?.close(); await app.close();
  if (directory.startsWith(path.join(os.tmpdir(), 'tbea-ui-'))) await fs.rm(directory, { recursive: true, force: true });
}
