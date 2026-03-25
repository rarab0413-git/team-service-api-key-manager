import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { readFileSync, existsSync } from 'fs';
import {
  ChromaChunkMetadata,
  ManualChunkOverride,
  ManualChunkOverridesFile,
} from './manual-chunk.types';
import { MANUAL_DOC_MANIFEST } from './manual-document.constants';

const DEFAULT_PRIORITY = 2;
const DEFAULT_CONFIDENCE = 'medium';

@Injectable()
export class ManualMetadataService {
  private loadOverrides(path: string | undefined): ManualChunkOverride[] {
    if (!path || !existsSync(path)) return [];
    try {
      const raw = readFileSync(path, 'utf-8');
      const parsed = JSON.parse(raw) as
        | ManualChunkOverridesFile
        | ManualChunkOverride[];
      if (Array.isArray(parsed)) return parsed;
      return parsed.overrides ?? [];
    } catch {
      return [];
    }
  }

  private inferContentType(content: string): string {
    if (/```[\s\S]*```/.test(content)) return 'code_example';
    const lines = content.split('\n').filter((l) => l.trim().startsWith('|'));
    if (lines.length >= 3) return 'reference_table';
    if (
      content.includes('> ') ||
      content.includes('**중요**') ||
      content.includes('⚠️')
    )
      return 'warning_note';
    return 'procedure';
  }

  private inferToolAndLang(content: string): {
    tool: string;
    content_lang: string;
  } {
    const m = content.match(/```(\w+)/);
    if (m) {
      const lang = m[1].toLowerCase();
      const map: Record<string, { tool: string; content_lang: string }> = {
        bash: { tool: 'curl', content_lang: 'bash' },
        sh: { tool: 'shell', content_lang: 'bash' },
        python: { tool: 'python', content_lang: 'python' },
        typescript: { tool: 'typescript', content_lang: 'typescript' },
        ts: { tool: 'typescript', content_lang: 'typescript' },
      };
      return map[lang] ?? { tool: lang, content_lang: lang };
    }
    return { tool: 'web_ui', content_lang: 'ko' };
  }

  private inferFeature(
    section: string,
    subsection: string,
    content: string,
  ): string {
    const blob = `${section} ${subsection} ${content}`.toLowerCase();
    if (blob.includes('n8n')) return 'n8n';
    if (
      blob.includes('가상') ||
      blob.includes('team-sk') ||
      blob.includes('virtual')
    )
      return 'virtual_key';
    if (
      blob.includes('예산') ||
      blob.includes('과금') ||
      blob.includes('토큰') ||
      blob.includes('단가')
    )
      return 'budget';
    if (blob.includes('에러') || blob.includes('403') || blob.includes('401'))
      return 'error_handling';
    if (
      blob.includes('curl') ||
      blob.includes('/v1/chat') ||
      blob.includes('openai')
    )
      return 'chat';
    if (blob.includes('키 분실') || blob.includes('조회 요청'))
      return 'key_reveal';
    return 'api_key';
  }

  private inferTopics(
    section: string,
    subsection: string,
    content: string,
  ): string[] {
    const topics = new Set<string>();
    const blob = `${section} ${subsection}`;
    if (blob.includes('발급')) topics.add('api key 발급');
    if (blob.includes('n8n')) topics.add('n8n');
    if (content.includes('Base URL')) topics.add('gateway base url');
    if (blob.includes('가상')) topics.add('가상 키');
    if (blob.includes('예산')) topics.add('예산');
    return [...topics].length
      ? [...topics]
      : [subsection || section || 'manual'];
  }

  private inferQuestionTypes(contentType: string): string[] {
    if (contentType === 'code_example') return ['how_to', 'example'];
    return ['how_to', 'setup'];
  }

  private inferRetrievalHints(section: string, subsection: string): string[] {
    const hints: string[] = [];
    if (subsection) hints.push(subsection);
    if (section) hints.push(section);
    return hints.slice(0, 6);
  }

  private findOverride(
    overrides: ManualChunkOverride[],
    section: string,
    subsection: string,
  ): ManualChunkOverride['merge'] | undefined {
    for (const o of overrides) {
      const m = o.match;
      if (m.subsection && subsection.trim() === m.subsection.trim())
        return o.merge;
      if (m.section && section.trim() === m.section.trim()) return o.merge;
    }
    for (const o of overrides) {
      const m = o.match;
      if (m.subsection && subsection.includes(m.subsection)) return o.merge;
      if (m.section && section.includes(m.section)) return o.merge;
    }
    return undefined;
  }

  private slugify(s: string): string {
    return (
      s
        .toLowerCase()
        .replace(/[^\w\u3131-\u318E\uAC00-\uD7A3]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'chunk'
    );
  }

  enrichDocuments(
    docs: Document[],
    overridesPath?: string,
  ): {
    documents: Document[];
    metadatas: ChromaChunkMetadata[];
    ids: string[];
  } {
    const overrides = this.loadOverrides(overridesPath);
    const outDocs: Document[] = [];
    const metadatas: ChromaChunkMetadata[] = [];
    const ids: string[] = [];
    const counters: Record<string, number> = {};

    docs.forEach((doc, idx) => {
      const section = (doc.metadata.section as string) || '';
      const subsection = (doc.metadata.subsection as string) || '';
      const content = doc.pageContent;
      const contentType = this.inferContentType(content);
      const { tool, content_lang } = this.inferToolAndLang(content);
      const feature = this.inferFeature(section, subsection, content);
      const topic = this.inferTopics(section, subsection, content);
      const question_type = this.inferQuestionTypes(contentType);
      const retrieval_hints = this.inferRetrievalHints(section, subsection);
      const tags = [contentType, feature, tool].filter(Boolean);

      const baseSlug = `${this.slugify(section)}-${this.slugify(subsection)}`;
      const key = baseSlug;
      counters[key] = (counters[key] || 0) + 1;
      const chunk_id = `manual-${String(idx + 1).padStart(3, '0')}-${baseSlug}-${counters[key]}`;

      let priority = DEFAULT_PRIORITY;
      let confidence_hint = DEFAULT_CONFIDENCE;
      let mergedTool = tool;
      let mergedFeature = feature;
      let mergedContentType = contentType;
      let mergedLang = content_lang;
      let mergedTopic = topic;
      let mergedTags = tags;
      let mergedQt = question_type;
      let mergedHints = retrieval_hints;

      const ov = this.findOverride(overrides, section, subsection);
      if (ov) {
        if (ov.priority != null) priority = ov.priority;
        if (ov.confidence_hint) confidence_hint = ov.confidence_hint;
        if (ov.tool) mergedTool = ov.tool;
        if (ov.feature) mergedFeature = ov.feature;
        if (ov.content_type) mergedContentType = ov.content_type;
        if (ov.language) mergedLang = ov.language;
        if (ov.topic) mergedTopic = ov.topic;
        if (ov.tags) mergedTags = [...new Set([...mergedTags, ...ov.tags])];
        if (ov.question_type) mergedQt = ov.question_type;
        if (ov.retrieval_hints)
          mergedHints = [...new Set([...mergedHints, ...ov.retrieval_hints])];
        if (ov.topic) mergedTopic = ov.topic;
      }

      const chromaMeta: ChromaChunkMetadata = {
        doc_id: MANUAL_DOC_MANIFEST.doc_id,
        doc_title: MANUAL_DOC_MANIFEST.doc_title,
        source_file: MANUAL_DOC_MANIFEST.source_file,
        version: MANUAL_DOC_MANIFEST.version,
        language: MANUAL_DOC_MANIFEST.language,
        domain: MANUAL_DOC_MANIFEST.domain,
        chunk_id,
        section,
        subsection,
        content_type: mergedContentType,
        feature: mergedFeature,
        tool: mergedTool,
        language_content: mergedLang,
        topic_json: JSON.stringify(mergedTopic),
        tags_json: JSON.stringify(mergedTags),
        question_type_json: JSON.stringify(mergedQt),
        retrieval_hints_json: JSON.stringify(mergedHints),
        priority,
        confidence_hint,
        updated_at: MANUAL_DOC_MANIFEST.version,
        chunk_index: idx,
      };

      const docOut = new Document({
        pageContent: content,
        metadata: { ...chromaMeta } as unknown as Record<string, unknown>,
      });
      outDocs.push(docOut);
      metadatas.push(chromaMeta);
      ids.push(chunk_id);
    });

    return { documents: outDocs, metadatas, ids };
  }
}
