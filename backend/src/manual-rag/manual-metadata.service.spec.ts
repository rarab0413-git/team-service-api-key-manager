import { Test } from '@nestjs/testing';
import { Document } from '@langchain/core/documents';
import { ManualMetadataService } from './manual-metadata.service';

describe('ManualMetadataService', () => {
  let service: ManualMetadataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ManualMetadataService],
    }).compile();
    service = moduleRef.get(ManualMetadataService);
  });

  it('marks code_example when fence present', () => {
    const docs = [
      new Document({
        pageContent: '## S\n\n### T\n\n```bash\necho hi\n```',
        metadata: { section: 'S', subsection: 'T' },
      }),
    ];
    const { metadatas } = service.enrichDocuments(docs, undefined);
    expect(metadatas[0].content_type).toBe('code_example');
    expect(metadatas[0].tool).toBe('curl');
  });

  it('detects n8n feature in content', () => {
    const docs = [
      new Document({
        pageContent: 'n8n에서 Base URL을 설정',
        metadata: { section: '5. API', subsection: '5.2 n8n' },
      }),
    ];
    const { metadatas } = service.enrichDocuments(docs, undefined);
    expect(metadatas[0].feature).toBe('n8n');
  });
});
