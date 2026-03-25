import {
  Controller,
  Post,
  Headers,
  Body,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManualIngestService } from './manual-ingest.service';
import { ManualRagQueryService } from './manual-rag-query.service';
import {
  ManualRagChatDto,
  type ManualRagChatResponseDto,
} from './dto/manual-rag-chat.dto';

@Controller('api/manual-rag')
export class ManualRagController {
  constructor(
    private readonly ingest: ManualIngestService,
    private readonly query: ManualRagQueryService,
    private readonly config: ConfigService,
  ) {}

  /**
   * USER_MANUAL.md 재색인 → Chroma
   * 헤더: X-Manual-Rag-Secret: (MANUAL_RAG_REINDEX_SECRET 와 동일)
   */
  @Post('reindex')
  async reindex(@Headers('x-manual-rag-secret') secret: string | undefined) {
    const expected = this.config.get<string>('MANUAL_RAG_REINDEX_SECRET');
    if (!expected) {
      throw new ServiceUnavailableException(
        'MANUAL_RAG_REINDEX_SECRET is not set; reindex API is disabled',
      );
    }
    if (!secret || secret !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Manual-Rag-Secret');
    }
    return this.ingest.reindex();
  }

  /**
   * 매뉴얼 RAG 채팅 (로그인 사용자용, reindex와 달리 시크릿 헤더 불필요)
   */
  @Post('chat')
  async chat(@Body() dto: ManualRagChatDto): Promise<ManualRagChatResponseDto> {
    return this.query.chat(dto.message);
  }
}
