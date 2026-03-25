import { Test } from '@nestjs/testing';
import { ManualChunkingService } from './manual-chunking.service';

const FIXTURE = `## 1. First section

### 1.1 Sub A
Line A

### 1.2 Sub B
Line B

## 2. Second

Body only
`;

describe('ManualChunkingService', () => {
  let service: ManualChunkingService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ManualChunkingService],
    }).compile();
    service = moduleRef.get(ManualChunkingService);
  });

  it('splitByMarkdownHeaders produces one doc per subsection block', () => {
    const docs = service.splitByMarkdownHeaders(FIXTURE, {
      skipTocSection: true,
    });
    const subs = docs.map((d) => d.metadata.subsection).filter(Boolean);
    expect(subs).toContain('1.1 Sub A');
    expect(subs).toContain('1.2 Sub B');
    expect(docs.some((d) => d.pageContent.includes('Line A'))).toBe(true);
  });

  it('chunkManualMarkdown keeps fenced block intact', async () => {
    const md = `## 5. Code

### 5.1 Example

Before

\`\`\`typescript
const long = "${'x'.repeat(4000)}";
\`\`\`

After
`;
    const docs = await service.chunkManualMarkdown(md, 500);
    const withCode = docs.find((d) => d.pageContent.includes('```typescript'));
    expect(withCode).toBeDefined();
    expect(withCode!.pageContent).toContain('const long');
  });
});
