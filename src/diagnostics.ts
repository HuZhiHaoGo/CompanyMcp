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

export function diagnosticId(value: unknown) {
  const id = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  return typeof id === 'string' && /^[\w.:-]{1,128}$/u.test(id) ? id : undefined;
}

export function diagnosticCredentials(config: ServiceConfig) {
  const { platform, serviceToken } = config;
  return [platform.accessKey, platform.secretKey, platform.assetApiKey, serviceToken];
}

export function diagnosticText(value: string, limit: number, credentials: readonly (string | undefined)[]) {
  let text = value.slice(0, limit + 8192).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/gu, '');
  for (const credential of credentials) {
    if (credential) text = text.replaceAll(credential, '[已隐去凭据]');
  }
  return text
    .replace(/(?:[a-z][a-z0-9+.-]*:\/\/|(?<![\p{L}\p{N}:])\/\/|\bdata:)[^\s<>"'|)]+/giu, '[已隐去链接]')
    .replace(/\b(?:www\.)[^\s<>"'|)]+/giu, '[已隐去链接]')
    .replace(/\b(?:bearer|basic)\s+[A-Za-z0-9._~+\/=:-]+/giu, '[已隐去凭据]')
    .replace(/(?:x-amz-[\w-]+|(?:access|secret|api|asset)[-_ ]?key|service[-_ ]?token|\b(?:ak|sk|password|signature|token|authorization)\b|凭据|密钥|口令)\s*["']?\s*[:=：]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;|)<>]+)(?=\s|$|[,;|)<>])/giu, '[已隐去凭据]')
    .trim().slice(0, limit);
}

export type PreviewTiming = (phase: string, started: number) => void;

export async function timePreview<T>(timing: PreviewTiming | undefined, phase: string, work: () => T | Promise<T>): Promise<T> {
  if (!timing) return work();
  const started = performance.now();
  try { return await work(); }
  finally { timing(phase, started); }
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
