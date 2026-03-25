import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ManualChunkingService } from './manual-chunking.service';
import { ManualMetadataService } from './manual-metadata.service';
import { ManualChromaService } from './manual-chroma.service';
import { ManualEmbeddingsService } from './manual-embeddings.service';
import { ManualIngestService } from './manual-ingest.service';
import { ManualRagQueryService } from './manual-rag-query.service';
import { ManualRagController } from './manual-rag.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ManualRagController],
  providers: [
    ManualChunkingService,
    ManualMetadataService,
    ManualEmbeddingsService,
    ManualChromaService,
    ManualRagQueryService,
    ManualIngestService,
  ],
  exports: [ManualIngestService, ManualChunkingService, ManualMetadataService],
})
export class ManualRagModule {}
