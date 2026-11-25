import { chromium } from 'playwright';
import { samplePreviewPdf } from '../src/pdf-preview.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createKnowledgeServer } from '../src/server.ts';
import { spreadsheetFixture } from '../tests/spreadsheet-fixture.mjs';

const root = path.resolve(import.meta.dirname, '..');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-ui-'));
const config = JSON.parse(await fs.readFile(path.join(root, 'config/example.json'), 'utf8'));
config.port = 17869; config.serviceToken = 'u'.repeat(64); config.dataDirectory = directory;
config.documentPreview = { enabled: true, allowPdfViewer: true, converters: {} };
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
  const cases = [
    ['desktop', { width:1280, height:900 }, false, 14],
    ['mobile', { width:390, height:844 }, false, 14],
    ['desktop-dark', { width:1280, height:900 }, true, 14],
    ['mobile-dark', { width:390, height:844 }, true, 14],
    ['compact-large-font', { width:320, height:700 }, true, 22],
  ];
  for (const [name, viewport, dark, fontSize] of cases) {
    // 故意让系统偏好与界面相反，确认插件服从 DSH 手动主题而非 prefers-color-scheme。
    const page = await browser.newPage({ viewport, colorScheme:dark ? 'light' : 'dark' }); const errors = [];
    await page.addInitScript(({ dark, fontSize }) => {
      localStorage.setItem('tbea-demo-theme', dark ? 'dark' : 'light');
      document.addEventListener('DOMContentLoaded', () => document.body.style.setProperty('--dsh-content-font-size', fontSize + 'px'));
    }, { dark, fontSize });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:17869' });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:17869/demo');
    await page.getByRole('button', { name: '添加来源', exact: true }).click();
    await page.getByRole('button', { name: '公司知识库', exact: true }).click();
    await page.getByRole('button', { name: '取消公司知识库', exact: true }).waitFor();
    await page.reload(); await page.getByRole('button', { name: '取消公司知识库', exact: true }).waitFor();
    await page.getByRole('button', { name: '取消公司知识库', exact: true }).click();
    await page.getByRole('button', { name: '取消公司知识库', exact: true }).waitFor({ state: 'detached' });
    const input = page.getByRole('textbox', { name: '演示问题输入框' });
    await input.fill('设计要求 @');
    if (await page.getByRole('button', { name: '公司知识库', exact: true }).count()) throw new Error('@ opened the knowledge menu');
    await input.fill('/');
    await page.getByRole('button', { name: '公司知识库', exact: true }).click();
    await page.getByRole('button', { name: '取消公司知识库', exact: true }).waitFor();
    if (await input.inputValue() !== '') throw new Error('Slash selection left command text in the question');
    await page.getByRole('button', { name: '取消公司知识库', exact: true }).click();
    await page.getByRole('button', { name: '取消公司知识库', exact: true }).waitFor({ state: 'detached' });
    await input.fill('/公司');
    await page.getByRole('button', { name: '公司知识库', exact: true }).waitFor();
    await input.fill('/公司知识库');
    await input.press('Enter');
    await page.getByRole('button', { name: '取消公司知识库', exact: true }).waitFor();
    if (await input.inputValue() !== '') throw new Error('Chinese slash command left text in the question');
    await page.getByRole('button', { name: /参考来源/ }).waitFor();
    await page.screenshot({ path: path.join(root, `test-results/${name}-selection.png`), fullPage: true });
    await page.getByRole('button', { name: /参考来源/ }).click();
    await page.getByText('A*B*C', { exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.tbea-gallery img')].length > 0 && [...document.querySelectorAll('.tbea-gallery img')].every(img => img.complete && img.naturalWidth > 0));
    if (!await page.evaluate(() => [...document.querySelectorAll('.tbea-gallery img')].every(img => { const image = img.getBoundingClientRect(); const box = img.parentElement.getBoundingClientRect(); return image.top >= box.top && image.bottom <= box.bottom && image.right <= box.right; }))) throw new Error('Image escapes its preview container');
    await page.getByRole('button', { name: '切片详情', exact: true }).first().click();
    await page.getByText('demo-001', { exact: true }).waitFor();
    const geometry = await page.evaluate(() => {
      const icons = [...document.querySelectorAll('.tbea-icon')];
      return { chip:document.querySelector('.tbea-selection-chip').getBoundingClientRect().height,
        buttons:icons.map(button => { const rect = button.getBoundingClientRect(); return [rect.width,rect.height]; }),
        glyphs:icons.map(button => { const rect = button.querySelector('svg').getBoundingClientRect(); return [rect.width,rect.height]; }),
        color:getComputedStyle(document.querySelector('.tbea-content')).color,
        expected:getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-primary').trim(),
        font:parseFloat(getComputedStyle(document.querySelector('.tbea-content')).fontSize),
      };
    });
    if (geometry.chip !== 28 || geometry.buttons.some(([w,h]) => w !== 28 || h !== 28) || geometry.glyphs.some(([w,h]) => w !== 16 || h !== 16)) throw new Error(name + ': inconsistent compact control geometry');
    const expectedColor = dark ? 'rgb(249, 250, 251)' : 'rgb(15, 17, 21)';
    if (geometry.color !== expectedColor || geometry.font !== fontSize) throw new Error(name + ': DSH theme/font variables were not inherited');
    await page.getByRole('button', { name: '复制切片内容', exact: true }).first().click();
    if (!(await page.evaluate(() => navigator.clipboard.readText())).includes('A*B*C')) throw new Error('Copy did not preserve engineering table content');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`${name}: horizontal page overflow`);
    await page.screenshot({ path: path.join(root, `test-results/${name}.png`), fullPage: true });
    await page.getByRole('button', { name: '查看大图' }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(() => { const img = document.querySelector('.tbea-modal-image img'); return img?.complete && getComputedStyle(img).visibility === 'visible'; });
    if (!await page.evaluate(() => {
      const dialog = document.querySelector('dialog').getBoundingClientRect(); const image = document.querySelector('.tbea-modal-image img').getBoundingClientRect();
      const toolbar = document.querySelector('.tbea-modal-tools').getBoundingClientRect();
      return image.top >= dialog.top && image.bottom <= dialog.bottom + 1 && image.right <= dialog.right + 1 && toolbar.left >= dialog.left && toolbar.right <= dialog.right;
    })) throw new Error(name + ': fitted image or toolbar escapes dialog');
    for (const key of ['Tab','Shift+Tab']) {
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press(key);
        if (!await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement))) throw new Error('Dialog focus escaped');
      }
    }
    await page.getByRole('button', { name: '放大', exact: true }).click();
    await page.screenshot({ path: path.join(root, `test-results/${name}-image.png`) });
    await page.keyboard.press('Escape');
    if (await page.getByRole('dialog').count()) throw new Error('Image dialog did not close');
    if (!await page.evaluate(() => document.activeElement.classList.contains('tbea-image-button'))) throw new Error('Dialog did not restore opener focus');
    // 宿主自定义强调色也应立即生效，不需要重建组件。
    await page.evaluate(() => document.body.style.setProperty('--dsw-alias-state-business-primary', 'rgb(160, 90, 210)'));
    if (await page.locator('.tbea-selection-chip').evaluate(node => getComputedStyle(node).color) !== 'rgb(160, 90, 210)') throw new Error('Custom host accent not inherited');
    await page.reload(); await page.getByRole('button', { name: /参考来源/ }).click();
    await page.getByText('A*B*C', { exact: true }).waitFor();
    if (errors.length) throw new Error(errors.join('\n'));
    await page.close(); console.log(`${name}: DSH theme/font, 28px controls/16px icons, selection, references, table, image fit/zoom, keyboard focus and reload OK`);
  }
  const edge = await browser.newPage({ viewport:{ width:320,height:700 } }); const edgeErrors = [];
  edge.on('pageerror', error => edgeErrors.push(error.message));
  await edge.route('**/demo/result', async route => {
    const response = await route.fetch(); const data = await response.json();
    data.citations[0].documentName = '超长文档标题与设计标准名称'.repeat(8);
    data.citations[0].content = '第一行\n第二行\n第三行\n第四行\n第五行\n第六行\n第七行';
    data.coverage = { completed: 6, requested: 7 };
    data.citations[0].equivalentSources = [{ ...data.citations[0], citationId: 'alternate-demo', documentName: '另一个授权来源', equivalentSources: [], images: [] }];
    await route.fulfill({ json:data });
  });
  let failImage = true;
  await edge.route('**/demo/asset?**', route => failImage ? route.fulfill({ status:503, body:'unavailable' }) : route.continue());
  await edge.goto('http://127.0.0.1:17869/demo');
  await edge.getByText('已查 6/7 库', { exact:true }).waitFor();
  await edge.getByRole('button', { name:/参考来源/ }).click();
  await edge.getByRole('button', { name:'展开文字',exact:true }).click();
  if (await edge.getByRole('button', { name:'收起文字',exact:true }).getAttribute('aria-expanded') !== 'true') throw new Error('Short multiline content could not expand');
  await edge.getByRole('button', { name:'重试图片',exact:true }).waitFor();
  await edge.screenshot({ path:path.join(root,'test-results/narrow-error-long-title.png'),fullPage:true });
  failImage = false; await edge.getByRole('button', { name:'重试图片',exact:true }).click();
  await edge.waitForFunction(() => [...document.querySelectorAll('.tbea-gallery img')].some(img => img.complete && img.naturalWidth > 0));
  const alternate = edge.getByText('另一个授权来源', { exact:true });
  if (await alternate.count()) throw new Error('Equivalent source mounted before expanding');
  await edge.getByText('其他来源（1）', { exact:true }).click();
  await alternate.waitFor();
  await edge.locator('.tbea-related-sources').getByRole('button', { name:'切片详情',exact:true }).click();
  await edge.locator('.tbea-related-sources').getByText('demo-001', { exact:true }).waitFor();
  if (await edge.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Long document title causes horizontal overflow');
  await edge.unroute('**/demo/result');
  await edge.route('**/demo/result', route => route.fulfill({ json:{ id:'empty-demo',mode:'mock',query:'无结果',citations:[] } }));
  await edge.reload(); await edge.getByRole('button', { name:/参考来源/ }).click();
  await edge.getByText('未检索到相关依据，请补充产品、地区或标准版本等条件。').waitFor();
  await edge.unroute('**/demo/result');
  await edge.route('**/demo/result', route => route.fulfill({ json:{ id:'partial-demo', mode:'mock', query:'部分库异常', coverage:{ completed:1, requested:7 }, citations:[] } }));
  await edge.reload(); await edge.getByRole('button', { name:/参考来源/ }).click();
  await edge.getByText('本次检索范围不完整，已检索的知识库中未找到相关依据，可重新发送问题。').waitFor();
  if (edgeErrors.length) throw new Error(edgeErrors.join('\n'));
  await edge.close(); console.log('Edge cases: long title, expansion, image retry, grouped sources and partial/empty results OK');
  for (const [name, viewport] of [['catalog-desktop', { width: 1240, height: 840 }], ['catalog-narrow', { width: 390, height: 840 }]]) {
    const page = await browser.newPage({ viewport });
    const pdf = samplePreviewPdf(40);
    const pageErrors = [];
    const rangeAttempts = new Map();
    let rangeMode = name === 'catalog-desktop' ? 'recover' : 'normal';
    let recoveryRange;
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/demo/library/open?**', route => route.fulfill({ json: { previewId: 'test', pdfBytes: pdf.length } }));
    await page.route('**/demo/library/pdf-range?**', route => {
      const args = new URL(route.request().url()).searchParams;
      const begin = Number(args.get('begin')), end = Number(args.get('end'));
      const range = `${begin}:${end}`;
      const attempts = (rangeAttempts.get(range) ?? 0) + 1;
      rangeAttempts.set(range, attempts);
      if (rangeMode === 'recover') recoveryRange ??= range;
      if (rangeMode === 'busy' || (rangeMode === 'recover' && range === recoveryRange && attempts <= 2)) {
        return route.fulfill({ status: 400, json: { code: 'SERVICE_BUSY', message: '等待检索的请求过多，请稍后重试' } });
      }
      return route.fulfill({ body: pdf.subarray(begin, end), contentType: 'application/octet-stream' });
    });
    await page.goto('http://127.0.0.1:17869/demo?library');
    const libraryPicker = page.getByRole('combobox', { name: '知识库', exact: true });
    if (await page.evaluate(() => CSS.supports('appearance: base-select') && CSS.supports('selector(select::picker(select))'))) {
      await libraryPicker.press('Space');
      const openPicker = page.locator('select:open');
      await openPicker.waitFor();
      const matchesTrigger = await libraryPicker.evaluate(element => {
        const menu = getComputedStyle(element, '::picker(select)');
        return parseFloat(menu.borderRadius) > 0 && Math.abs(parseFloat(menu.width) - element.getBoundingClientRect().width) <= 1;
      });
      if (!matchesTrigger) throw new Error(`${name}: knowledge-base menu must be rounded and match the trigger width`);
      await page.keyboard.press('Escape');
      await openPicker.waitFor({ state: 'detached' });
    }
    const search = page.getByRole('searchbox', { name: '搜索文档名称' });
    await search.fill('.pdf');
    await page.getByText('找到 1 份文档').waitFor();
    await page.getByRole('button', { name: /预览演示\.pdf/ }).click();
    await page.getByRole('img', { name: '原文第 1 页', exact: true }).waitFor();
    if (rangeMode === 'recover' && rangeAttempts.get(recoveryRange) !== 3) throw new Error('PDF preview did not recover after two busy responses');
    if (await page.getByRole('img', { name: '原文第 40 页', exact: true }).count()) throw new Error(`${name}: rendered a distant page before scroll`);
    await page.screenshot({ path: path.join(root, `test-results/${name}.png`) });
    await page.getByText('第 40 页', { exact: true }).scrollIntoViewIfNeeded();
    await page.getByRole('img', { name: '原文第 40 页', exact: true }).waitFor();
    if (await page.getByRole('link', { name: /下载/ }).count()) throw new Error(`${name}: shows a download link`);
    await page.getByRole('button', { name: '返回文档目录' }).click();
    await search.waitFor();
    if (name === 'catalog-desktop') {
      rangeMode = 'busy';
      rangeAttempts.clear();
      const failureReport = page.waitForRequest(request => request.url().includes('/demo/library/preview-result?')
        && new URL(request.url()).searchParams.has('pdfFailure'));
      await page.getByRole('button', { name: /预览演示\.pdf/ }).click();
      await page.getByRole('alert').filter({ hasText: 'PDF 读取繁忙，请稍后重试。' }).waitFor();
      const diagnostic = JSON.parse(new URL((await failureReport).url()).searchParams.get('pdfFailure'));
      if (diagnostic.phase !== 'range' || diagnostic.errorCode !== 'SERVICE_BUSY' || diagnostic.retries !== 2
        || rangeAttempts.get(`${diagnostic.begin}:${diagnostic.end}`) !== 3) throw new Error('PDF busy failure report is missing its range or retry count');
      rangeMode = 'normal';
      await page.getByRole('button', { name: '重试', exact: true }).click();
      await page.getByRole('img', { name: '原文第 1 页', exact: true }).waitFor();
      await page.getByRole('button', { name: '返回文档目录' }).click();
      console.log('PDF busy responses, failure diagnostics and manual retry OK');
    }
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`${name}: horizontal overflow`);
    if (pageErrors.length) throw new Error(pageErrors.join('\n'));
    await page.close();
    console.log(`${name}: document filter, continuous preview, lazy page loading and return OK`);
  }
  const sheetPage = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const sheets = { xls: spreadsheetFixture('biff8'), xlsx: spreadsheetFixture('xlsx') };
  const sheetDocuments = Object.keys(sheets).map(format => ({ id: format, name: '工作簿.' + format, format, preview: 'available' }));
  let currentFormat = 'xlsx';
  let invalidSheet = false;
  const sheetResult = sheetPage.waitForRequest(request => request.url().includes('/demo/library/preview-result?') && request.url().includes('parseMs='));
  await sheetPage.route('**/demo/library/documents?**', route => route.fulfill({ json: { documents: sheetDocuments, total: 2, complete: true } }));
  await sheetPage.route('**/demo/library/open?**', route => {
    currentFormat = new URL(route.request().url()).searchParams.get('documentId');
    return route.fulfill({ json: { previewId: currentFormat, sheetBytes: sheets[currentFormat].length, sheetFormat: currentFormat } });
  });
  await sheetPage.route('**/demo/library/sheet-range?**', route => {
    const { searchParams } = new URL(route.request().url());
    const content = invalidSheet ? Buffer.alloc(sheets[currentFormat].length) : sheets[currentFormat];
    return route.fulfill({ body: content.subarray(Number(searchParams.get('begin')), Number(searchParams.get('end'))), contentType: 'application/octet-stream' });
  });
  await sheetPage.goto('http://127.0.0.1:17869/demo?library');
  for (const format of ['xls', 'xlsx']) {
    await sheetPage.getByRole('button', { name: new RegExp('工作簿\\.' + format + ' ·|工作簿\\.' + format + '\\s') }).click();
    await sheetPage.getByRole('table', { name: '数据', exact: true }).waitFor();
    if (await sheetPage.getByRole('cell', { name: '测试表头' }).getAttribute('colspan') !== '2') throw new Error('Merged Excel cell is missing');
    for (const value of ['中文单元格', '1,234.50', '2025-06-18', '2,469.00']) await sheetPage.getByRole('cell', { name: value, exact: true }).waitFor();
    await sheetPage.getByRole('button', { name: '下一组' }).click();
    await sheetPage.getByRole('cell', { name: '次页行', exact: true }).waitFor();
    await sheetPage.getByRole('combobox', { name: '工作表' }).selectOption({ label: '汇总' });
    await sheetPage.getByRole('cell', { name: '第二张工作表' }).waitFor();
    await sheetPage.getByRole('button', { name: '返回文档目录' }).click();
  }
  await sheetResult;
  invalidSheet = true;
  await sheetPage.getByRole('button', { name: /工作簿\.xlsx/ }).click();
  await sheetPage.getByRole('alert').getByText('Excel 文件损坏或格式不受支持，无法预览。').waitFor();
  await sheetPage.close();
  console.log('Excel: XLS, XLSX, first-sheet log, sheet selection, number/date, merged cells, row groups and errors OK');
  const dual = await browser.newPage();
  const base = 'http://127.0.0.1:17869';
  let openedDocuments = 0;
  const outside = [];
  await dual.route('**/*', route => {
    if (new URL(route.request().url()).origin === base) return route.continue();
    outside.push(route.request().url());
    return route.abort();
  });
  let finishConversion;
  const conversion = new Promise(resolve => { finishConversion = resolve; });
  let progress = { phase: 'downloading', elapsedMs: 100, received: 25, total: 100 };
  await dual.route('**/demo/library/open?**', async route => {
    openedDocuments++;
    if (new URL(route.request().url()).searchParams.get('documentId') === 'sample-docx') await conversion;
    await route.continue();
  });
  await dual.route('**/demo/library/preview-progress?**', route => route.fulfill({ json: progress }));
  await dual.goto(`${base}/demo?library`);
  await dual.getByRole('button', { name: /预览演示\.docx/ }).click();
  await dual.getByText('25%', { exact: true }).waitFor();
  progress = { phase: 'converting', elapsedMs: 2100 };
  await dual.getByRole('progressbar', { name: '正在转换文档…' }).waitFor();
  await dual.getByText('已用 2 秒', { exact: true }).waitFor();
  finishConversion();
  await dual.waitForFunction(() => {
    const canvas = document.querySelector('.tbea-library-pdf-page');
    if (!canvas) return false;
    const [red, green, blue, alpha] = canvas.getContext('2d').getImageData(Math.round(canvas.width * 0.2), Math.round(canvas.height * 0.145), 1, 1).data;
    return alpha === 255 && blue > green && green > red;
  });
  await dual.getByRole('button', { name: '返回文档目录' }).click();
  await dual.getByRole('button', { name: /预览演示\.md/ }).click();
  await dual.getByLabel('文本原文预览').getByRole('heading', { name: '原文预览演示' }).waitFor();
  if (openedDocuments !== 2 || outside.length) throw new Error('Preview re-opened a document or requested external resources');
  await dual.close();
  console.log('PDF.js, measured download progress, conversion indicator and direct Markdown preview passed');

} finally {
  await browser?.close(); await app.close();
  if (directory.startsWith(path.join(os.tmpdir(), 'tbea-ui-'))) await fs.rm(directory, { recursive: true, force: true });
}
