/**
 * CLI: npm run ingest:manual
 * (.env는 backend 디렉터리 기준 로드 — Nest ConfigModule과 동일)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ManualIngestService } from '../manual-ingest.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const ingest = app.get(ManualIngestService);
    const r = await ingest.reindex();
    // eslint-disable-next-line no-console
    console.log(`OK: ingested ${r.count} chunks from ${r.manualPath}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
