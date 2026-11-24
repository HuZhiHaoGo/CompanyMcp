import fs from 'node:fs/promises';
import path from 'node:path';
import { hasCode, isRecord } from './contracts.ts';
import type { ServiceConfig } from './contracts.ts';

const maxLogBytes = 10 * 1024 * 1024;
const pending = new Map<string, Promise<void>>();

export function diagnosticFilename(config: Pick<ServiceConfig, 'dataDirectory' | 'diagnosticsDirectory'>) {
  return path.join(config.diagnosticsDirectory ?? path.join(config.dataDirectory, 'logs'), 'dsh-mcp-tbea-knowledge.jsonl');
}

export function diagnosticErrorCode(error: unknown) {
  if (isRecord(error) && typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)) return error.code;
  if (error instanceof Error && error.name === 'AbortError') return 'ABORTED';
  if (error instanceof Error && error.name === 'TimeoutError') return 'TIMEOUT';
  return 'UNKNOWN_ERROR';
}

export function appendDiagnostic(config: ServiceConfig, event: Record<string, unknown>): Promise<void> {
  const filename = diagnosticFilename(config);
  const line = JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n';
  const next = (pending.get(filename) ?? Promise.resolve()).then(async () => {
    await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
    const size = await fs.stat(filename).then(stat => stat.size).catch(error => {
      if (!hasCode(error, 'ENOENT')) throw error;
      return 0;
    });
    if (size && size + Buffer.byteLength(line) > maxLogBytes) await fs.rename(filename, filename + '.1');
    await fs.appendFile(filename, line, { encoding: 'utf8', mode: 0o600 });
  }).catch(error => {
    console.warn(`知识库诊断日志写入失败（${diagnosticErrorCode(error)}）`);
  });
  pending.set(filename, next);
  return next.finally(() => { if (pending.get(filename) === next) pending.delete(filename); });
}
