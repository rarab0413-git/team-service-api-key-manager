import { Injectable } from '@nestjs/common';
import { UsageRepository, UsageLogRow, MonthlyUsageRow } from './usage.repository';

// OpenAI Pricing (per 1K tokens) - Updated for common models
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  'gpt-4.1': { prompt: 0.002, completion: 0.008 },
  'gpt-4.1-mini': { prompt: 0.0004, completion: 0.0016 },
  'gpt-4.1-nano': { prompt: 0.0001, completion: 0.0004 },
  'gpt-4o': { prompt: 0.005, completion: 0.015 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
  'gpt-4': { prompt: 0.03, completion: 0.06 },
  'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
};

// DALL-E Image Pricing (per image)
const IMAGE_PRICING: Record<string, Record<string, number>> = {
  'dall-e-3': {
    '1024x1024': 0.04,
    '1024x1792': 0.08,
    '1792x1024': 0.08,
  },
  'dall-e-2': {
    '256x256': 0.016,
    '512x512': 0.018,
    '1024x1024': 0.02,
  },
};

// Audio Pricing
const AUDIO_PRICING = {
  // Whisper - per minute
  'whisper-1': 0.006,
  // TTS - per 1K characters
  'tts-1': 0.015,
  'tts-1-hd': 0.03,
};

export interface UsageLogDto {
  id: number;
  teamId: number;
  apiKeyId: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  requestPath: string | null;
  responseStatus: number | null;
  createdAt: Date;
}

export interface MonthlyUsageDto {
  teamId: number;
  month: string;
  totalCostUsd: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  requestCount: number;
}

@Injectable()
export class UsageService {
  constructor(private readonly usageRepository: UsageRepository) {}

  private mapLogToDto(row: UsageLogRow): UsageLogDto {
    return {
      id: row.id,
      teamId: row.team_id,
      apiKeyId: row.api_key_id,
      model: row.model,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      totalTokens: row.total_tokens,
      costUsd: Number(row.cost_usd),
      requestPath: row.request_path,
      responseStatus: row.response_status,
      createdAt: row.created_at,
    };
  }

  private mapMonthlyToDto(row: MonthlyUsageRow): MonthlyUsageDto {
    return {
      teamId: row.team_id,
      month: row.month,
      totalCostUsd: Number(row.total_cost_usd),
      totalPromptTokens: Number(row.total_prompt_tokens),
      totalCompletionTokens: Number(row.total_completion_tokens),
      requestCount: Number(row.request_count),
    };
  }

  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4.1'];
    const promptCost = (promptTokens / 1000) * pricing.prompt;
    const completionCost = (completionTokens / 1000) * pricing.completion;
    return Number((promptCost + completionCost).toFixed(6));
  }

  async logUsage(data: {
    teamId: number;
    apiKeyId: number;
    model: string;
    promptTokens: number;
    completionTokens: number;
    requestPath?: string;
    responseStatus?: number;
  }): Promise<void> {
    const cost = this.calculateCost(data.model, data.promptTokens, data.completionTokens);
    await this.usageRepository.create({
      ...data,
      totalTokens: data.promptTokens + data.completionTokens,
      costUsd: cost,
    });
  }

  async getTeamUsageLogs(teamId: number, limit = 100): Promise<UsageLogDto[]> {
    const logs = await this.usageRepository.findByTeamId(teamId, limit);
    return logs.map(log => this.mapLogToDto(log));
  }

  async getCurrentMonthTeamUsage(teamId: number): Promise<number> {
    return this.usageRepository.getCurrentMonthUsage(teamId);
  }

  async getCurrentMonthApiKeyUsage(apiKeyId: number): Promise<number> {
    return this.usageRepository.getCurrentMonthApiKeyUsage(apiKeyId);
  }

  async getMonthlyUsageHistory(teamId: number, months = 6): Promise<MonthlyUsageDto[]> {
    const usage = await this.usageRepository.getMonthlyUsageByTeam(teamId, months);
    return usage.map(u => this.mapMonthlyToDto(u));
  }

  async checkBudget(teamId: number, teamBudget: number, apiKeyId: number, apiKeyLimit: number): Promise<{
    withinBudget: boolean;
    teamUsage: number;
    apiKeyUsage: number;
    teamRemaining: number;
    apiKeyRemaining: number;
  }> {
    const [teamUsage, apiKeyUsage] = await Promise.all([
      this.getCurrentMonthTeamUsage(teamId),
      this.getCurrentMonthApiKeyUsage(apiKeyId),
    ]);

    return {
      withinBudget: teamUsage < teamBudget && apiKeyUsage < apiKeyLimit,
      teamUsage,
      apiKeyUsage,
      teamRemaining: Math.max(0, teamBudget - teamUsage),
      apiKeyRemaining: Math.max(0, apiKeyLimit - apiKeyUsage),
    };
  }

  calculateImageCost(model: string, size: string, count: number): number {
    const modelPricing = IMAGE_PRICING[model] || IMAGE_PRICING['dall-e-2'];
    const pricePerImage = modelPricing[size] || modelPricing['1024x1024'];
    return Number((pricePerImage * count).toFixed(6));
  }

  calculateAudioCost(model: string, featureType: string, value: number): number {
    if (featureType === 'audio_transcription') {
      // value is seconds, pricing is per minute
      const minutes = value / 60;
      const pricePerMinute = AUDIO_PRICING['whisper-1'];
      return Number((pricePerMinute * minutes).toFixed(6));
    } else if (featureType === 'audio_speech') {
      // value is character count, pricing is per 1K characters
      const price = AUDIO_PRICING[model as keyof typeof AUDIO_PRICING] || AUDIO_PRICING['tts-1'];
      return Number(((value / 1000) * price).toFixed(6));
    }
    return 0;
  }

  async logImageUsage(data: {
    teamId: number;
    apiKeyId: number;
    model: string;
    imageCount: number;
    size: string;
    requestPath?: string;
    responseStatus?: number;
  }): Promise<void> {
    const cost = this.calculateImageCost(data.model, data.size, data.imageCount);
    await this.usageRepository.create({
      teamId: data.teamId,
      apiKeyId: data.apiKeyId,
      featureType: 'image_generation',
      model: data.model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      imageCount: data.imageCount,
      audioSeconds: 0,
      costUsd: cost,
      requestPath: data.requestPath,
      responseStatus: data.responseStatus,
    });
  }

  async logAudioUsage(data: {
    teamId: number;
    apiKeyId: number;
    model: string;
    featureType: 'audio_transcription' | 'audio_speech';
    audioSeconds?: number;
    characterCount?: number;
    requestPath?: string;
    responseStatus?: number;
  }): Promise<void> {
    const value = data.featureType === 'audio_transcription' 
      ? (data.audioSeconds || 0) 
      : (data.characterCount || 0);
    const cost = this.calculateAudioCost(data.model, data.featureType, value);
    
    await this.usageRepository.create({
      teamId: data.teamId,
      apiKeyId: data.apiKeyId,
      featureType: data.featureType,
      model: data.model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      imageCount: 0,
      audioSeconds: data.audioSeconds || 0,
      costUsd: cost,
      requestPath: data.requestPath,
      responseStatus: data.responseStatus,
    });
  }

  // 기능별 사용량 조회
  async getCurrentMonthUsageByFeature(teamId: number): Promise<FeatureUsageDto[]> {
    return this.usageRepository.getCurrentMonthUsageByFeature(teamId);
  }

  // 전체 팀의 이번 달 사용량 조회 (관리자용)
  async getAllTeamsCurrentMonthUsage(): Promise<{ teamId: number; totalCostUsd: number }[]> {
    return this.usageRepository.getAllTeamsCurrentMonthUsage();
  }

  async getCurrentMonthApiKeyUsageByFeature(apiKeyId: number): Promise<FeatureUsageDto[]> {
    return this.usageRepository.getCurrentMonthApiKeyUsageByFeature(apiKeyId);
  }

  // 전체 기능별 사용량 조회 (관리자용)
  async getAllTeamsCurrentMonthUsageByFeature(): Promise<FeatureUsageDto[]> {
    return this.usageRepository.getAllTeamsCurrentMonthUsageByFeature();
  }
}

export interface FeatureUsageDto {
  featureType: string;
  totalCostUsd: number;
  requestCount: number;
}




