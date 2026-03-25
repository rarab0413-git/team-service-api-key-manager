/**
 * Chroma 서버가 떠 있고 OPENAI_API_KEY가 있을 때만 실행:
 * RUN_CHROMA_INTEGRATION=1 npm test -- manual-chroma.integration
 */
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { ManualChromaService } from './manual-chroma.service';
import { ManualEmbeddingsService } from './manual-embeddings.service';
import { ChromaChunkMetadata } from './manual-chunk.types';

const run = process.env.RUN_CHROMA_INTEGRATION === '1';

(run ? describe : describe.skip)('ManualChromaService integration', () => {
  let service: ManualChromaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
      ],
      providers: [ManualEmbeddingsService, ManualChromaService],
    }).compile();
    service = moduleRef.get(ManualChromaService);
  });

  it('replaces collection with one doc', async () => {
    const meta: ChromaChunkMetadata = {
      doc_id: 'test_doc',
      doc_title: 'Test',
      source_file: 't.md',
      version: '0',
      language: 'ko',
      domain: 'test',
      chunk_id: 'test-chunk-1',
      section: '1',
      subsection: '1.1',
      content_type: 'procedure',
      feature: 'test',
      tool: 'none',
      language_content: 'ko',
      topic_json: '[]',
      tags_json: '[]',
      question_type_json: '[]',
      retrieval_hints_json: '[]',
      priority: 1,
      confidence_hint: 'high',
      updated_at: '0',
      chunk_index: 0,
    };
    const doc = new Document({
      pageContent: 'hello chroma integration',
      metadata: meta as unknown as Record<string, unknown>,
    });
    const r = await service.replaceCollection([doc], ['test-chunk-1']);
    expect(r.count).toBe(1);
  });
});
