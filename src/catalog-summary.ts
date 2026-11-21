const MAX_ENTRIES = 12;
const MAX_JSON_LENGTH = 1600;

function label(value: unknown, limit: number) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[\s\p{Cc}\p{Cf}]+/gu, ' ').trim();
  const characters = Array.from(text);
  return characters.length > limit ? characters.slice(0, limit - 1).join('') + '…' : text;
}

// 描述是平台提供的数据。只选取库名和主题描述，响应大小也按实际序列化结果控制。
export function summarizeKnowledgeBases(catalog: readonly KnowledgeBase[]) {
  const entries = catalog.flatMap(({ id, name: rawName, description: rawDescription }) => {
    const name = label(rawName, 60);
    if (!name || rawName === id) return [];
    const description = label(rawDescription, 100);
    return [description ? { name, description } : { name }];
  });
  const serialized = new Map(entries.map(entry => [JSON.stringify(entry), entry]));
  const topics: { name: string; description?: string }[] = [];
  let size = 2;
  for (const value of [...serialized.keys()].sort()) {
    if (topics.length >= MAX_ENTRIES) break;
    const nextSize = size + value.length + Number(topics.length > 0);
    if (nextSize > MAX_JSON_LENGTH) continue;
    const topic = serialized.get(value);
    if (topic) topics.push(topic);
    size = nextSize;
  }
  return { topics, truncated: topics.length < serialized.size };
}
import type { KnowledgeBase } from './contracts.ts';

