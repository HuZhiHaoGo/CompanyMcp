import { deflateSync } from 'node:zlib';
import type { ImageData, JsonRecord } from './contracts.ts';

/** 非业务数据的演示切片，覆盖重复、HTML、表格、星号、图片及父子切片。 */
export function mockChunks(ids: readonly string[]): JsonRecord[] {
  const kb = ids[0];
  return [
    { knowledgebase_id: kb, chunk_id: 'demo-001', document_name: '演示设计指引（非正式标准）', locations: { page_num: [3] }, rank_score: 0.91,
      content: '本资料仅用于界面演示，不构成设计标准。设计要求应结合具体产品、适用地区和有效标准版本核对。\n\n<figure><img src="https://ai.tbea.com/demo/transformer.png" alt="演示结构示意图"><figcaption>演示结构示意图，仅用于软件验证。</figcaption></figure>\n\n| 项目 | 内容 |\n| --- | --- |\n| 表达式 | A*B*C |\n| 单位 | mm |\n| 多行内容 | 第一行<br>第二行 |',
      children: [{ chunk_id: 'demo-child', content: '父子切片演示：使用父段落提供上下文，不重复计入来源。' }] },
    { knowledgebase_id: ids[1] || kb, chunk_id: 'demo-002', document_name: '演示PLM操作指引', rank_score: 0.76,
      content: '<p>如遇操作问题，应先记录错误提示和操作步骤，再核对操作指引。</p><table><tr><th>步骤</th><th>检查项</th></tr><tr><td rowspan="2">核对</td><td>产品型号</td></tr><tr><td>资料版本</td></tr></table>' },
  ];
}

function crc32(bytes: Uint8Array) { let crc = -1; for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; }
function chunk(type: string, data: Buffer) { const name = Buffer.from(type); const output = Buffer.alloc(data.length + 12); output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8); output.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8); return output; }

/** 生成真实 PNG 演示资源，无外部地址依赖；仅画示意结构，不包含业务图纸。 */
export function mockImage(): ImageData {
  const width = 640; const height = 300;
  const pixels = Buffer.alloc((width * 3 + 1) * height, 255);
  for (let y = 0; y < height; y++) pixels[y * (width * 3 + 1)] = 0;
  function rect(x: number, y: number, w: number, h: number, color: [number, number, number]) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const at = yy * (width * 3 + 1) + 1 + xx * 3; for (let k = 0; k < 3; k++) pixels[at + k] = color[k]; } }
  rect(195, 55, 250, 190, [85, 98, 111]); rect(222, 80, 196, 140, [238, 243, 248]);
  for (let i = 0; i < 7; i++) { rect(175, 91 + i * 17, 65, 9, [193, 60, 55]); rect(401, 91 + i * 17, 65, 9, [40, 105, 164]); }
  rect(75, 95, 110, 4, [193,60,55]); rect(75, 195, 110, 4, [193,60,55]);
  rect(458, 95, 105, 4, [40,105,164]); rect(458, 195, 105, 4, [40,105,164]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return { type: 'image/png', bytes: Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]) };
}
