import { createHmac } from 'node:crypto';
import { isRecord } from './contracts.ts';
import type { ServiceConfig } from './contracts.ts';
export const SERVICE_VERSION = '0.11.11';
export const RUNTIME_PROTOCOL = 'tbea-runtime/v1';
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
  return value;
}
/** 仅在鉴权后核对配置，不公开 AK/SK、数据目录等原始配置。 */
export function configIdentity(config: ServiceConfig) {
  const value: Record<string, unknown> = { ...config };
  delete value.service;
  // 仅影响 DSH 暴露的模型工具，独立 MCP 无需为此切换而重启。
  delete value.autoRetrieveKnowledge;
  delete value.diagnosticsDirectory;
  if (!config.documentPreview?.enabled) delete value.documentPreview;
  return createHmac('sha256',config.serviceToken).update(JSON.stringify(canonical(value))).digest('hex');
}
