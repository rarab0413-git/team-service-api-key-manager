import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { ChatOpenAI } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ManualEmbeddingsService, normalizeOpenAiBaseUrl } from './manual-embeddings.service';
import type {
  ManualRagChatResponseDto,
  ManualRagChatSourceDto,
} from './dto/manual-rag-chat.dto';

const SYSTEM_PROMPT = `당신은 사용자 매뉴얼 전용 도우미입니다.
아래에 제공된 [컨텍스트]에 있는 내용만 근거로 한국어로 답하세요.
질문에 여러 주제가 섞여 있으면(예: 테스트·PoC 기간과 키 유효기간), 컨텍스트 안에서 주제별로 해당하는 문장·표를 찾아 종합해 답하세요.
컨텍스트에 없거나 확실하지 않으면 "매뉴얼에서 해당 정보를 찾을 수 없습니다. 관리자에게 문의 바랍니다."라고 말하세요.
추측하거나 컨텍스트 밖의 일반 지식으로 보완하지 마세요.`;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toAnswerText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: string }).text ?? '');
        }
        return '';
      })
      .join('')
      .trim();
  }
  return String(content ?? '').trim();
}

@Injectable()
export class ManualRagQueryService {
  private readonly logger = new Logger(ManualRagQueryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly manualEmbeddings: ManualEmbeddingsService,
  ) {}

  /**
   * 채팅 LLM: RAG_CHAT_GATEWAY_* 가 있으면 URL·키는 채팅 전용(임베딩 가상 키와 섞지 않음).
   * RAG_CHAT URL 없고 EMBEDDING_GATEWAY만 있으면 동일 호스트 + 임베딩용 키.
   * 둘 다 없으면 api.openai.com + OPENAI_API_KEY(sk-).
   */
  private createChatModel(): ChatOpenAI {
    const embeddingGateway = this.config
      .get<string>('EMBEDDING_GATEWAY_BASE_URL')
      ?.trim();
    const chatGatewayOnly = this.config
      .get<string>('RAG_CHAT_GATEWAY_BASE_URL')
      ?.trim();

    const gatewayBase = chatGatewayOnly || embeddingGateway;
    const useGateway = Boolean(gatewayBase);

    const embeddingVirtualKey =
      this.config.get<string>('EMBEDDING_GATEWAY_API_KEY')?.trim() ||
      this.config.get<string>('EMBEDDING_OPENAI_API_KEY')?.trim();

    // 게이트웨이는 team-sk 가상 키만 유효. OPENAI_API_KEY(sk-)로 폴백하면 401이 나기 쉬움.
    const apiKey = useGateway
      ? chatGatewayOnly
        ? this.config.get<string>('RAG_CHAT_GATEWAY_API_KEY')?.trim()
        : embeddingVirtualKey
      : this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        useGateway
          ? chatGatewayOnly
            ? 'RAG_CHAT_GATEWAY_BASE_URL is set: set RAG_CHAT_GATEWAY_API_KEY (채팅용 team-sk 가상 키). OPENAI_API_KEY(sk-)는 게이트웨이에 쓰이지 않습니다.'
            : 'EMBEDDING_GATEWAY_BASE_URL로 채팅 시: set EMBEDDING_GATEWAY_API_KEY or EMBEDDING_OPENAI_API_KEY (가상 키). OPENAI_API_KEY만으로는 게이트웨이 인증이 되지 않습니다.'
          : 'OPENAI_API_KEY is required for manual RAG chat (게이트웨이 미사용 시)',
      );
    }

    const model = this.config.get<string>(
      'MANUAL_RAG_CHAT_MODEL',
      'gpt-4.1-mini',
    );
    const timeoutMs = parsePositiveInt(
      this.config.get<string>('MANUAL_RAG_CHAT_TIMEOUT_MS'),
      60_000,
    );

    return new ChatOpenAI({
      model,
      temperature: 0.2,
      // BaseChatOpenAI는 openAIApiKey를 읽지 않음 — 미설정 시 env OPENAI_API_KEY만 쓰여 게이트웨이에 sk-가 나가 401
      apiKey,
      timeout: timeoutMs,
      maxRetries: 1,
      // 우리 게이트웨이는 /v1/chat/completions 만 제공 — Responses API 경로는 없음
      ...(useGateway ? { useResponsesApi: false } : {}),
      ...(useGateway && gatewayBase
        ? {
            configuration: {
              baseURL: normalizeOpenAiBaseUrl(gatewayBase),
            },
          }
        : {}),
    });
  }

  async chat(message: string): Promise<ManualRagChatResponseDto> {
    const url = this.config.get<string>('CHROMA_URL', 'http://127.0.0.1:8000');
    const collectionName = this.config.get<string>(
      'CHROMA_COLLECTION_NAME',
      'api_gateway_user_manual',
    );
    // 질문이 한 절(예: 6.0 PoC)과만 유사해 top-N이 한 소절에 몰리면 이웃 소절(예: 6.1 유효기간)이 빠질 수 있음 → 기본 k를 넉넉히
    const topK = parsePositiveInt(
      this.config.get<string>('MANUAL_RAG_TOP_K'),
      10,
    );

    const embeddings = this.manualEmbeddings.createEmbeddings();
    const store = new Chroma(embeddings, {
      collectionName,
      url,
    });

    let docs: Document[];
    try {
      docs = await store.similaritySearch(message, topK);
    } catch (e) {
      this.logger.error(
        `Chroma similaritySearch failed: ${e instanceof Error ? e.message : e}`,
      );
      throw e;
    }

    const sources: ManualRagChatSourceDto[] = docs.map((d) => {
      const m = d.metadata as Record<string, unknown>;
      return {
        chunkId: String(m.chunk_id ?? m.chunkId ?? ''),
        section: String(m.section ?? ''),
        subsection: String(m.subsection ?? ''),
      };
    });

    const contextBlocks = docs.map((d, i) => {
      const meta = d.metadata as Record<string, unknown>;
      const sid = String(meta.chunk_id ?? meta.chunkId ?? i + 1);
      return `[#${i + 1} chunk_id=${sid}]\n${d.pageContent}`;
    });
    const contextText = contextBlocks.join('\n\n---\n\n');

    const userBlock = `[컨텍스트]\n${contextText || '(검색 결과 없음)'}\n\n[질문]\n${message}`;

    const llm = this.createChatModel();
    const res = await llm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(userBlock),
    ]);

    return {
      answer: toAnswerText(res.content),
      sources,
    };
  }
}
