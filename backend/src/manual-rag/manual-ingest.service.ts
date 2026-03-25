import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ManualChunkingService } from './manual-chunking.service';
import { ManualMetadataService } from './manual-metadata.service';
import { ManualChromaService } from './manual-chroma.service';

@Injectable()
export class ManualIngestService {
  private readonly logger = new Logger(ManualIngestService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly chunking: ManualChunkingService,
    private readonly metadata: ManualMetadataService,
    private readonly chroma: ManualChromaService,
  ) {}

  /** MANUAL_MD_PATH 또는 backend CWD 기준 ../docs/USER_MANUAL.md */
  resolveManualPath(): string {
    const custom = this.config.get<string>('MANUAL_MD_PATH');
    if (custom && existsSync(custom)) return custom;
    if (custom) {
      this.logger.warn(
        `MANUAL_MD_PATH set but file missing: ${custom}, falling back`,
      );
    }
    const fallback = join(process.cwd(), '..', 'docs', 'USER_MANUAL.md');
    return fallback;
  }

  async reindex(): Promise<{ count: number; manualPath: string }> {
    const manualPath = this.resolveManualPath();
    if (!existsSync(manualPath)) {
      throw new Error(`USER_MANUAL.md not found at: ${manualPath}`);
    }
    const raw = readFileSync(manualPath, 'utf-8');
    this.logger.log(`Loaded manual (${raw.length} chars) from ${manualPath}`);

    const chunks = await this.chunking.chunkManualMarkdown(raw);
    this.logger.log(`After chunking: ${chunks.length} documents`);

    const overridesPath = this.config.get<string>(
      'MANUAL_CHUNK_OVERRIDES_PATH',
    );
    const { documents, ids } = this.metadata.enrichDocuments(
      chunks,
      overridesPath,
    );

    const result = await this.chroma.replaceCollection(documents, ids);
    return { count: result.count, manualPath };
  }
}
