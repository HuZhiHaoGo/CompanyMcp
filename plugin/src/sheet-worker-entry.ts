import { readSpreadsheet, spreadsheetFailure } from './spreadsheet-worker.ts';
import type { SheetMessage } from './spreadsheet-worker.ts';

self.onmessage = async (event: MessageEvent<{ bytes: Uint8Array<ArrayBuffer>; format: 'xls' | 'xlsx' }>) => {
  const start = performance.now();
  const result = await readSpreadsheet(event.data.bytes, event.data.format)
    .then(sheets => ({ sheets }), error => ({ error: spreadsheetFailure(error) }));
  const message: SheetMessage = { ...result, parseMs: Math.round(performance.now() - start) };
  self.postMessage(message);
};
