import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChromaClient } from 'chromadb';
import { ChromaChunkMetadata } from './manual-chunk.types';
import { ManualEmbeddingsService } from './manual-embeddings.service';

function flattenForChroma(
  m: ChromaChunkMetadata,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(m)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

@Injectable()
export class ManualChromaService {
  private readonly logger = new Logger(ManualChromaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly manualEmbeddings: ManualEmbeddingsService,
  ) {}

  /**
   * 컬렉션 삭제 후 문서 전체 재적재
   */
  async replaceCollection(
    documents: Document[],
    ids: string[],
  ): Promise<{ count: number }> {
    const url = this.config.get<string>('CHROMA_URL', 'http://127.0.0.1:8000');
    const collectionName = this.config.get<string>(
      'CHROMA_COLLECTION_NAME',
      'api_gateway_user_manual',
    );

    const client = new ChromaClient({ path: url });
    try {
      await client.deleteCollection({ name: collectionName });
      this.logger.log(`Deleted Chroma collection: ${collectionName}`);
    } catch (e) {
      this.logger.warn(
        `Could not delete collection (may not exist or Chroma down): ${e instanceof Error ? e.message : e}`,
      );
    }

    const embeddings = this.manualEmbeddings.createEmbeddings();

    const docsForStore = documents.map((d) => {
      const meta = d.metadata as unknown as ChromaChunkMetadata;
      return new Document({
        pageContent: d.pageContent,
        metadata: flattenForChroma(meta),
      });
    });

    const store = new Chroma(embeddings, {
      collectionName,
      url,
    });

    await store.addDocuments(docsForStore, { ids });
    this.logger.log(
      `Upserted ${docsForStore.length} chunks into ${collectionName}`,
    );
    return { count: docsForStore.length };
  }
}
