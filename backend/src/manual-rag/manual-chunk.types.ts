/**
 * Chroma에 저장하는 청크 메타데이터 (배열·객체는 JSON 문자열)
 */
export interface ChromaChunkMetadata {
  doc_id: string;
  doc_title: string;
  source_file: string;
  version: string;
  language: string;
  domain: string;
  chunk_id: string;
  section: string;
  subsection: string;
  content_type: string;
  feature: string;
  tool: string;
  language_content: string;
  topic_json: string;
  tags_json: string;
  question_type_json: string;
  retrieval_hints_json: string;
  priority: number;
  confidence_hint: string;
  updated_at: string;
  chunk_index: number;
}

/** manual_chunk_overrides.json 항목 */
export interface ManualChunkOverride {
  match: {
    subsection?: string;
    section?: string;
  };
  merge: Partial<{
    content_type: string;
    feature: string;
    tool: string;
    language: string;
    topic: string[];
    tags: string[];
    question_type: string[];
    retrieval_hints: string[];
    priority: number;
    confidence_hint: string;
  }>;
}

export interface ManualChunkOverridesFile {
  overrides: ManualChunkOverride[];
}
