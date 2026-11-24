import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import { simpleParser } from 'mailparser';
import { PlatformError } from './platform.ts';

const blocks = new Set('p div section article main h1 h2 h3 h4 h5 h6 br hr blockquote pre code b strong i em u s del sup sub ul ol li dl dt dd table caption thead tbody tfoot tr th td figure figcaption'.split(' '));
const dropped = new Set('head script style iframe frame object embed template noscript video audio svg math canvas form input'.split(' '));
const sourceLimit = 10 * 1024 * 1024;

function escape(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function decode(bytes: Buffer, format: string) {
  if (bytes[0] === 255 && bytes[1] === 254) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 254 && bytes[1] === 255) return new TextDecoder('utf-16be').decode(bytes);
  if (format === 'html') {
    const charset = /<meta\b[^>]{0,400}\bcharset\s*=\s*["']?([\w-]+)/i.exec(bytes.toString('latin1', 0, 4096))?.[1];
    if (charset) { try { return new TextDecoder(charset).decode(bytes); } catch { /* 尝试常见编码。 */ } }
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return new TextDecoder('gb18030').decode(bytes); }
}

export function imageExtension(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216) return 'jpg';
  if (bytes.toString('ascii', 0, 2) === 'BM') return 'bmp';
}

/** 仅重新生成静态内容及本次封装包里的图片路径。网页中的外链和活动元素不会进入转换器。 */
export async function staticHtml(input: string, directory: string, embedded = new Map<string, Buffer>(), browser = false) {
  const tree = parse(input);
  let images = 0;
  let imageBytes = 0;
  async function render(node: DefaultTreeAdapterTypes.Node, depth: number): Promise<string> {
    if (depth > 150) throw new PlatformError('HTML_TOO_DEEP', '网页文档层级太深，无法转换');
    if ('value' in node && node.nodeName === '#text') return escape(node.value);
    const tag = 'tagName' in node ? node.tagName : '';
    if (dropped.has(tag)) return '';
    const attrs = 'attrs' in node ? new Map(node.attrs.map(entry => [entry.name, entry.value])) : new Map<string, string>();
    if (tag === 'img') {
      const source = attrs.get('src') ?? '';
      const data = /^data:image\/(?:png|jpeg|jpg|bmp);base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(source);
      const bytes = embedded.get(source) ?? (data && data[1].length <= sourceLimit * 1.34 ? Buffer.from(data[1], 'base64') : undefined);
      const ext = bytes && imageExtension(bytes);
      const alt = attrs.get('alt');
      if (!ext || !bytes || images >= 200 || imageBytes + bytes.length > 20 * 1024 * 1024) return alt ? `<span>${escape(alt)}</span>` : '';
      const name = `inline-${++images}.${ext}`;
      imageBytes += bytes.length;
      if (!browser) await fs.writeFile(path.join(directory, name), bytes);
      const target = browser ? `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${bytes.toString('base64')}` : name;
      const width = attrs.get('width') ?? '';
      const height = attrs.get('height') ?? '';
      const dimensions = [width, height].every(n => /^\d{1,4}$/.test(n))
        ? ` width="${Math.min(620, Number(width))}" height="${Math.round(Math.min(1, 620 / Number(width)) * Number(height))}"` : ' width="480"';
      return `<img src="${target}"${dimensions}${alt ? ` alt="${escape(alt)}"` : ''}>`;
    }
    let content = '';
    if ('childNodes' in node) for (const child of node.childNodes) content += await render(child, depth + 1);
    if (!blocks.has(tag)) return content;
    if (tag === 'br' || tag === 'hr') return `<${tag}>`;
    const span = (tag === 'th' || tag === 'td') ? ['colspan', 'rowspan'].map(key => /^\d{1,2}$/.test(attrs.get(key) ?? '') ? ` ${key}="${attrs.get(key)}"` : '').join('') : '';
    return `<${tag}${span}${tag === 'table' ? ' border="1" cellpadding="4"' : ''}>${content}</${tag}>`;
  }
  const body = await render(tree, 0);
  if (browser) return body;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-size:11pt}pre{white-space:pre-wrap}</style></head><body>${body}</body></html>`;
}

export async function webDocument(input: string, format: string, directory: string, browser = false) {
  const bytes = await fs.readFile(input);
  const embedded = new Map<string, Buffer>();
  let html: string;
  if (format === 'mhtml') {
    const mail = await simpleParser(bytes, { skipImageLinks: true, skipHtmlToText: true, skipTextToHtml: true });
    html = mail.html || (mail.text ? `<p>${escape(mail.text).replace(/\r?\n/g, '<br>')}</p>` : '');
    const base = mail.headers.get('snapshot-content-location') ?? mail.headers.get('content-location');
    for (const resource of mail.attachments) {
      if (!imageExtension(resource.content)) continue;
      if (resource.cid) embedded.set(`cid:${resource.cid}`, resource.content);
      const location = resource.headers.get('content-location');
      if (typeof location === 'string') {
        embedded.set(location, resource.content);
        if (typeof base === 'string') {
          try {
            const absolute = new URL(location, base);
            const parent = new URL('.', base);
            embedded.set(absolute.href, resource.content);
            if (absolute.href.startsWith(parent.href)) embedded.set(absolute.href.slice(parent.href.length), resource.content);
          } catch { /* 仍可按封装文件的原始位置匹配。 */ }
        }
      }
    }
    if (!html) throw new PlatformError('MHTML_BODY_MISSING', '网页归档未包含可显示的正文');
  } else {
    const value = decode(bytes, format);
    html = format === 'md' ? micromark(value, { extensions: [gfm()], htmlExtensions: [gfmHtml()] }) : format === 'txt' ? `<p>${escape(value).replace(/\r\n?|\n/g, '<br>')}</p>` : value;
  }
  const target = path.join(directory, 'content.html');
  const markup = await staticHtml(html, directory, embedded, browser);
  if (browser) return markup;
  await fs.writeFile(target, markup);
  return target;
}
