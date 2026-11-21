import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { listDocuments, originalAddress } from '../src/documents.ts';
import { previewStatus, prepareDocument, renderDocumentPage } from '../src/document-renderer.ts';
import { mockImage } from '../src/mock.ts';
import { staticHtml, webDocument } from '../src/preview-content.ts';
import { createKnowledgeServer } from '../src/server.ts';

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

test('正式目录 HTTP 脱敏与授权，演示预览仅返回 PNG 页', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-library-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const token = 'fixture'.repeat(10);
  for (const mode of ['live', 'mock']) {
    const config = { ...example, mode, port: 0, serviceToken: token, dataDirectory: directory, knowledgeDirectory: { mode: 'static' } };
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
        assert.equal(preview.pages, 4);
        const result = await fetch(`${base}/library/page?previewId=${preview.previewId}&page=4`, { headers });
        assert.equal(result.headers.get('content-type'), 'image/png');
        assert.deepEqual(Buffer.from(await result.arrayBuffer()).subarray(0, 8), mockImage().bytes.subarray(0, 8));
        assert.equal((await fetch(`${base}/library/page?previewId=${preview.previewId}&page=5`, { headers })).status, 400);
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
});

test('使用真实 LibreOffice 和 Poppler 生成预览页', { skip: !process.env.TBEA_TEST_OFFICE || !process.env.TBEA_TEST_PDFINFO || !process.env.TBEA_TEST_PDFTOPPM, timeout: 175000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-test-renderer-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const settings = { enabled: true, office: process.env.TBEA_TEST_OFFICE, pdfInfo: process.env.TBEA_TEST_PDFINFO, pdfToPpm: process.env.TBEA_TEST_PDFTOPPM, converters: {} };
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
    const result = await prepareDocument(settings, signed, format, directory, nativeSignal, async (_url, request) => {
      assert.equal(request.redirect, 'error');
      assert.equal(request.headers, undefined);
      return new Response(fixtures[format]);
    });
    if (format === 'html') fixtures.pdf = await fs.readFile(result.pdf);
    assert.ok(result.pages > 0, format);
    const png = await renderDocumentPage(settings, result.pdf, 1, directory, nativeSignal);
    assert.deepEqual(png.subarray(0, 8), mockImage().bytes.subarray(0, 8), format);
    return result.pdf;
  }
  await Promise.all(Object.keys(fixtures).map(verify));
  const pdf = await verify('pdf');
  const imagePrefix = path.join(root, 'image');
  await promisify(execFile)(settings.pdfToPpm, ['-f', '1', '-l', '1', '-scale-to', '200', '-jpeg', '-singlefile', pdf, imagePrefix], { signal: nativeSignal });
  fixtures.jpg = fixtures.jpeg = await fs.readFile(`${imagePrefix}.jpg`);
  await Promise.all([verify('jpg'), verify('jpeg')]);
});
