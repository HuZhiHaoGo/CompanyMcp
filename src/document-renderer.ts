import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import type { DocumentPreviewConfig, Fetcher } from './contracts.ts';
import { originalAddress } from './documents.ts';
import { mockImage } from './mock.ts';
import { PlatformError } from './platform.ts';
import { imageExtension, webDocument } from './preview-content.ts';

const maxPageBytes = 12 * 1024 * 1024;
const mb = 1024 * 1024;
const officeFormats = new Set(['doc', 'docx', 'ppt', 'pptx', 'wps', 'dps', 'dpsx']);
const webFormats = new Set(['txt', 'md', 'html', 'mhtml']);
const imageFormats = new Set(['png', 'jpg', 'jpeg', 'bmp']);
const supportedFormats = new Set(['pdf', 'ofd', ...officeFormats, ...webFormats, ...imageFormats]);

export function previewStatus(format: string, settings: DocumentPreviewConfig | undefined, mock: boolean) {
  if (!supportedFormats.has(format)) return 'unsupported' as const;
  if (mock) return 'available' as const;
  if (!settings?.enabled) return 'disabled' as const;
  if (format === 'pdf' || settings.converters[format] || (format !== 'ofd' && settings.office)) return 'available' as const;
  return 'converter-required' as const;
}

function inputLimit(format: string) {
  if (format === 'pdf') return 300 * mb;
  if (format === 'txt') return 2 * mb;
  if (format === 'md' || imageFormats.has(format)) return 10 * mb;
  return 50 * mb;
}

async function header(filename: string, size = 1024) {
  const handle = await fs.open(filename, 'r');
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(size), 0, size);
    return buffer.subarray(0, bytesRead);
  } finally { await handle.close(); }
}

function isPdf(bytes: Buffer) { return bytes.toString('ascii').includes('%PDF-'); }

function validateInput(bytes: Buffer, format: string) {
  const zip = bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]));
  const ole = bytes.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]));
  const valid = format === 'pdf' ? isPdf(bytes)
    : imageFormats.has(format) ? imageExtension(bytes) === (format === 'jpeg' ? 'jpg' : format)
    : format === 'docx' || format === 'pptx' || format === 'ofd' || format === 'dpsx' ? zip
    : officeFormats.has(format) ? ole || zip : bytes.length > 0;
  if (!valid) throw new PlatformError('INVALID_ORIGINAL', '原文件内容与标注格式不符，无法预览');
}

async function download(address: string, input: string, format: string, signal: AbortSignal, fetcher: Fetcher) {
  const url = originalAddress(address);
  if (!url) throw new PlatformError('ORIGINAL_ADDRESS_INVALID', '平台暂未提供可用的同源原文地址');
  const limit = inputLimit(format);
  // 签名链接由平台返回，独立获取原件；禁止重定向且不附带管理凭证。
  const result = await fetcher(url, { signal, redirect: 'error', credentials: 'omit' });
  if (!result.ok || !result.body || result.status !== 200) {
    await result.body?.cancel().catch(() => {});
    throw new PlatformError('ORIGINAL_UNAVAILABLE', `读取原文失败（HTTP ${result.status}），请重试`);
  }
  if (Number(result.headers.get('content-length')) > limit) {
    await result.body.cancel().catch(() => {});
    throw new PlatformError('ORIGINAL_TOO_LARGE', '原文超过此格式的预览大小限制');
  }
  const reader = result.body.getReader();
  async function* stream() {
    let size = 0;
    try {
      while (true) {
        signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) throw new PlatformError('ORIGINAL_TOO_LARGE', '原文超过此格式的预览大小限制');
        yield value;
      }
    } finally { await reader.cancel().catch(() => {}); }
  }
  await pipeline(Readable.from(stream()), createWriteStream(input, { flags: 'wx', mode: 0o600 }), { signal });
}

function run(program: string, args: string[], directory: string, signal: AbortSignal, message: string) {
  signal.throwIfAborted();
  return new Promise<string>((resolve, reject) => {
    execFile(program, args, { cwd: directory, windowsHide: true, signal, killSignal: 'SIGKILL', timeout: 100000, maxBuffer: 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } }, (error, stdout) => {
      if (signal.aborted) reject(signal.reason);
      else if (error) {
        // 转换器输出可能包含临时路径、文档内容，不转发给客户端。
        reject(new PlatformError('RENDER_PROGRAM_FAILED', error.code === 'ENOENT' ? '预览组件路径无效，请联系管理员检查配置' : message));
      } else resolve(stdout);
    });
  });
}

const officeRegistry = `<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>
<item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>0</value></prop></item>
</oor:items>`;

export async function withBundledOffice<T>(program: string, directory: string, task: (executable: string) => Promise<T>): Promise<T> {
  // LibreOffice 的 Windows 启动器在较深的 Harness generation 路径中会启动失败。
  const link = path.join(directory, 'lo');
  await fs.symlink(path.dirname(path.dirname(program)), link, 'junction').catch(error => {
    const failure = new PlatformError('OFFICE_PATH_UNAVAILABLE', '无法为内置 LibreOffice 创建临时运行路径，请联系管理员检查临时目录权限');
    failure.cause = error;
    throw failure;
  });
  try {
    return await task(path.join(link, 'program', path.basename(program)));
  } finally {
    await fs.unlink(link);
  }
}

async function convertOffice(input: string, directory: string, program: string, bundled: boolean, signal: AbortSignal) {
  const profile = path.join(directory, 'office-profile');
  await fs.mkdir(path.join(profile, 'user'), { recursive: true });
  await fs.writeFile(path.join(profile, 'user', 'registrymodifications.xcu'), officeRegistry);
  const convert = (executable: string) => run(executable, [`-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--invisible', '--norestore', '--convert-to', 'pdf', '--outdir', directory, input], directory, signal, '文档转换失败，可能需要管理员配置适配该格式的转换组件');
  if (bundled && process.platform === 'win32') await withBundledOffice(program, directory, convert);
  else await convert(program);
  return path.join(directory, `${path.parse(input).name}.pdf`);
}

export async function prepareDocumentPdf(settings: DocumentPreviewConfig, address: string, format: string, directory: string, signal: AbortSignal, fetcher: Fetcher = fetch) {
  const original = path.join(directory, `input.${format}`);
  await download(address, original, format, signal, fetcher);
  validateInput(await header(original), format);
  let pdf = original;
  if (format !== 'pdf') {
    try {
      const converter = settings.converters[format];
      if (converter) {
        pdf = path.join(directory, 'converted.pdf');
        await run(converter, [original, pdf], directory, signal, '专用组件未能转换该文档，请联系管理员检查格式兼容性');
      } else {
        if (!settings.office) throw new PlatformError('CONVERTER_REQUIRED', '管理员尚未配置此格式的转换组件');
        const input = webFormats.has(format) ? await webDocument(original, format, directory) : original;
        pdf = await convertOffice(input, directory, settings.office, settings.officeBundled === true, signal);
      }
    } finally { await fs.rm(original, { force: true }); }
  }
  const bytes = (await fs.stat(pdf).catch(() => undefined))?.size ?? 0;
  if (!bytes || bytes > 300 * mb || !isPdf(await header(pdf).catch(() => Buffer.alloc(0)))) {
    throw new PlatformError('INVALID_CONVERSION', '没有生成可预览的文档，文件可能受保护或需要专用转换组件');
  }
  return { pdf, bytes };
}

export async function readPageCount(settings: DocumentPreviewConfig, pdf: string, directory: string, signal: AbortSignal) {
  const info = await run(settings.pdfInfo!, [pdf], directory, signal, '无法读取文档页数，文件可能损坏或受密码保护');
  const pages = Number(/^Pages:\s+(\d+)\s*$/m.exec(info)?.[1]);
  if (!Number.isInteger(pages) || pages < 1 || pages > 3000) throw new PlatformError('INVALID_PAGE_COUNT', '文档预览支持 1 至 3000 页');
  return pages;
}

export async function prepareDocument(settings: DocumentPreviewConfig, address: string, format: string, directory: string, signal: AbortSignal, fetcher: Fetcher = fetch) {
  const { pdf } = await prepareDocumentPdf(settings, address, format, directory, signal, fetcher);
  const pages = await readPageCount(settings, pdf, directory, signal);
  return { pdf, pages };
}

export async function renderDocumentPage(settings: DocumentPreviewConfig, pdf: string, page: number, directory: string, signal: AbortSignal) {
  const prefix = path.join(directory, `page-${page}-${randomUUID()}`);
  const output = `${prefix}.png`;
  try {
    await run(settings.pdfToPpm!, ['-f', String(page), '-l', String(page), '-scale-to', '1800', '-png', '-singlefile', pdf, prefix], directory, signal, '页面渲染失败，请重试');
    const size = (await fs.stat(output)).size;
    if (size < 8 || size > maxPageBytes || imageExtension(await header(output, 8)) !== 'png') throw new PlatformError('INVALID_PREVIEW_PAGE', '页面预览图无效或过大');
    return await fs.readFile(output, { signal });
  } finally { await fs.rm(output, { force: true }); }
}

export const mockDocumentPage = () => mockImage().bytes;
