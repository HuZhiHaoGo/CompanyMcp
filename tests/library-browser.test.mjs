import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { listDocuments, originalAddress } from '../src/documents.ts';
import { previewStatus, downloadDocument, preparePreviewDocument } from '../src/document-renderer.ts';
import { mockImage } from '../src/mock.ts';
import { staticHtml, webDocument } from '../src/preview-content.ts';
import { createKnowledgeServer } from '../src/server.ts';
import { samplePreviewPdf } from '../src/pdf-preview.ts';
import { LibraryBrowser } from '../src/library-browser.ts';
import { readSpreadsheet, spreadsheetFailure } from '../plugin/src/spreadsheet-worker.ts';
import { spreadsheetFixture } from './spreadsheet-fixture.mjs';

const example = JSON.parse(await fs.readFile(new URL('../config/example.json', import.meta.url), 'utf8'));
const signed = 'https://ai.tbea.com/file?X-Amz-Signature=fixture-private';
const records = (start, size) => Array.from({ length: size }, (_, i) => ({ id: `id${i + start}`, name: `文档${i + start}.PDF`, download_url: signed }));
const signal = AbortSignal.timeout(100000);

test('超过 100 份文档时提交原样游标，循环或过早结束会标记目录未取全', async () => {
  const pages = [];
  const all = await listDocuments(example, 'library', signal, async (url, req) => {
    assert.equal(url.searchParams.get('Action'), 'DescribeDocuments');
    const body = JSON.parse(req.body); pages.push(body);
    return Response.json(body.marker ? { totalCount: 130, isTruncated: false, data: records(100, 30) }
      : { totalCount: 130, isTruncated: true, nextMarker: 'next+/=', data: records(0, 100) });
  });
  assert.deepEqual(pages, [{ knowledgeBaseId: 'library', maxKeys: 100 }, { knowledgeBaseId: 'library', maxKeys: 100, marker: 'next+/=' }]);
  assert.equal(all.records.size, 130);
  assert.equal(all.complete, true);
  for (const repeated of [false, true]) {
    const partial = await listDocuments(example, 'library', signal, async (_url, req) => Response.json(JSON.parse(req.body).marker
      ? { totalCount: 130, isTruncated: repeated, nextMarker: 'same', data: [] }
      : { totalCount: 130, isTruncated: true, nextMarker: 'same', data: records(0, 100) }));
    assert.equal(partial.records.size, 100);
    assert.equal(partial.complete, false);
  }
});

test('网页转换保留文本表格和封装图片，移除网络地址及活动元素', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-html-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const png = mockImage().bytes;
  const html = await staticHtml('<script>secret()</script><style>body{background:url(https://host/a)}</style><p onclick="handler()">文档</p><iframe src="file:///bad"></iframe><table><tr><td rowspan="2">内容</td></tr></table><img src="https://host/embedded" alt="嵌图"><img src="https://host/external" alt="外链图片">', directory, new Map([['https://host/embedded', png]]));
  assert.doesNotMatch(html, /secret\(|https:\/\/|file:\/\/|onclick|script|iframe/);
  assert.match(html, /rowspan="2">内容/);
  assert.match(html, /inline-1.png.*外链图片/);
  assert.deepEqual(await fs.readFile(path.join(directory, 'inline-1.png')), png);

  const mhtml = path.join(directory, 'sample.mhtml');
  await fs.writeFile(mhtml, ['MIME-Version: 1.0', 'Snapshot-Content-Location: https://host/snapshot.html', 'Content-Type: multipart/related; boundary="bound"; type="text/html"', '', '--bound', 'Content-Type: text/html; charset="utf-8"', '', '<p>MHTML</p><img src="photo.png" alt="封装图片">', '--bound', 'Content-Type: image/png', 'Content-Transfer-Encoding: base64', 'Content-Location: https://host/photo.png', '', png.toString('base64'), '--bound--', ''].join('\r\n'));
  const rendered = await fs.readFile(await webDocument(mhtml, 'mhtml', directory), 'utf8');
  assert.match(rendered, /MHTML/);
  assert.match(rendered, /src="inline-1.png"/);
  assert.doesNotMatch(rendered, /https:\/\//);
});

test('正式目录 HTTP 脱敏与授权，明确关闭查看器时不允许原文和区间读取', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-library-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const token = 'fixture'.repeat(10);
  for (const mode of ['live', 'mock']) {
    const config = { ...example, mode, port: 0, serviceToken: token, dataDirectory: directory,
      knowledgeDirectory: { mode: 'static' }, documentPreview: { ...example.documentPreview, allowPdfViewer: false } };
    const app = await createKnowledgeServer(config, { fetcher: async () => Response.json({ totalCount: 1, isTruncated: false, data: records(0, 1) }) });
    try {
      const addr = await app.listen();
      const base = `http://127.0.0.1:${addr.port}`;
      const headers = { Authorization: `Bearer ${token}` };
      assert.equal((await fetch(`${base}/library/catalog`)).status, 401);
      assert.equal((await fetch(`${base}/library/documents?libraryId=missing`, { headers })).status, 404);
      const docs = await (await fetch(`${base}/library/documents?libraryId=demo-design`, { headers })).json();
      if (mode === 'live') {
        assert.equal(docs.documents[0].name, '文档0.PDF');
        assert.doesNotMatch(JSON.stringify(docs), /http|fixture-private|download_url/);
        assert.equal((await fetch(`${base}/demo/library/catalog`)).status, 401);
      } else {
        assert.equal(docs.total, 17);
        const preview = await (await fetch(`${base}/library/open?libraryId=demo-design&documentId=sample-pdf`, { headers })).json();
        assert.equal(preview.code, 'PREVIEW_UNAVAILABLE');
        const blocked = await fetch(`${base}/library/pdf-range?previewId=invalid&begin=0&end=5`, { headers });
        assert.equal((await blocked.json()).code, 'PDF_VIEWER_DISABLED');
      }
    } finally { await app.close(); }
  }
});

test('原件限制同源并保留专用组件配置入口', () => {
  assert.equal(originalAddress('https://example.test/a'), undefined);
  assert.equal(originalAddress('http://ai.tbea.com/a'), undefined);
  assert.equal(originalAddress('https://account@ai.tbea.com/a'), undefined);
  const settings = { enabled: true, office: 'office', converters: {} };
  assert.equal(previewStatus('ofd', settings, false), 'converter-required');
  assert.equal(previewStatus('ofd', { ...settings, converters: { ofd: 'ofd-converter' } }, false), 'available');
  assert.equal(previewStatus('wps', settings, false), 'converter-required');
  assert.equal(previewStatus('doc', { enabled: true, converters: {} }, false), 'office-unavailable');
  assert.equal(previewStatus('doc', { enabled: true, converters: {} }, false, true), 'available');
});

test('匠宝转换经原文授权，取消并行请求、缓存、变更版本和转换错误均受控', async t => {
  const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-office-'));
  t.after(() => fs.rm(dataDirectory, { recursive: true, force: true }));
  let owner = 'other', version = '1', failure, downloads = 0, allowed = true, conversions = 0;
  let provider;
  let notifyStart;
  let started = new Promise(resolve => { notifyStart = resolve; });
  let finish;
  const convert = async (request, active) => {
    conversions++;
    assert.equal(request.priority, 'foreground');
    assert.equal(request.extension, 'docx');
    await assert.rejects(request.source.read(active, 1), { code: 'ORIGINAL_TOO_LARGE' });
    const source = await request.source.read(active, request.source.bytes);
    assert.equal(source.version, request.source.version);
    assert.ok(source.bytes.toString().endsWith(version));
    notifyStart(active);
    if (failure) throw Object.assign(new Error('private error'), { code: failure });
    if (finish) await Promise.race([finish, new Promise((_, reject) => active.addEventListener('abort', () => reject(active.reason), { once: true }))]);
    return { pdf: samplePreviewPdf(1) };
  };
  const library = new LibraryBrowser({ ...example, mode: 'live', dataDirectory, documentPreview: { enabled: true, converters: {} } },
    { catalog: async () => allowed ? [{ id: 'library' }] : [] }, async url => {
      if (url.pathname === '/file') { downloads++; return new Response('PK\x03\x04' + version); }
      if (url.searchParams.get('Action') === 'DescribeDocuments') return Response.json({ data: [], totalCount: 0, isTruncated: false });
      return Response.json({ data: { id: 'document', name: '中文.docx', knowledgeBaseId: owner, download_url: signed } });
    }, () => provider && { ...provider });
  const open = (active = signal) => library.open('library', 'document', active);
  try {
    await assert.rejects(open(), { code: 'DOCUMENT_NOT_FOUND' });
    owner = undefined;
    await assert.rejects(open(), { code: 'DOCUMENT_NOT_FOUND' });
    owner = 'library';
    await assert.rejects(open(), { code: 'OFFICE_SERVICE_UNAVAILABLE' });
    assert.equal(downloads, 0);
    provider = { convert, generation: 'generation-one' };
    let release;
    finish = new Promise(resolve => { release = resolve; });
    const abandoned = new AbortController();
    const stopWaiting = assert.rejects(open(abandoned.signal), { name: 'AbortError' });
    const survivor = open();
    const active = await started;
    abandoned.abort();
    await stopWaiting;
    assert.equal(active.aborted, false);
    release();
    const first = await survivor;
    assert.equal(conversions, 1);
    assert.equal((await open()).previewId, first.previewId);
    assert.equal(conversions, 1);
    allowed = false;
    await assert.rejects(open(), { code: 'LIBRARY_NOT_FOUND' });
    await assert.rejects(library.pdfRange(first.previewId, '0', '5', signal), { code: 'LIBRARY_NOT_FOUND' });
    allowed = true;
    failure = 'failed';
    version = '2';
    await assert.rejects(open(), { code: 'RENDER_PROGRAM_FAILED' });
    failure = undefined;
    finish = undefined;
    const second = await open();
    assert.notEqual(second.previewId, first.previewId);
    provider.generation = 'generation-two';
    assert.notEqual((await open()).previewId, second.previewId);
    const prepared = (await fs.readFile(path.join(dataDirectory, 'logs/dsh-mcp-tbea-knowledge.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    const firstConversion = prepared.find(row => row.previewId === first.previewId && !row.cached);
    assert.equal(firstConversion.converter, 'harness');
    assert.equal(firstConversion.sourceBytes, 5);
    assert.equal(firstConversion.pdfBytes, samplePreviewPdf(1).length);
    const phases = firstConversion.detailTiming.map(item => item.phase);
    for (const phase of ['download-headers', 'download-body-and-write', 'office-await-source', 'office-read-source',
      'office-after-read', 'office-service-total', 'validate-pdf', 'write-converted-pdf']) assert.ok(phases.includes(phase), phase);
    assert.ok(!prepared.find(row => row.previewId === first.previewId && row.cached).detailTiming.some(item => item.phase === 'office-service-total'));
    assert.doesNotMatch(JSON.stringify(prepared), /fixture-private|中文.docx/);
    version = '3';
    started = new Promise(resolve => { notifyStart = resolve; });
    finish = new Promise(() => {});
    const cancel = new AbortController();
    const cancelled = assert.rejects(open(cancel.signal), { name: 'AbortError' });
    const converting = await started;
    cancel.abort();
    await cancelled;
    assert.equal(converting.aborted, true);
  } finally { await library.close(); }
});

test('真实 XLS / XLSX 的受限字节、数字日期、合并和多工作表', async t => {
  const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-excel-'));
  t.after(() => fs.rm(dataDirectory, { recursive: true, force: true }));
  const fixtures = { xls: spreadsheetFixture('biff8'), xlsx: spreadsheetFixture('xlsx') };
  let granted = true;
  const library = new LibraryBrowser({ ...example, mode: 'live', dataDirectory },
    { catalog: async () => granted ? [{ id: 'library' }] : [] }, async (url, options) => {
      if (url.pathname === '/file') return new Response(fixtures[url.searchParams.get('format')]);
      const { documentId } = JSON.parse(options.body);
      return Response.json({ data: { id: documentId, name: '验收.' + documentId, knowledgeBaseId: 'library', download_url: signed + '&format=' + documentId } });
    });
  try {
    for (const [format, source] of Object.entries(fixtures)) {
      const preview = await library.open('library', format, signal);
      assert.equal(preview.sheetFormat, format);
      assert.equal(preview.sheetBytes, source.length);
      assert.equal(preview.pdfBytes, undefined);
      await assert.rejects(library.pdfRange(preview.previewId, '0', '5', signal), { code: 'INVALID_PDF_RANGE' });
      await assert.rejects(library.sheetRange(preview.previewId, '0', String(source.length + 1), signal), { code: 'INVALID_SHEET_RANGE' });
      granted = false;
      await assert.rejects(library.sheetRange(preview.previewId, '0', '5', signal), { code: 'LIBRARY_NOT_FOUND' });
      granted = true;
      const bytes = await library.sheetRange(preview.previewId, '0', String(source.length), signal);
      assert.deepEqual(bytes, source);
      const sheets = await readSpreadsheet(bytes, format);
      assert.deepEqual(sheets.map(item => item.name), ['数据', '汇总']);
      assert.deepEqual(sheets[0].merges, [{ row: 0, column: 0, rows: 1, columns: 2 }]);
      assert.equal(sheets[0].cells[4], '中文单元格');
      assert.equal(sheets[0].cells[5], '1,234.50');
      assert.equal(sheets[0].cells[6], '2025-06-18');
      assert.equal(sheets[0].cells[7], '2,469.00');
      assert.equal(sheets[1].cells[0], '第二张工作表');
      assert.equal((await library.open('library', format, signal)).previewId, preview.previewId);
    }
    const invalid = await readSpreadsheet(new Uint8Array([1, 2, 3]), 'xlsx').catch(spreadsheetFailure);
    assert.equal(invalid, 'invalid-sheet');
  } finally { await library.close(); }
});

test('PDF 原件直接按鉴权和区间读取，保存首屏诊断', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-pdf-viewer-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const token = 'pdf-viewer'.repeat(8);
  const sample = samplePreviewPdf(4);
  let downloads = 0;
  const app = await createKnowledgeServer({ ...example, mode: 'live', port: 0, serviceToken: token, dataDirectory: directory,
    knowledgeDirectory: { mode: 'static' }, documentPreview: { enabled: true, allowPdfViewer: true, converters: {} },
  }, { fetcher: async url => {
    if (url.pathname === '/file') { downloads++; return new Response(sample); }
    assert.equal(url.searchParams.get('Action'), 'DescribeDocument');
    return Response.json({ data: { id: 'pdf', name: '验证.pdf', knowledgeBaseId: 'demo-design', download_url: signed } });
  } });
  try {
    const { port } = await app.listen();
    const base = `http://127.0.0.1:${port}`;
    const headers = { Authorization: `Bearer ${token}` };
    const opened = await fetch(`${base}/library/open?libraryId=demo-design&documentId=pdf`, { headers });
    assert.equal(opened.status, 200);
    const preview = await opened.json();
    assert.equal(preview.pdfBytes, sample.length);
    assert.equal(preview.pages, undefined);
    const range = `${base}/library/pdf-range?previewId=${preview.previewId}`;
    assert.equal((await fetch(`${range}&begin=0&end=5`)).status, 401);
    assert.equal((await fetch(`${range}&begin=0&end=${sample.length + 1}`, { headers })).status, 400);
    assert.equal((await fetch(`${range}&end=5`, { headers })).status, 400);
    const first = await fetch(`${range}&begin=0&end=5`, { headers });
    assert.equal(first.headers.get('cache-control'), 'no-store');
    assert.equal(first.headers.get('content-type'), 'application/octet-stream');
    assert.equal(await first.text(), '%PDF-');
    const remainder = await fetch(`${range}&begin=5&end=${sample.length}`, { headers });
    assert.deepEqual(Buffer.from(await remainder.arrayBuffer()), sample.subarray(5));
    assert.equal(downloads, 1);
    const metricUrl = `${base}/library/preview-result?previewId=${preview.previewId}&status=ready&elapsedMs=35`;
    assert.equal((await fetch(metricUrl + '&pdfRenderMs=36', { headers })).status, 400);
    const metric = await fetch(metricUrl + '&pdfAssetMs=5&pdfLoadMs=15&pdfRenderMs=15', { headers });
    assert.equal((await metric.json()).recorded, true);
    const logs = (await fs.readFile(path.join(directory, 'logs/dsh-mcp-tbea-knowledge.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(logs.some(row => row.event === 'tbea-preview-prepare' && row.timing.some(step => step.phase === 'downloading')));
    const firstPage = logs.find(row => row.event === 'tbea-preview-first-page' && row.status === 'ready');
    assert.deepEqual([firstPage.pdfAssetMs, firstPage.pdfLoadMs, firstPage.pdfRenderMs], [5, 15, 15]);
    assert.doesNotMatch(JSON.stringify(logs), /fixture-private|X-Amz|验证.pdf/);
  } finally { await app.close(); }
});

test('使用真实 LibreOffice 转换文档，文本直接展示', { skip: !process.env.TBEA_TEST_OFFICE, timeout: 175000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-renderer-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const settings = { enabled: true, office: process.env.TBEA_TEST_OFFICE, converters: {} };
  const nativeSignal = AbortSignal.timeout(170000);
  const md = Buffer.from('# 工程说明\n\n| 内容 | 数值 |\n| --- | --- |\n| 项目 | 10 |');
  const fixtures = { html: Buffer.from('<h1>Title</h1><table><tr><td>engine</td></tr></table>'), txt: Buffer.from('示例文本\n第二行'), md, png: mockImage().bytes,
    mhtml: Buffer.from('MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<h1>页面存档</h1>'),
  };
  const bitmap = Buffer.alloc(70, 0xff);
  bitmap.fill(0, 0, 54);
  bitmap.write('BM'); bitmap.writeUInt32LE(70, 2); bitmap.writeUInt32LE(54, 10); bitmap.writeUInt32LE(40, 14);
  bitmap.writeInt32LE(2, 18); bitmap.writeInt32LE(2, 22); bitmap.writeUInt16LE(1, 26); bitmap.writeUInt16LE(24, 28);
  fixtures.bmp = bitmap;
  await fs.writeFile(path.join(root, 'report.fodt'), `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:body><office:text><text:p>文档版式测试</text:p></office:text></office:body></office:document>`);
  await fs.writeFile(path.join(root, 'presentation.fodp'), `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.presentation">
<office:body><office:presentation><draw:page draw:name="示例"><draw:frame presentation:class="title"><draw:text-box><text:p>Slide</text:p></draw:text-box></draw:frame></draw:page></office:presentation></office:body></office:document>`);
  async function generate(base, original, target, filter) {
    const run = promisify(execFile);
    await run(settings.office, [`-env:UserInstallation=${pathToFileURL(path.join(root, `profile-${target}`)).href}`, '--headless', '--convert-to', `${target}:${filter}`, '--outdir', root, path.join(root, `${base}.${original}`)], { windowsHide: true, signal: nativeSignal });
    return fs.readFile(path.join(root, `${base}.${target}`));
  }
  [fixtures.doc, fixtures.docx, fixtures.ppt, fixtures.pptx] = await Promise.all([
    generate('report', 'fodt', 'doc', 'MS Word 97'), generate('report', 'fodt', 'docx', 'Office Open XML Text'),
    generate('presentation', 'fodp', 'ppt', 'MS PowerPoint 97'), generate('presentation', 'fodp', 'pptx', 'Impress Office Open XML'),
  ]);
  async function verify(format) {
    const directory = await fs.mkdtemp(path.join(root, `${format}-`));
    const { input } = await downloadDocument(settings, signed, format, directory, nativeSignal, undefined, async (_url, request) => {
      assert.equal(request.redirect, 'error');
      assert.equal(request.headers, undefined);
      return new Response(fixtures[format]);
    });
    const result = await preparePreviewDocument(settings, input, format, directory, nativeSignal);
    if (format === 'txt' || format === 'md') {
      assert.match(result.html, /示例文本|工程说明/u);
      assert.equal(result.pdf, undefined);
      return;
    }
    assert.ok(result.pdfBytes > 0, format);
    assert.equal((await fs.readFile(result.pdf)).subarray(0, 5).toString(), '%PDF-', format);
  }
  await Promise.all(Object.keys(fixtures).map(verify));
  let bytes = fixtures.docx;
  const app = await createKnowledgeServer({ ...example, mode: 'live', port: 0, serviceToken: 'cache-fixture'.repeat(6), dataDirectory: root,
    knowledgeDirectory: { mode: 'static' }, documentPreview: settings,
  }, { fetcher: async url => url.pathname === '/file' ? new Response(bytes)
    : Response.json({ data: { id: 'word', name: '版本验证.docx', knowledgeBaseId: 'demo-design', download_url: signed } }) });
  try {
    const { port } = await app.listen();
    const base = `http://127.0.0.1:${port}/library/open?libraryId=demo-design&documentId=word`;
    async function open() {
      const response = await fetch(base, { headers: { Authorization: `Bearer ${'cache-fixture'.repeat(6)}` } });
      assert.equal(response.ok, true);
      return response.json();
    }
    const first = await open();
    assert.equal((await open()).previewId, first.previewId);
    bytes = Buffer.concat([bytes, Buffer.from('new revision')]);
    assert.notEqual((await open()).previewId, first.previewId);
    const logs = (await fs.readFile(path.join(root, 'logs/dsh-mcp-tbea-knowledge.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(logs.map(line => line.cached), [false, true, false]);
    assert.deepEqual(logs.map(line => line.timing.some(step => step.phase === 'converting')), [true, false, true]);
  } finally { await app.close(); }
});
