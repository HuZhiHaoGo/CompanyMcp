import { createHash } from 'node:crypto';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';
import type { Nodes } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { isRecord } from './contracts.ts';
import type { Citation, CitationImage, EvidenceSynonym, JsonRecord, KnowledgeBase, PublicCitation, PublicSnapshot, Snapshot, TableCell } from './contracts.ts';
import { checkEvidence, evidenceScore } from './evidence.ts';
import type { EvidenceDecision } from './evidence.ts';
import { verifiedSemanticDecision } from './semantic.ts';

type HtmlNode = DefaultTreeAdapterTypes.Node;
type Table = Citation['tables'][number];
const str = (...items: unknown[]) => items.find((item): item is string => typeof item === 'string' && Boolean(item.trim())) || '';
export const citationKnowledgeBaseId = (raw: unknown) => isRecord(raw) ? str(raw.knowledgebase_id, raw.knowledgeBaseId, raw.dataset_id) : '';
export const citationRawText = (raw: JsonRecord) => str(raw.content, raw.text, raw.chunk_content, raw.page_content);
export const citationDocumentName = (raw: JsonRecord) => str(raw.document_name, raw.title, isRecord(raw.meta) && raw.meta.title);
const children = (node: HtmlNode) => 'childNodes' in node ? node.childNodes : [];
const attr = (node: HtmlNode, name: string) => 'attrs' in node ? node.attrs.find(a => a.name === name)?.value || '' : '';
const tag = (node: HtmlNode) => 'tagName' in node ? node.tagName : '';
const parent = (node: HtmlNode) => 'parentNode' in node ? node.parentNode : null;
const text = (node: HtmlNode): string => 'value' in node ? node.value : tag(node) === 'br' ? '\n' : ['script', 'style', 'iframe'].includes(tag(node)) ? '' : children(node).map(text).join('');
function visit(node: HtmlNode, callback: (node: HtmlNode) => void) {
  callback(node);
  for (const child of children(node)) visit(child, callback);
}

/** 保留工程表达式的星号和转义竖线，不用 Markdown 富文本解释表格单元格。 */
function splitRow(line: string) {
  const cells = []; let cell = ''; let escaped = false;
  for (const c of line.trim().replace(/^\|/, '').replace(/\|$/, '')) {
    if (escaped) { cell += c === '|' ? '|' : `\\${c}`; escaped = false; }
    else if (c === '\\') escaped = true;
    else if (c === '|') { cells.push(cell.trim().replace(/\\n/g, '\n').replace(/<br\s*\/?\s*>/gi, '\n')); cell = ''; }
    else cell += c;
  }
  cells.push((cell + (escaped ? '\\' : '')).trim().replace(/\\n/g, '\n').replace(/<br\s*\/?\s*>/gi, '\n'));
  return cells;
}

function htmlParts(html: string, images: Omit<CitationImage, 'id'>[], tables: Table[]) {
  const root = parseFragment(html);
  const removed = new Set();
  visit(root, node => {
    if (tag(node) === 'img') {
      let figure = parent(node);
      while (figure && tag(figure) !== 'figure') figure = parent(figure);
      const caption = figure ? children(figure).find(x => tag(x) === 'figcaption') : null;
      const url = attr(node, 'src'); if (url) images.push({ url, caption: caption ? text(caption).trim() : attr(node, 'alt') || attr(node, 'title') }); removed.add(node);
    }
    if (tag(node) === 'figcaption') removed.add(node);
    if (['script', 'style', 'iframe'].includes(tag(node))) removed.add(node);
    if (tag(node) !== 'table') return;
    const rows: TableCell[][] = [];
    visit(node, tr => {
      if (tag(tr) !== 'tr') return;
      const row: TableCell[] = [];
      for (const td of children(tr).filter(x => ['td', 'th'].includes(tag(x)))) {
        row.push({ text: text(td).trim(), colSpan: Math.min(50, Math.max(1, Number(attr(td, 'colspan')) || 1)), rowSpan: Math.min(50, Math.max(1, Number(attr(td, 'rowspan')) || 1)), header: tag(td) === 'th' });
      }
      if (row.length) rows.push(row);
    });
    if (rows.length) tables.push({ rows });
    removed.add(node);
  });
  const readable = (node: HtmlNode): string => removed.has(node) ? '' : 'value' in node ? node.value : children(node).map(readable).join('') + (['p', 'div', 'br', 'li', 'figcaption'].includes(tag(node)) ? '\n' : '');
  return readable(root);
}

/** 同时解析 HTML 和 GFM；只输出纯文字/表格结构，浏览器从不执行切片原始 HTML。 */
export function normalizeCitation(raw: JsonRecord, index: number, snapshotId: string, catalog: readonly KnowledgeBase[] = []): Citation {
  let content = citationRawText(raw);
  // 部分平台样例把换行二次转义，仅当没有实际换行时解除一层，避免破坏表格转义。
  if (!content.includes('\n')) content = content.replace(/\\r\\n|\\n/g, '\n');
  const images: Omit<CitationImage, 'id'>[] = [];
  const tables: Table[] = [];
  const replacements: [number, number, string][] = [];
  const ast = fromMarkdown(content, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  function walk(node: Nodes) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (node.type === 'table' && start !== undefined && end !== undefined) {
      const source = content.slice(start, end);
      const lines = source.split(/\r?\n/);
      tables.push({ rows: [lines[0], ...lines.slice(2)].map((line, i) => splitRow(line).map(value => ({ text: value, colSpan: 1, rowSpan: 1, header: i === 0 }))) });
      replacements.push([start, end, '']); return;
    }
    if (node.type === 'image' && start !== undefined && end !== undefined) {
      images.push({ url: node.url, caption: node.alt || node.title || '' });
      replacements.push([start, end, '']); return;
    }
    if (node.type === 'html' && start !== undefined && end !== undefined) { replacements.push([start, end, htmlParts(node.value, images, tables)]); return; }
    if ('children' in node) for (const child of node.children) walk(child);
  }
  walk(ast);
  for (const [start, end, replacement] of replacements.sort((a, b) => b[0] - a[0])) content = content.slice(0, start) + replacement + content.slice(end);
  const imageFields: unknown[] = [...(Array.isArray(raw.images) ? raw.images : []), ...(Array.isArray(raw.imageUrls) ? raw.imageUrls : [])];
  for (const item of imageFields) {
    if (typeof item === 'string') images.push({ url: item, caption: '' });
    else if (isRecord(item)) images.push({ url: str(item.url, item.preview_url, item.src), caption: str(item.caption, item.title) });
  }
  const uniqueImages = [...new Map(images.filter(x => x.url).map(x => {
    try { const u = new URL(x.url); return [u.origin + u.pathname, x]; } catch { return [x.url, x]; }
  })).values()].map(x => ({ ...x, id: createHash('sha256').update(x.url.split('?')[0]).digest('hex').slice(0, 24) }));
  const kb = citationKnowledgeBaseId(raw);
  const meta = isRecord(raw.meta) ? raw.meta : {};
  const pageNumbers = isRecord(raw.locations) ? raw.locations.page_num : undefined;
  const firstPage: unknown = Array.isArray(pageNumbers) || typeof pageNumbers === 'string' ? pageNumbers[0] : isRecord(pageNumbers) ? pageNumbers[0] : undefined;
  const page = firstPage ?? raw.page_num ?? raw.page ?? meta.page;
  const documentVersion = str(raw.document_version, raw.documentVersion, raw.version, meta.version, raw.revision, meta.revision) || undefined;
  const date = str(raw.effective_date, raw.effectiveDate, meta.effectiveDate, meta.effective_date);
  const effectiveDate = /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(date) ? date.slice(0, 10) : undefined;
  // Only an explicit canonical source and edition establish identity across libraries.
  const originalId = str(raw.original_document_id, raw.originalDocumentId, meta.original_document_id, meta.originalDocumentId);
  const documentGroupId = originalId && documentVersion
    ? createHash('sha256').update(JSON.stringify([originalId, documentVersion, effectiveDate])).digest('hex')
    : undefined;
  const citationId = `K${snapshotId.slice(0, 8)}-${index + 1}`;
  const tableText = tables.map(t => t.rows.map(row => row.map(c => c.text).join(' | ')).join('\n')).join('\n\n');
  return { citationId, chunkId: str(raw.chunk_id, raw.chunkId, raw.id), knowledgeBaseId: kb, knowledgeBaseName: catalog.find(k => k.id === kb)?.name || kb,
    documentId: str(raw.document_id, raw.documentId), documentName: citationDocumentName(raw) || '知识库切片',
    documentGroupId, documentVersion, effectiveDate,
    page: Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : undefined,
    score: raw.rank_score ?? raw.rerank_score ?? raw.score, content: content.trim(), tables, images: uniqueImages,
    modelText: [content.trim(), tableText].filter(Boolean).join('\n\n'), source: raw };
}

export function publicSnapshot(snapshot: Snapshot, allowed?: ReadonlySet<string>): PublicSnapshot {
  const publicCitation = ({ source, modelText, semanticEvidence, equivalentSources, ...c }: Citation): PublicCitation => ({ ...c, images: c.images.map(({ url, ...image }) => image) });
  return { ...snapshot, citations: snapshot.citations.map(citation => ({
    ...publicCitation(citation),
    equivalentSources: (citation.equivalentSources || []).filter(c => !allowed || allowed.has(c.knowledgeBaseId)).map(publicCitation),
  })) };
}

/** 所有引用正文均为待核对的资料，而不是可执行指令；图片 URL 和字节不进入模型上下文。 */
export function modelResult(snapshot: Snapshot, maxCharacters: number, citations: readonly Citation[] = snapshot.citations, threshold = 0,
  synonyms?: readonly EvidenceSynonym[], report?: (citation: Citation, reason: string, truncated: boolean) => void) {
  let remaining = maxCharacters;
  const evidence = snapshot.mode === 'live' && !snapshot.retrievalSkipped ? checkEvidence(snapshot.query, synonyms) : undefined;
  const clarification = evidence?.clarification || (snapshot.semanticClarification ? '请补充要办理的具体事项、对象或适用场景。' : undefined);
  const decisions: EvidenceDecision[] = [];
  const projected = citations.flatMap(c => {
    const text = c.modelText.slice(0, remaining);
    const truncated = text.length < c.modelText.length;
    let supportingContext = false;
    // 旧快照和刷新后的详情也校验。被截断的正文只能依据实际发给模型的部分判断。
    if (evidence) {
      if (clarification || evidenceScore(c.source.rank_score) < threshold) {
        report?.(c, clarification ? 'clarification' : 'below-threshold', truncated);
        return [];
      }
      const input = { ...c, text };
      const proof = verifiedSemanticDecision({ ...input, text: c.modelText }, c.semanticEvidence, text);
      const scoped = proof ? evidence.semanticTopics(input) : [];
      const topics = proof?.topics.filter(topic => scoped.includes(topic)) ?? [];
      const decision = proof && topics.length ? { ...proof, topics, directTopics: topics } : evidence.evaluate(input);
      if (!decision.topics.length) {
        report?.(c, truncated ? 'rejected-after-truncation' : decision.reason, truncated);
        return [];
      }
      supportingContext = !decision.directTopics.length;
      decisions.push(decision);
    }
    remaining -= text.length;
    report?.(c, supportingContext ? 'sent-related' : 'sent', truncated);
    return [{ citationId: c.citationId, knowledgeBase: c.knowledgeBaseName, documentName: c.documentName, chunkId: c.chunkId, page: c.page,
      ...(supportingContext ? { support: 'related' as const } : {}),
      documentVersion: c.documentVersion, effectiveDate: c.effectiveDate, text, truncated }];
  });
  const assessment = snapshot.retrievalSkipped ? { status: 'not_needed' as const, missingTopics: [] } : evidence?.summarizeDecisions(decisions);
  const coverage = snapshot.coverage;
  const coverageNotice = coverage && coverage.completed < coverage.requested
    ? `本次仅完成 ${coverage.completed}/${coverage.requested} 个知识库的检索。回答时说明检索范围不完整，缺少依据时不得推断公司规定。`
    : '';
  let notice = snapshot.mode === 'mock' ? '演示资料，不可作为实际设计依据。' : '切片是待核对的公司知识库资料。用 [文档名](citationId) 标注能直接支持结论的切片，使用本轮真实编号。围绕所问章节作答，核对对象、适用条件和版本，不根据图片推断。公司知识库资料标为公司知识库来源，时效性结论紧邻标注可核实的资料日期。版本冲突时分别说明依据和适用条件。';
  if (coverage?.available && coverage.available > coverage.requested) notice += '本轮优先检索了与问题相关的授权知识库。';
  if (clarification) notice += clarification;
  else if (assessment?.status === 'none') notice += '本次未找到能支持问题的公司资料。明确说明依据不足，不把通用知识当作公司规定。';
  if (assessment?.status === 'partial') notice += '部分事项缺少公司资料。仅回答有直接依据的部分，并明确列出缺少依据的事项。';
  if (projected.some(c => c.support === 'related')) notice += '标记为 related 的切片只提供背景或适用范围线索。引用具体标准或金额前，须核对适用条件有直接依据。';
  if (assessment?.status === 'not_needed') notice = '此问题是独立算术题，无需公司知识库，请直接计算回答。';
  return { schema: 'tbea-knowledge/v1' as const, snapshotId: snapshot.id, query: snapshot.query, hitCount: projected.length, totalCount: snapshot.totalCount, mode: snapshot.mode,
    coverage, ...(assessment && { evidenceStatus: assessment.status, missingTopics: assessment.missingTopics }),
    ...(clarification ? { clarification } : {}), notice: notice + coverageNotice, citations: projected };
}
