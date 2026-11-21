import type { EvidenceSynonym } from './contracts.ts';

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
for (const term of ['我该', '怎么办', '分别', '比较', '对比', '能报', '回来了', '回来']) filler.add(term);

const partObject = /配置型(?:原)?材料件|配置型原材料|配置材料件|材料件变型件/u;
const travelObject = /差旅|出差|酒店|住宿|宾馆/u;
const lodging = /酒店|住宿|宾馆/u;
const expense = /报账|报销|报多少|能报|费用.{0,4}流程/u;
const amount = /上限|限额|标准|最多|封顶|多少/u;
const process = /流程|步骤|申请|审批|凭证|发票|办理|提交|填写/u;
const vendor = /供应商|采购|应付账款/u;
const accounts = /入账|账务|记账|会计凭证/u;

interface BusinessIntent {
  canonical: string;
  libraryHint: RegExp;
  verify(body: string): 'direct' | 'related' | undefined;
}

function businessIntent(query: string): BusinessIntent | undefined {
  if (partObject.test(query)) {
    const state = /未创建|没有创建|没创建|尚未创建/u.test(query) ? /未创建|没有创建|没创建|尚未创建|变型件未创建/u
      : /正在工作|未发布/u.test(query) ? /正在工作|未发布/u
        : /没有配置|未找到|未查找到/u.test(query) ? /没有配置|未找到|未查找到/u : undefined;
    return { canonical: 'PLM 配置型材料件', libraryHint: /plm|配置型材料件|导图报错/u,
      verify: body => partObject.test(body) && (process.test(body) || /处理|创建|发布|报错/u.test(body))
        ? !state || state.test(body) ? 'direct' : 'related' : undefined };
  }
  if (accounts.test(query) && vendor.test(query)) {
    return { canonical: '供应商发票入账', libraryHint: /供应商结算|财务入账|会计核算|应付账款/u,
      verify: body => vendor.test(body) && accounts.test(body) && /发票|财务|会计/u.test(body) ? 'direct' : undefined };
  }
  if (travelObject.test(query) && expense.test(query)) {
    const isLodging = lodging.test(query);
    const isLimit = isLodging && amount.test(query);
    const metric = /限额|上限|最高|封顶|最多|(?:\d|[一二三四五六七八九十百千])\s*元/u;
    return {
      canonical: isLimit ? '差旅住宿费报销限额 住宿费标准' : isLodging ? '差旅住宿费报销流程' : '差旅费报销流程',
      libraryHint: /差旅|出差|费用报销/u,
      verify: body => travelObject.test(body) && (!isLodging || lodging.test(body))
        && (!vendor.test(body) || /差旅|出差/u.test(body))
        && (isLimit ? metric.test(body) : expense.test(body) && process.test(body)) ? 'direct' : undefined,
    };
  }
}

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
  documentVersion?: string;
  effectiveDate?: string;
}

export function evidenceScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : -1;
}

function standardRefs(text: string) {
  return [...text.matchAll(/\b((?:iec|ieee|iso|gb(?:\s*\/\s*t)?|dl\s*\/\s*t|nb\s*\/\s*t)\s*\d+(?:[.-]\d+)*)(?::(\d{4}))?/gu)]
    .map(match => ({ id: match[1].replace(/\s+/gu, ''), year: match[2] }));
}

type Standard = ReturnType<typeof standardRefs>[number];
type Topic = { terms: string[]; region?: string[]; standard?: Standard; intent?: BusinessIntent; label: string };
export type EvidenceDecision = { topics: number[]; directTopics: number[]; quality: number; reason: 'empty-text' | 'no-topic' | 'related' | 'direct' | 'semantic-direct' | 'semantic-unrelated' };

function namedRegions(text: string) {
  const wordSet = new Set([...words.segment(text)].map(part => part.segment));
  return [...regions.values()].filter(names => names.some(name =>
    /\p{Script=Han}/u.test(name) ? wordSet.has(name) || (name.length >= 3 && text.includes(name)) : contains(text, name),
  ));
}

function regionEvidence(title: string, body: string, names: string[], terms: string[]) {
  const titled = namedRegions(title);
  const heading = body.split(/[:：。！\n]/u, 1)[0];
  const lead = titled.length ? titled : namedRegions(heading);
  if (lead.length === 1) return lead[0] === names;
  if (lead.length > 1) {
    return body.split(/[。！；;\n]/u).some(line => {
      const subjects = namedRegions(line);
      return subjects.length === 1 && subjects[0] === names && (!terms.length || terms.some(term => contains(line, term)));
    });
  }
  return names.some(name => contains(body, name));
}

/** 检查正文中的主题词，并用正文或文件名核对显式国家和完整标准编号。 */
export function checkEvidence(query: string, synonyms: readonly EvidenceSynonym[] = []) {
  const original = normalize(query);
  const active = synonyms.map(rule => ({
    term: normalize(rule.term), aliases: rule.aliases.map(normalize).sort((a, b) => b.length - a.length), context: rule.context.map(normalize),
  })).filter(rule => rule.context.some(term => contains(original, term)) && [rule.term, ...rule.aliases].some(term => contains(original, term)));
  const replaceAliases = (text: string) => active.reduce((content, rule) => {
    if (content.includes(rule.term)) return content;
    for (const alias of rule.aliases) {
      if (!contains(content, alias)) continue;
      const escaped = alias.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
      const pattern = /\p{Script=Han}/u.test(alias) ? escaped : '(?<![a-z0-9])' + escaped + '(?![a-z0-9])';
      content = content.replace(new RegExp(pattern, 'gu'), () => rule.term);
    }
    return content;
  }, text);
  const normalized = replaceAliases(original);
  const exact = compact(normalized);
  const quoted = exact.length >= 55 && !/[？?]|\b(?:how|what|compare|which)\b|多少|怎么|如何|请问|有哪些|是否/u.test(normalized);
  const scopes = quoted ? [] : namedRegions(normalized);
  const standards = standardRefs(normalized);
  const editionYear = normalized.match(/(?:版本|版次|生效日期|适用年份)\s*[:：为]?\s*(20\d\d)|\b(20\d\d)(?:年)?版/u);
  const year = editionYear?.[1] ?? editionYear?.[2];
  const requestedDate = normalized.match(/(?:生效(?:日期)?|适用日期)\s*[:：为]?\s*(20\d\d)[年./-](\d{1,2})[月./-](\d{1,2})/u);
  const day = requestedDate?.slice(1).map(value => value.padStart(2, '0')).join('-');
  const pieces = quoted ? [normalized] : queryParts(normalized);
  const clarification = /^(?:请问|请帮我|帮我)?(?:怎么|如何)?报账(?:怎么弄|流程|怎么做|怎么办)?[?。!？]*$/u.test(normalized)
    ? '请先确认是员工费用报销、供应商结算，还是财务入账。' : undefined;
  const omit = new Set(scopes.flatMap(names => names.flatMap(name => [...words.segment(name)].map(part => part.segment))));
  if (standards.length) for (const term of ['iec', 'ieee', 'iso', 'gb', 'dl', 'nb']) omit.add(term);
  const parts = pieces.map(piece => ({
    terms: keywords(piece.replace(/\b(?:iec|ieee|iso|gb(?:\s*\/\s*t)?|dl\s*\/\s*t|nb\s*\/\s*t)\s*\d+(?:[.-]\d+)*(?::\d{4})?/gu, ''), omit),
    regions: quoted ? [] : namedRegions(piece), standards: standardRefs(piece), intent: businessIntent(piece),
  }));
  const topics: Topic[] = [];
  let currentRegions: string[][] = [];
  let currentStandards: Standard[] = [];
  let awaitingTerms = false;
  for (const part of parts) {
    if (part.regions.length) currentRegions = awaitingTerms ? [...new Set([...currentRegions, ...part.regions])] : part.regions;
    if (part.standards.length) currentStandards = awaitingTerms ? [...currentStandards, ...part.standards] : part.standards;
    if (!part.terms.length && !part.intent) { awaitingTerms = true; continue; }
    awaitingTerms = false;
    for (const region of currentRegions.length ? currentRegions : [undefined]) {
      for (const standard of currentStandards.length ? currentStandards : [undefined]) {
        const scope = [scopes.length > 1 ? region?.[0] : undefined, standards.length > 1 ? standard?.id : undefined].filter(Boolean);
        topics.push({ terms: part.terms, region, standard, intent: part.intent, label: [...scope, part.intent?.canonical ?? part.terms.join('／')].filter(Boolean).join(' · ') });
      }
    }
  }
  if (!topics.length && (scopes.length || standards.length)) {
    for (const region of scopes.length ? scopes : [undefined]) {
      for (const standard of standards.length ? standards : [undefined]) {
        topics.push({ terms: [], region, standard, label: region?.[0] ?? standard?.id ?? '' });
      }
    }
  }

  function compatible({ text, documentName, documentVersion, effectiveDate }: EvidenceText) {
    const rawBody = normalize(text);
    const body = active.some(rule => rule.context.some(term => contains(rawBody, term))) ? replaceAliases(rawBody) : rawBody;
    if (!body || clarification) return { body, indices: [] };
    const title = normalize(documentName);
    const source = title + '\n' + body;
    if ((day && effectiveDate !== day) || (year && ![documentVersion, effectiveDate, title].some(value => value?.includes(year)) &&
        !source.match(new RegExp(year + '(?:年)?(?:版|修订|生效)|(?:生效日期|版本)\\s*[:：]?\\s*' + year, 'u')))) {
      return { body, indices: [] };
    }
    const actualStandards = standards.length ? standardRefs(source) : [];
    const indices = topics.flatMap((topic, index) => {
      if (topic.region && !regionEvidence(title, body, topic.region, topic.terms)) return [];
      const standard = topic.standard;
      if (standard && !actualStandards.some(actual => actual.id === standard.id && (!standard.year || actual.year === standard.year))) return [];
      return [index];
    });
    return { body, indices: topics.length ? indices : [0] };
  }

  function evaluate(item: EvidenceText): EvidenceDecision {
    const { body, indices } = compatible(item);
    if (!body) return { topics: [], directTopics: [], quality: 0, reason: 'empty-text' };
    const exactMatch = exact.length >= 4 && compact(body).includes(exact);
    const accepted: number[] = [];
    const directTopics: number[] = [];
    for (const index of indices) {
      const topic = topics[index];
      if (!topic) continue;
      if (topic.intent) {
        const match = topic.intent.verify(body);
        if (!match) continue;
        if (match === 'direct') directTopics.push(index);
      } else {
        const found = topic.terms.filter(term => contains(body, term));
        const required = topic.terms.length <= 3 ? topic.terms.length : Math.ceil(topic.terms.length * 0.7);
        if (!exactMatch && found.length < required) continue;
        directTopics.push(index);
      }
      accepted.push(index);
    }
    if (!topics.length && indices.length && exactMatch) { accepted.push(0); directTopics.push(0); }
    const quality = directTopics.length ? 2 : accepted.length ? 1 : 0;
    return { topics: accepted, directTopics, quality, reason: quality === 2 ? 'direct' : quality === 1 ? 'related' : 'no-topic' };
  }
  const matches = (item: EvidenceText) => evaluate(item).topics;

  function summarizeDecisions(decisions: readonly EvidenceDecision[]) {
    const covered = new Set(decisions.flatMap(result => result.directTopics));
    const any = decisions.some(result => result.topics.length);
    const missingTopics = topics.length > 1 || any ? topics.flatMap((topic, index) => covered.has(index) ? [] : [topic.label]) : [];
    return { status: !any ? 'none' as const : missingTopics.length ? 'partial' as const : 'matched' as const, missingTopics };
  }

  const intents = topics.flatMap(topic => topic.intent ? [topic.intent] : []);
  const alternativeTerms = [...new Set([...intents.map(intent => intent.canonical), ...active.map(rule => rule.term)]
    .filter(term => !original.includes(normalize(term))))];
  return {
    matches, evaluate, summarize: (items: readonly EvidenceText[]) => summarizeDecisions(items.map(evaluate)), summarizeDecisions, clarification,
    // Known business anchors also keep a semantic decision from upgrading a different procedure.
    semanticTopics: (item: EvidenceText) => {
      const { body, indices } = compatible(item);
      return indices.filter(index => {
        const intent = topics[index]?.intent;
        return !intent || intent.verify(body) === 'direct';
      });
    },
    confident: (item: EvidenceText) => {
      const body = compact(item.text);
      const direct = evaluate(item).directTopics;
      return direct.length > 0 && direct.every(index => {
        const topic = topics[index];
        return Boolean(topic?.intent || topic?.region || topic?.standard || (exact.length >= 6 && body.includes(exact))
          || (topic?.terms ?? []).some(term => term.length >= 4 && body.includes(compact(term))));
      });
    },
    semanticQueryTopics: topics.length ? topics.map((topic, index) => ({ index, label: topic.label })) : [{ index: 0, label: '原问题' }],
    diagnosticTopics: topics.map((topic, index) => ({ index, country: topic.region?.[0], standard: topic.standard?.id, intent: topic.intent?.canonical })),
    supplement: alternativeTerms.length ? [query, ...alternativeTerms].join(' ') : undefined,
    libraryPriority: (library: { name: string; description?: string }) => intents.some(intent => intent.libraryHint.test(normalize(library.name + ' ' + (library.description ?? '')))),
  };
}
