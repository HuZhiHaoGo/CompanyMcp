import fs from 'node:fs/promises';
import path from 'node:path';

export async function pdfViewerAsset(root: string, name: string | null) {
  if (!name || (!['pdf.mjs', 'pdf.worker.mjs'].includes(name) && !/^(?:cmaps|standard_fonts|wasm)\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/u.test(name))) {
    return new Response(null, { status: 404 });
  }
  const bytes = await fs.readFile(path.join(root, name)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), { headers: {
    'content-type': /\.m?js$/u.test(name) ? 'text/javascript; charset=utf-8' : 'application/octet-stream',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  } });
}

/** 演示使用无外部文件依赖的合成 PDF。 */
export function samplePreviewPdf(pages: number) {
  const kids = Array.from({ length: pages }, (_, index) => `${index + 3} 0 R`);
  const drawing = '0.12 0.32 0.55 rg 45 700 450 34 re f\n0.76 0.82 0.9 rg 45 646 400 10 re f 45 619 440 10 re f\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>`,
    ...kids.map(() => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources <<>> /Contents ${pages + 3} 0 R >>`),
    `<< /Length ${drawing.length} >>\nstream\n${drawing}endstream`,
  ];
  let text = '%PDF-1.4\n';
  const offsets = ['0000000000 65535 f\r\n'];
  for (const [index, object] of objects.entries()) {
    offsets.push(`${String(text.length).padStart(10, '0')} 00000 n\r\n`);
    text += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = text.length;
  text += `xref\n0 ${offsets.length}\n${offsets.join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text, 'ascii');
}
