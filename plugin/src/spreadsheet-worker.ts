import { read, set_cptable, utils } from 'xlsx';
import * as codepages from 'xlsx/dist/cpexcel.full.mjs';

const maxRows = 20_000;
const maxColumns = 256;
const maxSheets = 64;
const maxExpandedBytes = 128 * 1024 * 1024;

export interface PreviewSheet {
  name: string;
  rows: number;
  columns: number;
  startRow: number;
  startColumn: number;
  cells: Record<number, string>;
  merges: { row: number; column: number; rows: number; columns: number }[];
}

type Failure = 'invalid-sheet' | 'password' | 'sheet-too-large';
export type SheetMessage = { sheets: PreviewSheet[]; parseMs: number } | { error: Failure; parseMs: number };

// The parser expands ZIP entries synchronously. Check the actual expanded size
// in bounded streams before allowing it to allocate for the workbook.
async function checkArchive(bytes: Uint8Array<ArrayBuffer>) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, true);
  const u32 = (at: number) => view.getUint32(at, true);
  let end = bytes.length - 22;
  const firstEnd = Math.max(0, end - 65535);
  while (end >= firstEnd && (u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length)) end--;
  if (end < firstEnd) throw new Error('invalid-sheet');
  const entries = u16(end + 10);
  if (entries > 4096) throw new Error('sheet-too-large');
  let central = u32(end + 16);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== entries || central + u32(end + 12) !== end) throw new Error('invalid-sheet');
  const dataEnd = central;
  let contentTypes = false;
  let expanded = 0;
  for (let index = 0; index < entries; index++) {
    if (central + 46 > end || u32(central) !== 0x02014b50) throw new Error('invalid-sheet');
    const flags = u16(central + 8), method = u16(central + 10), packed = u32(central + 20), size = u32(central + 24);
    const local = u32(central + 42);
    const nameLength = u16(central + 28);
    const name = bytes.subarray(central + 46, central + 46 + nameLength);
    const filename = new TextDecoder().decode(name).toLowerCase();
    contentTypes ||= filename === '[content_types].xml';
    if (['meta-inf/manifest.xml', 'objectdata.xml', 'index/document.iwa'].includes(filename)) throw new Error('invalid-sheet');
    central += 46 + nameLength + u16(central + 30) + u16(central + 32);
    if (flags & 1) throw new Error('password');
    expanded += size;
    if (expanded > maxExpandedBytes) throw new Error('sheet-too-large');
    if (local + 30 > dataEnd || u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) throw new Error('invalid-sheet');
    const begin = local + 30 + u16(local + 26) + u16(local + 28);
    const localName = bytes.subarray(local + 30, local + 30 + u16(local + 26));
    if (localName.length !== name.length || !name.every((byte, i) => byte === localName[i])) throw new Error('invalid-sheet');
    if (begin + packed > dataEnd || (!(flags & 8) && (u32(local + 18) !== packed || u32(local + 22) !== size))) throw new Error('invalid-sheet');
    if (method === 0 && packed === size) continue;
    if (method !== 8) throw new Error('invalid-sheet');
    const reader = new Blob([bytes.subarray(begin, begin + packed)]).stream()
      .pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    let actual = 0;
    try {
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        actual += chunk.value.byteLength;
        if (actual > size) throw new Error('sheet-too-large');
      }
    } finally { await reader.cancel().catch(() => {}); }
    if (actual !== size) throw new Error('invalid-sheet');
  }
  if (central !== end || !contentTypes) throw new Error('invalid-sheet');
}

export async function readSpreadsheet(bytes: Uint8Array<ArrayBuffer>, format: 'xls' | 'xlsx'): Promise<PreviewSheet[]> {
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    if (format === 'xlsx') {
      const container = read(bytes, { bookFiles: true, bookSheets: true, type: 'array' });
      // Password-protected OOXML is stored in an OLE container and rejected by SheetJS.
      if (container) throw new Error('invalid-sheet');
    }
  } else if (format === 'xlsx') {
    await checkArchive(bytes);
  } else if (bytes[0] !== 0x09 || ![0, 2, 4, 8].includes(bytes[1])) {
    throw new Error('invalid-sheet');
  }
  if (format === 'xls') set_cptable(codepages);
  const book = read(bytes, { type: 'array', dense: true, cellHTML: false, sheetRows: maxRows + 1 });
  if (book.SheetNames.length > maxSheets) throw new Error('sheet-too-large');
  let cellCount = 0;
  let characters = 0;
  const sheets = book.SheetNames.flatMap((name, index): PreviewSheet[] => {
    if (book.Workbook?.Sheets?.[index]?.Hidden) return [];
    const sheet = book.Sheets[name];
    if (!sheet) throw new Error('invalid-sheet');
    const range = utils.decode_range(sheet['!ref'] ?? 'A1');
    const full = utils.decode_range(sheet['!fullref'] ?? sheet['!ref'] ?? 'A1');
    const rows = range.e.r - range.s.r + 1, columns = range.e.c - range.s.c + 1;
    if (full.e.r - full.s.r + 1 > maxRows || full.e.c - full.s.c + 1 > maxColumns
      || rows > maxRows || columns > maxColumns) throw new Error('sheet-too-large');
    if (!Number.isSafeInteger(rows) || !Number.isSafeInteger(columns) || rows < 1 || columns < 1 || range.s.r < 0 || range.s.c < 0) throw new Error('invalid-sheet');
    const cells: Record<number, string> = {};
    for (let r = 0; r < rows; r++) {
      const source = sheet['!data']?.[range.s.r + r];
      if (!source) continue;
      for (let c = 0; c < columns; c++) {
        const cell = source[range.s.c + c];
        if (cell?.v === undefined) continue;
        const value = utils.format_cell(cell).slice(0, 32767);
        characters += value.length;
        if (++cellCount > 500_000 || characters > 4_000_000) throw new Error('sheet-too-large');
        cells[r * columns + c] = value;
      }
    }
    const merges = (sheet['!merges'] ?? []).flatMap(({ s, e }) => {
      if (s.r < range.s.r || s.c < range.s.c || s.r > range.e.r || s.c > range.e.c || e.r < s.r || e.c < s.c) return [];
      return [{ row: s.r - range.s.r, column: s.c - range.s.c,
        rows: Math.min(e.r, range.e.r) - s.r + 1, columns: Math.min(e.c, range.e.c) - s.c + 1 }];
    });
    if (merges.length > 20_000) throw new Error('sheet-too-large');
    return [{ name, rows, columns, startRow: range.s.r, startColumn: range.s.c, cells, merges }];
  });
  if (!sheets.length) throw new Error('invalid-sheet');
  return sheets;
}

export function spreadsheetFailure(error: unknown): Failure {
  const message = error instanceof Error ? error.message : '';
  if (message === 'sheet-too-large') return 'sheet-too-large';
  if (/password|encrypt/i.test(message)) return 'password';
  return 'invalid-sheet';
}
