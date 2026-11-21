const words = new Intl.Segmenter('zh-CN', { granularity: 'word' });
const regionsZh = new Intl.DisplayNames('zh-CN', { type: 'region', fallback: 'none' });
const regionsEn = new Intl.DisplayNames('en', { type: 'region', fallback: 'none' });
const regions = new Map<string, string[]>();
for (let first = 65; first <= 90; first++) {
  for (let second = 65; second <= 90; second++) {
    const code = String.fromCharCode(first, second);
    const names = [regionsZh.of(code), regionsEn.of(code)].filter((name): name is string => Boolean(name));
    if (names.length) regions.set(code, names.map(name => normalize(name)));
  }
}

// 排除问句结构和泛称。业务词和库名无需维护在客户端。
const filler = new Set('请问 帮我 请帮 根据 关于 相关 有关 公司 本公司 股份 本地 内部 知识库 文档 资料 信息 内容 条款 依据 一般 通常 常见 可能 具体 对应 地区 国家 哪些 什么 多少 怎么 如何 是否 为何 为什么 怎样 需要 要求 规定 有哪些 多大 今天 以及 及其 或者 还有 并且 同时 what which how many much the is are was of in for to on please average typical'.split(' '));
const lowSpecificity = new Set('问题 情况 处理 方法 方式 步骤 失败 报错 说明 概况 标准 规范 等级 水平 参数 指标 数值 requirement requirements level'.split(' '));
const connectors = new Set(['和', '与', '及', '及其', '以及', '并且', '还有', 'and']);

function normalize(text: string) { return text.normalize('NFKC').toLowerCase().replace(/(?<=\p{Script=Han})\s+(?=\p{Script=Han})/gu, '').trim(); }
function compact(text: string) { return normalize(text).replace(/[^\p{L}\p{N}]/gu, ''); }

export function standaloneCalculation(query: string) {
  const original = normalize(query).replace(/\s+/gu, '');
  // 裸日期、版本号和编号可能含横线或斜线。只有明确求值或有明显运算符时才跳过查库。
  if (!/[+×*÷%^]|计算|算一下|求值|等于|是多少|=/u.test(original)) return false;
  const expression = original
    .replace(/^(?:请问|请)?(?:计算(?:一下)?|算一下|求值)?[:：]?/u, '')
    .replace(/(?:等于(?:多少|几)|是多少|等于|=)?[?。!]?$/u, '');
  return /^[-−+]?(?:\d|\()[\d.+\-−×*÷/%^()]*[+\-−×*÷/%^][\d.()]+$/u.test(expression);
}

function contains(text: string, term: string) {
  if (/\p{Script=Han}/u.test(term)) return text.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'u').test(text);
}

function queryParts(query: string) {
  const parts: string[] = [];
  let part = '';
  for (const word of words.segment(query)) {
    if (connectors.has(word.segment) || /^[、；;]$/u.test(word.segment)) {
      if (part.trim()) parts.push(part);
      part = '';
    } else part += word.segment;
  }
  if (part.trim()) parts.push(part);
  return parts;
}

function keywords(text: string, omit: ReadonlySet<string>) {
  const keys = new Set<string>();
  let singles = '';
  function add(term: string) {
    if (term.length >= 2 && !filler.has(term) && !omit.has(term) && !/^\d+$/u.test(term)) keys.add(term);
  }
  for (const token of words.segment(text)) {
    if (token.isWordLike && /^\p{Script=Han}$/u.test(token.segment) && !/^[的了是都在中里对从为把等有吗呢几啥]$/u.test(token.segment)) {
      singles += token.segment;
      continue;
    }
    add(singles);
    singles = '';
    if (token.isWordLike) add(token.segment);
  }
  add(singles);
  const specific = [...keys].filter(key => !lowSpecificity.has(key));
  // 例如「乌拉圭概况」仍可用「概况」定位，避免全部词被移除。
  return specific.length ? specific : [...keys];
}

export interface EvidenceText {
  text: string;
  documentName: string;
}

export function evidenceScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : -1;
}

function standardRefs(text: string) {
  return [...text.matchAll(/\b((?:iec|ieee|iso|gb(?:\s*\/\s*t)?|dl\s*\/\s*t|nb\s*\/\s*t)\s*\d+(?:[.-]\d+)*)(?::(\d{4}))?/gu)]
    .map(match => ({ id: match[1].replace(/\s+/gu, ''), year: match[2] }));
}

/** 检查正文中的主题词，并用正文或文件名核对显式国家和完整标准编号。 */
export function checkEvidence(query: string) {
  const normalized = normalize(query);
  const exact = compact(normalized);
  const wordSet = new Set([...words.segment(normalized)].map(part => part.segment));
  const quoted = exact.length >= 55 && !/[？?]|\b(?:how|what|compare|which)\b|多少|怎么|如何|请问|有哪些|是否/u.test(normalized);
  const scopes = quoted ? [] : [...regions.values()].filter(names => names.some(name =>
    /\p{Script=Han}/u.test(name) ? wordSet.has(name) || (name.length >= 3 && normalized.includes(name)) : contains(normalized, name),
  ));
  const omit = new Set(scopes.flatMap(names => names.flatMap(name => [...words.segment(name)].map(part => part.segment))));
  const standards = standardRefs(normalized);
  for (const term of ['iec', 'ieee', 'iso', 'gb', 'dl', 'nb']) if (standards.length) omit.add(term);
  const pieces = queryParts(normalized);
  const short = !quoted && pieces.length > 1 && pieces.length <= 5;
  const groups = (short ? pieces : [normalized]).map(part => keywords(part, omit)).filter(group => group.length);

  function matches({ text, documentName }: EvidenceText): number[] {
    const body = normalize(text);
    if (!body) return [];
    const source = `${normalize(documentName)}\n${body}`;
    if (scopes.length && !scopes.some(names => names.some(name => contains(source, name)))) return [];
    if (standards.length && !standards.some(required => standardRefs(source).some(actual => actual.id === required.id && (!required.year || actual.year === required.year)))) return [];
    if (exact.length >= 4 && compact(body).includes(exact)) return groups.length ? groups.map((_, index) => index) : [0];
    if (!groups.length) return scopes.length || standards.length ? [0] : [];
    return groups.flatMap((group, index) => {
      if (!group.some(term => contains(body, term))) return [];
      const found = group.filter(term => contains(body, term) || (/^[a-z][a-z0-9-]+$/u.test(term) && contains(source, term))).length;
      const required = group.length <= 2 ? group.length : Math.ceil(group.length / 2);
      return found >= required ? [index] : [];
    });
  }

  function summarize(items: readonly EvidenceText[]) {
    const covered = new Set(items.flatMap(matches));
    const missingTopics = groups.length > 1 ? groups.flatMap((group, index) => covered.has(index) ? [] : [group.join('／')]) : [];
    return { status: !covered.size ? 'none' as const : missingTopics.length ? 'partial' as const : 'matched' as const, missingTopics };
  }

  return { matches, summarize };
}
