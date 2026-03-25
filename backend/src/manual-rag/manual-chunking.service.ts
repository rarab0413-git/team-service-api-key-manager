import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { TokenTextSplitter } from '@langchain/textsplitters';
import { protectBlocks, restorePlaceholders } from './manual-block-protector';

export interface HeaderSplitOptions {
  /** 목차 섹션(## 📋 목차) 본문을 RAG에서 제외 */
  skipTocSection?: boolean;
}

const DEFAULT_MAX_CHARS_BEFORE_TOKEN_SPLIT = 2500;
const TOKEN_CHUNK_SIZE = 450;
const TOKEN_CHUNK_OVERLAP = 60;

/**
 * 1차: ## / ### 헤더 기준 분리 (블록 보호 후)
 * 2차: 토큰 분할 (코드 펜스가 없는 긴 조각만)
 */
@Injectable()
export class ManualChunkingService {
  /**
   * 헤더 기준 1차 분할 (보호된 텍스트 기준)
   */
  splitByMarkdownHeaders(
    markdown: string,
    options?: HeaderSplitOptions,
  ): Document[] {
    const lines = markdown.split('\n');
    const docs: Document[] = [];
    let section = '';
    let subsection = '';
    const bodyLines: string[] = [];

    const flush = () => {
      const body = bodyLines.join('\n').trim();
      if (!section && !subsection) {
        bodyLines.length = 0;
        return;
      }
      if (options?.skipTocSection !== false && section.includes('목차')) {
        bodyLines.length = 0;
        return;
      }
      const parts: string[] = [];
      if (section) parts.push(`## ${section}`);
      if (subsection) parts.push(`### ${subsection}`);
      if (body) parts.push(body);
      const pageContent = parts.join('\n\n').trim();
      if (!pageContent) {
        bodyLines.length = 0;
        return;
      }
      docs.push(
        new Document({
          pageContent,
          metadata: {
            section: section || '',
            subsection: subsection || '',
          },
        }),
      );
      bodyLines.length = 0;
    };

    for (const line of lines) {
      if (/^##\s+/.test(line) && !/^###\s+/.test(line)) {
        flush();
        section = line.replace(/^##\s+/, '').trim();
        subsection = '';
      } else if (/^###\s+/.test(line)) {
        flush();
        subsection = line.replace(/^###\s+/, '').trim();
      } else {
        bodyLines.push(line);
      }
    }
    flush();
    return docs;
  }

  /**
   * 전체 파이프라인: 보호 → 헤더 분할 → 복원 → (긴 조각) 토큰 분할
   */
  async chunkManualMarkdown(
    rawMarkdown: string,
    maxCharsBeforeTokenSplit = DEFAULT_MAX_CHARS_BEFORE_TOKEN_SPLIT,
  ): Promise<Document[]> {
    const { text: protectedText, allPlaceholders } = protectBlocks(rawMarkdown);
    const headerDocs = this.splitByMarkdownHeaders(protectedText, {
      skipTocSection: true,
    });

    const restored = headerDocs.map(
      (d) =>
        new Document({
          pageContent: restorePlaceholders(d.pageContent, allPlaceholders),
          metadata: { ...d.metadata },
        }),
    );

    const splitter = new TokenTextSplitter({
      encodingName: 'cl100k_base',
      chunkSize: TOKEN_CHUNK_SIZE,
      chunkOverlap: TOKEN_CHUNK_OVERLAP,
    });

    const finalDocs: Document[] = [];
    for (const doc of restored) {
      const content = doc.pageContent;
      const hasFence = content.includes('```');
      if (!hasFence && content.length > maxCharsBeforeTokenSplit) {
        const pieces = await splitter.splitText(content);
        pieces.forEach((piece, idx) => {
          finalDocs.push(
            new Document({
              pageContent: piece,
              metadata: {
                ...doc.metadata,
                chunk_part: idx,
                chunk_parts: pieces.length,
              },
            }),
          );
        });
      } else {
        finalDocs.push(doc);
      }
    }
    return finalDocs;
  }
}
