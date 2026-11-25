import React, { useEffect, useState } from 'react';
import type { LibraryBridge } from './library-browser.tsx';
import { assetUrl, PreviewMeter } from './pdf-viewer.tsx';
import type { PreviewSheet, SheetMessage } from './spreadsheet-worker.ts';

const requestBytes = 1024 * 1024;
const rowsPerPage = 50;
const messages = {
  'invalid-sheet': 'Excel 文件损坏或格式不受支持，无法预览。',
  password: '此 Excel 文件受密码保护，无法预览。',
  'sheet-too-large': '工作簿超过预览的解压、工作表或单元格上限。',
  'sheet-timeout': '读取工作表超时，工作簿可能过大。',
  'load-failed': '工作表读取失败，请重新打开或重试。',
};

export function SpreadsheetViewer({ bridge, previewId, bytes, format, assetPath, restart }: {
  bridge: LibraryBridge; previewId: string; bytes: number; format: 'xls' | 'xlsx'; assetPath: string; restart: () => void;
}) {
  const [sheets, setSheets] = useState<PreviewSheet[]>();
  const [selected, setSelected] = useState(0);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [parsed, setParsed] = useState<{ started: number; parseMs: number }>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const started = performance.now();
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const fail = (category: keyof typeof messages, parseMs?: number, message?: string) => {
      if (signal.aborted) return;
      worker?.terminate();
      clearTimeout(timer);
      setFailure(message ?? messages[category]);
      void bridge('library-preview-result', { previewId, status: category, parseMs, elapsedMs: Math.round(performance.now() - started) },
        AbortSignal.timeout(5000)).catch(() => {});
    };
    async function load() {
      const buffer = new Uint8Array(bytes);
      for (let begin = 0; begin < bytes; begin += requestBytes) {
        const end = Math.min(bytes, begin + requestBytes);
        const chunk = await bridge('library-sheet-range', { previewId, begin, end }, signal);
        if (chunk.bytes.length !== end - begin) throw new Error(messages['load-failed']);
        buffer.set(chunk.bytes, begin);
      }
      signal.throwIfAborted();
      worker = new Worker(assetUrl(assetPath, 'sheet.worker.mjs'), { type: 'module' });
      worker.onerror = () => fail('load-failed');
      worker.onmessage = ({ data }: MessageEvent<SheetMessage>) => {
        if (signal.aborted) return;
        clearTimeout(timer);
        worker?.terminate();
        if ('error' in data) fail(data.error, data.parseMs);
        else {
          setSheets(data.sheets);
          setParsed({ started, parseMs: data.parseMs });
        }
      };
      const parsingStarted = performance.now();
      timer = setTimeout(() => fail('sheet-timeout', Math.round(performance.now() - parsingStarted)), 20_000);
      worker.postMessage({ bytes: buffer, format }, [buffer.buffer]);
    }
    void load().catch(error => fail('load-failed', undefined, error instanceof Error ? error.message : undefined));
    return () => { controller.abort(); clearTimeout(timer); worker?.terminate(); };
  }, [bridge, previewId, bytes, format, assetPath]);

  useEffect(() => {
    if (!parsed) return;
    let displayed = 0;
    const committed = requestAnimationFrame(() => {
      displayed = requestAnimationFrame(() => {
        setReady(true);
        void bridge('library-preview-result', { previewId, status: 'ready', parseMs: parsed.parseMs,
          elapsedMs: Math.round(performance.now() - parsed.started) }, AbortSignal.timeout(5000)).catch(() => {});
      });
    });
    return () => { cancelAnimationFrame(committed); cancelAnimationFrame(displayed); };
  }, [bridge, parsed, previewId]);

  if (failure) return <div className="tbea-library-state tbea-library-error" role="alert"><span>{failure}</span>
    <button type="button" className="tbea-library-button" onClick={restart}>重试</button></div>;
  return <>
    {!ready && <PreviewMeter label="正在读取工作表…" />}
    {sheets && <div className="tbea-sheet">
      <label>工作表 <select value={selected} onChange={event => setSelected(Number(event.target.value))}>
        {sheets.map((sheet, index) => <option key={index} value={index}>{sheet.name}</option>)}
      </select></label>
      <SheetTable key={selected} sheet={sheets[selected]} />
    </div>}
  </>;
}

function columnName(index: number) {
  let label = '';
  for (let column = index + 1; column > 0; column = Math.floor((column - 1) / 26)) {
    label = String.fromCharCode(65 + (column - 1) % 26) + label;
  }
  return label;
}

function SheetTable({ sheet }: { sheet: PreviewSheet }) {
  const [page, setPage] = useState(0);
  const first = page * rowsPerPage;
  const last = Math.min(sheet.rows, first + rowsPerPage);
  const grid = new Map<number, { rows: number; columns: number; value?: string } | null>();
  for (const merge of sheet.merges) {
    const top = Math.max(first, merge.row);
    const bottom = Math.min(last, merge.row + merge.rows);
    if (bottom <= top) continue;
    const index = top * sheet.columns + merge.column;
    let overlaps = false;
    for (let row = top; row < bottom && !overlaps; row++) {
      for (let col = merge.column; col < merge.column + merge.columns; col++) {
        if (grid.has(row * sheet.columns + col)) { overlaps = true; break; }
      }
    }
    if (overlaps) continue;
    for (let row = top; row < bottom; row++) {
      for (let col = merge.column; col < merge.column + merge.columns; col++) grid.set(row * sheet.columns + col, null);
    }
    grid.set(index, { rows: bottom - top, columns: merge.columns, value: sheet.cells[merge.row * sheet.columns + merge.column] });
  }
  return <>
    {sheet.rows > rowsPerPage && <nav className="tbea-sheet-rows" aria-label="工作表行范围">
      <button type="button" className="tbea-library-button" disabled={!page} onClick={() => setPage(page - 1)}>上一组</button>
      <span>第 {sheet.startRow + first + 1} 至 {sheet.startRow + last} 行</span>
      <button type="button" className="tbea-library-button" disabled={last >= sheet.rows} onClick={() => setPage(page + 1)}>下一组</button>
    </nav>}
    <div key={page} className="tbea-sheet-scroll" tabIndex={0} aria-label="滚动查看工作表">
      <table aria-label={sheet.name}>
        <thead><tr><th aria-label="行号" />
          {Array.from({ length: sheet.columns }, (_, col) => <th key={col} scope="col">{columnName(sheet.startColumn + col)}</th>)}
        </tr></thead>
        <tbody>{Array.from({ length: last - first }, (_, relative) => {
          const row = first + relative;
          return <tr key={row}>
            <th scope="row">{sheet.startRow + row + 1}</th>
            {Array.from({ length: sheet.columns }, (_, col) => {
              const index = row * sheet.columns + col;
              const merge = grid.get(index);
              if (merge === null) return null;
              const value = merge ? merge.value : sheet.cells[index];
              return <td key={col} rowSpan={merge?.rows} colSpan={merge?.columns} title={value}>{value}</td>;
            })}
          </tr>;
        })}</tbody>
      </table>
    </div>
  </>;
}
