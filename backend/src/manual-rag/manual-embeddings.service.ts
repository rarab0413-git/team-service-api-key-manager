import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';

/** OpenAI 클라이언트용: baseURL에 /v1 포함 */
export function normalizeOpenAiBaseUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, '');
  if (t.endsWith('/v1')) return t;
  return `${t}/v1`;
}

/**
 * USER_MANUAL 색인·RAG 검색이 동일한 임베딩 설정을 쓰도록 공통 생성
 */
@Injectable()
export class ManualEmbeddingsService {
  private readonly logger = new Logger(ManualEmbeddingsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * @throws 키가 없을 때 (메시지는 게이트웨이/직접 모드에 맞게)
   */
  createEmbeddings(): OpenAIEmbeddings {
    const gatewayBase = this.config
      .get<string>('EMBEDDING_GATEWAY_BASE_URL')
      ?.trim();
    const useGateway = Boolean(gatewayBase);

    const apiKey = useGateway
      ? this.config.get<string>('EMBEDDING_GATEWAY_API_KEY') ||
        this.config.get<string>('EMBEDDING_OPENAI_API_KEY')
      : this.config.get<string>('EMBEDDING_OPENAI_API_KEY') ||
        this.config.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error(
        useGateway
          ? 'EMBEDDING_GATEWAY_BASE_URL is set: provide EMBEDDING_GATEWAY_API_KEY or EMBEDDING_OPENAI_API_KEY (team-sk 가상 키)'
          : 'OPENAI_API_KEY or EMBEDDING_OPENAI_API_KEY is required for manual RAG',
      );
    }

    const model = this.config.get<string>(
      'EMBEDDING_MODEL',
      'text-embedding-3-small',
    );

    if (useGateway) {
      this.logger.debug(
        `Embeddings client → Gateway ${normalizeOpenAiBaseUrl(gatewayBase!)}`,
      );
    }

    return new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      model,
      ...(useGateway && gatewayBase
        ? {
            configuration: {
              baseURL: normalizeOpenAiBaseUrl(gatewayBase),
            },
          }
        : {}),
    });
  }
}
