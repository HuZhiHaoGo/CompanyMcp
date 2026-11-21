export type JsonRecord = Record<string, unknown>;

/** JSON 入口先检查实际结构，再访问字段；平台可以返回暂不识别的字段。 */
export function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function hasCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

export type Mode = 'mock' | 'live';
export type Fetcher = typeof fetch;

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
}

export interface PlatformConfig {
  baseUrl: string;
  searchPath: string;
  listPath: string;
  chunkPath: string;
  rankScoreThreshold: number;
  projectId?: string;
  accessKey?: string;
  secretKey?: string;
  rerankModelName?: string;
  timeoutMs?: number;
  assetAuth?: string;
  assetApiKey?: string;
}

export interface RetrievalConfig {
  perLibraryTop: number;
  libraryTimeoutMs: number;
  roundTimeoutMs: number;
  evidenceScoreThreshold?: number;
  diagnostics?: boolean;
  synonyms?: EvidenceSynonym[];
  semanticReview?: boolean;
  semanticModelOrigins?: string[];
}

export interface EvidenceSynonym {
  term: string;
  aliases: string[];
  context: string[];
}

export interface Limits {
  top: number;
  maxEvidenceChunks: number;
  maxQueryCharacters: number;
  maxTextCharacters: number;
  maxImageBytes: number;
  maxCacheBytes: number;
  maxSnapshots: number;
}

export interface ServiceConfig extends JsonRecord {
  mode: Mode;
  port: number;
  serviceToken: string;
  dataDirectory: string;
  service?: { autoStart?: boolean };
  autoRetrieveKnowledge: boolean;
  platform: PlatformConfig;
  knowledgeDirectory: { mode: 'auto' | 'static'; refreshSeconds: number };
  knowledgeBases: KnowledgeBase[];
  retrieval: RetrievalConfig;
  limits: Limits;
  documentPreview?: DocumentPreviewConfig;
}

export interface DocumentPreviewConfig {
  enabled: boolean;
  pdfInfo?: string;
  pdfToPpm?: string;
  office?: string;
  converters: Partial<Record<string, string>>;
}

export interface Coverage {
  completed: number;
  requested: number;
  available?: number;
}

export interface TableCell {
  text: string;
  colSpan: number;
  rowSpan: number;
  header: boolean;
}

export interface CitationImage {
  id: string;
  url: string;
  caption: string;
}

export interface Citation {
  citationId: string;
  chunkId: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  documentId: string;
  documentName: string;
  documentGroupId?: string;
  documentVersion?: string;
  effectiveDate?: string;
  page?: number;
  // 平台分数允许缺失或格式异常，排序和界面使用前分别进行判断。
  score?: unknown;
  content: string;
  tables: { rows: TableCell[][] }[];
  images: CitationImage[];
  modelText: string;
  source: JsonRecord;
  semanticEvidence?: SemanticProof;
  equivalentSources?: Citation[];
}

export interface SemanticProof {
  fingerprint: string;
  topics: number[];
  quote: string;
}

export interface Snapshot {
  schema: 'tbea-snapshot/v1';
  id: string;
  mode: Mode;
  query: string;
  createdAt: string;
  totalCount: number | string;
  coverage?: Coverage;
  retrievalSkipped?: boolean;
  semanticClarification?: boolean;
  citations: Citation[];
}

export type PublicCitation = Omit<Citation, 'source' | 'modelText' | 'images' | 'semanticEvidence' | 'equivalentSources'> & {
  images: Omit<CitationImage, 'url'>[];
};

export type PublicSnapshot = Omit<Snapshot, 'citations'> & {
  citations: (PublicCitation & { equivalentSources: PublicCitation[] })[];
};

export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
export interface ImageData {
  type: ImageType;
  bytes: Buffer;
}

export function isImageType(value: unknown): value is ImageType {
  return value === 'image/png' || value === 'image/jpeg' || value === 'image/webp' || value === 'image/gif';
}
