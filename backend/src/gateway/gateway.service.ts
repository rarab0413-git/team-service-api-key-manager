import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { ApiKeysRepository, ApiKeyRow } from '../api-keys/api-keys.repository';
import { TeamsRepository } from '../teams/teams.repository';
import { UsageService } from '../usage/usage.service';
import { decrypt } from '../common/utils/encryption.util';

const OPENAI_API_BASE = 'https://api.openai.com';

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIResponse {
  usage?: OpenAIUsage;
  model?: string;
  [key: string]: unknown;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly teamsRepository: TeamsRepository,
    private readonly usageService: UsageService,
  ) {}

  async validateAndGetApiKey(bearerToken: string): Promise<ApiKeyRow> {
    if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const apiKey = bearerToken.replace('Bearer ', '').trim();
    
    // Extract prefix from the API key
    // API key format: team-sk-{24자리}
    // Prefix format: team-sk-{8자리}
    const parts = apiKey.split('-');
    if (parts.length < 3) {
      this.logger.warn(`Invalid API key format: ${apiKey.substring(0, 20)}...`);
      throw new UnauthorizedException('Invalid API key format');
    }
    
    // Prefix is "team-sk-" + first 8 chars of unique part
    const uniquePart = parts.slice(2).join('-'); // parts[2] 이후의 모든 부분을 합침
    if (uniquePart.length < 8) {
      this.logger.warn(`API key unique part too short: ${apiKey.substring(0, 20)}...`);
      throw new UnauthorizedException('Invalid API key format');
    }
    
    const prefix = `${parts[0]}-${parts[1]}-${uniquePart.substring(0, 8)}`;
    
    this.logger.debug(`Extracted prefix: ${prefix} from API key: ${apiKey.substring(0, 20)}...`);
    
    const keyRow = await this.apiKeysRepository.findActiveByPrefix(prefix);
    if (!keyRow) {
      this.logger.warn(`API key not found for prefix: ${prefix}`);
      throw new UnauthorizedException('API key not found or inactive');
    }

    // 암호화된 키를 복호화하여 비교
    try {
      const decryptedKey = decrypt(keyRow.encrypted_key);
      if (decryptedKey !== apiKey) {
        throw new UnauthorizedException('Invalid API key');
      }
    } catch (error) {
      this.logger.error('Failed to decrypt API key:', error);
      throw new UnauthorizedException('Invalid API key');
    }

    return keyRow;
  }

  async checkModelAllowed(keyRow: ApiKeyRow, requestedModel: string): Promise<void> {
    let allowedModels: string[];
    try {
      allowedModels = typeof keyRow.allowed_models === 'string'
        ? JSON.parse(keyRow.allowed_models)
        : keyRow.allowed_models;
    } catch {
      allowedModels = ['gpt-4.1'];
    }

    if (!allowedModels.includes(requestedModel)) {
      throw new ForbiddenException(
        `Model '${requestedModel}' is not allowed for this API key. Allowed models: ${allowedModels.join(', ')}`
      );
    }
  }

  async checkFeatureAllowed(keyRow: ApiKeyRow, requestedFeature: string): Promise<void> {
    let allowedFeatures: string[];
    try {
      allowedFeatures = typeof keyRow.allowed_features === 'string'
        ? JSON.parse(keyRow.allowed_features)
        : keyRow.allowed_features || ['chat'];
    } catch {
      allowedFeatures = ['chat'];
    }

    if (!allowedFeatures.includes(requestedFeature)) {
      throw new ForbiddenException(
        `Feature '${requestedFeature}' is not allowed for this API key. Allowed features: ${allowedFeatures.join(', ')}`
      );
    }
  }

  async checkBudget(keyRow: ApiKeyRow): Promise<void> {
    const team = await this.teamsRepository.findById(keyRow.team_id);
    if (!team) {
      throw new BadRequestException('Team not found');
    }

    const budgetCheck = await this.usageService.checkBudget(
      keyRow.team_id,
      Number(team.monthly_budget),
      keyRow.id,
      Number(keyRow.monthly_limit_usd),
    );

    if (!budgetCheck.withinBudget) {
      if (budgetCheck.teamRemaining <= 0) {
        throw new ForbiddenException(
          `Team monthly budget exceeded. Used: $${budgetCheck.teamUsage.toFixed(2)} / $${team.monthly_budget}`
        );
      }
      if (budgetCheck.apiKeyRemaining <= 0) {
        throw new ForbiddenException(
          `API key monthly limit exceeded. Used: $${budgetCheck.apiKeyUsage.toFixed(2)} / $${keyRow.monthly_limit_usd}`
        );
      }
    }
  }

  async proxyToOpenAI(
    path: string,
    method: string,
    body: unknown,
    keyRow: ApiKeyRow,
  ): Promise<{ data: OpenAIResponse; status: number }> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new BadRequestException('OpenAI API key not configured on gateway');
    }

    try {
      const response: AxiosResponse<OpenAIResponse> = await axios({
        method: method as 'get' | 'post' | 'put' | 'delete',
        url: `${OPENAI_API_BASE}${path}`,
        data: body,
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minutes
      });

      // Log usage if response contains usage information
      if (response.data.usage) {
        const model = (body as { model?: string })?.model || response.data.model || 'unknown';
        await this.usageService.logUsage({
          teamId: keyRow.team_id,
          apiKeyId: keyRow.id,
          model,
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          requestPath: path,
          responseStatus: response.status,
        });

        this.logger.log(
          `Request completed: team=${keyRow.team_name}, model=${model}, ` +
          `tokens=${response.data.usage.total_tokens}, path=${path}`
        );
      }

      return { data: response.data, status: response.status };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || error.message;
        
        this.logger.error(
          `OpenAI API error: team=${keyRow.team_name}, status=${status}, message=${message}`
        );

        throw new BadRequestException({
          statusCode: status,
          message: `OpenAI API Error: ${message}`,
          error: error.response?.data?.error || {},
        });
      }
      throw error;
    }
  }

  async handleChatCompletion(
    bearerToken: string,
    body: { model: string; messages: unknown[]; [key: string]: unknown },
    requestPath: string,
  ): Promise<{ data: OpenAIResponse; status: number }> {
    // 1. Validate API key
    const keyRow = await this.validateAndGetApiKey(bearerToken);
    
    this.logger.log(`Request from team: ${keyRow.team_name} (${keyRow.key_prefix})`);

    // 2. Check feature allowed (chat or image_vision for vision models)
    const hasImageContent = Array.isArray(body.messages) && body.messages.some(
      (msg: unknown) => typeof msg === 'object' && msg !== null && 
      Array.isArray((msg as { content?: unknown }).content)
    );
    await this.checkFeatureAllowed(keyRow, hasImageContent ? 'image_vision' : 'chat');

    // 3. Check model allowed
    await this.checkModelAllowed(keyRow, body.model);

    // 4. Check budget
    await this.checkBudget(keyRow);

    // 5. Proxy to OpenAI
    return this.proxyToOpenAI(requestPath, 'POST', body, keyRow);
  }

  async handleImageGeneration(
    bearerToken: string,
    body: { model?: string; prompt: string; n?: number; size?: string; [key: string]: unknown },
    requestPath: string,
  ): Promise<{ data: OpenAIResponse; status: number }> {
    const keyRow = await this.validateAndGetApiKey(bearerToken);
    
    this.logger.log(`Image generation request from team: ${keyRow.team_name}`);

    // Check feature allowed
    await this.checkFeatureAllowed(keyRow, 'image_generation');

    // Check budget
    await this.checkBudget(keyRow);

    // Proxy to OpenAI
    const response = await this.proxyToOpenAI(requestPath, 'POST', body, keyRow);

    // Log image generation usage
    const imageCount = body.n || 1;
    const model = body.model || 'dall-e-2';
    await this.usageService.logImageUsage({
      teamId: keyRow.team_id,
      apiKeyId: keyRow.id,
      model,
      imageCount,
      size: body.size || '1024x1024',
      requestPath,
      responseStatus: response.status,
    });

    return response;
  }

  async handleAudioTranscription(
    bearerToken: string,
    requestPath: string,
  ): Promise<{ data: OpenAIResponse; status: number }> {
    const keyRow = await this.validateAndGetApiKey(bearerToken);
    
    this.logger.log(`Audio transcription request from team: ${keyRow.team_name}`);

    // Check feature allowed
    await this.checkFeatureAllowed(keyRow, 'audio_transcription');

    // Check budget
    await this.checkBudget(keyRow);

    // Note: Audio requests need special handling (multipart/form-data)
    // This is a placeholder - actual implementation would need file handling
    throw new BadRequestException('Audio transcription requires multipart/form-data. Use direct file upload.');
  }

  async handleAudioSpeech(
    bearerToken: string,
    body: { model: string; input: string; voice: string; [key: string]: unknown },
    requestPath: string,
  ): Promise<{ data: unknown; status: number }> {
    const keyRow = await this.validateAndGetApiKey(bearerToken);
    
    this.logger.log(`Audio speech request from team: ${keyRow.team_name}`);

    // Check feature allowed
    await this.checkFeatureAllowed(keyRow, 'audio_speech');

    // Check budget
    await this.checkBudget(keyRow);

    // Proxy to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new BadRequestException('OpenAI API key not configured on gateway');
    }

    const response = await axios({
      method: 'POST',
      url: `${OPENAI_API_BASE}${requestPath}`,
      data: body,
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    // Log audio usage (estimate characters for pricing)
    const characterCount = body.input.length;
    await this.usageService.logAudioUsage({
      teamId: keyRow.team_id,
      apiKeyId: keyRow.id,
      model: body.model,
      featureType: 'audio_speech',
      characterCount,
      requestPath,
      responseStatus: response.status,
    });

    return { data: response.data, status: response.status };
  }

  async handleGenericRequest(
    bearerToken: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ data: unknown; status: number }> {
    const keyRow = await this.validateAndGetApiKey(bearerToken);
    
    // For non-completion endpoints, just validate auth and proxy
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new BadRequestException('OpenAI API key not configured on gateway');
    }

    const response = await axios({
      method: method as 'get' | 'post' | 'put' | 'delete',
      url: `${OPENAI_API_BASE}${path}`,
      data: body,
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    return { data: response.data, status: response.status };
  }
}




