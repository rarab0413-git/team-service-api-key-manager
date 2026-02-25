import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ApiKeysRepository, ApiKeyRow } from './api-keys.repository';
import { TeamsRepository } from '../teams/teams.repository';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto, ApiKeyCreatedResponseDto } from './dto/api-key-response.dto';
import { encrypt, decrypt } from '../common/utils/encryption.util';

const DEFAULT_ALLOWED_MODELS = ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'];
const DEFAULT_ALLOWED_FEATURES = ['chat'];
const DEFAULT_MONTHLY_LIMIT = 100;
const API_KEY_PREFIX = process.env.API_KEY_PREFIX || 'team-sk';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly teamsRepository: TeamsRepository,
  ) {}

  private mapToResponse(row: ApiKeyRow): ApiKeyResponseDto {
    let allowedModels: string[];
    let allowedFeatures: string[];
    
    try {
      allowedModels = typeof row.allowed_models === 'string'
        ? JSON.parse(row.allowed_models)
        : row.allowed_models;
    } catch {
      allowedModels = ['gpt-4.1'];
    }

    try {
      allowedFeatures = typeof row.allowed_features === 'string'
        ? JSON.parse(row.allowed_features)
        : row.allowed_features || ['chat'];
    } catch {
      allowedFeatures = ['chat'];
    }

    return new ApiKeyResponseDto({
      id: row.id,
      teamId: row.team_id,
      teamName: row.team_name,
      keyPrefix: row.key_prefix,
      status: row.status,
      allowedModels,
      allowedFeatures,
      monthlyLimitUsd: Number(row.monthly_limit_usd),
      createdAt: row.created_at,
      revokedAt: row.revoked_at,
    });
  }

  private generateApiKey(): { key: string; prefix: string } {
    const uniquePart = uuidv4().replace(/-/g, '').substring(0, 24);
    const key = `${API_KEY_PREFIX}-${uniquePart}`;
    const prefix = `${API_KEY_PREFIX}-${uniquePart.substring(0, 8)}`;
    return { key, prefix };
  }

  async findAll(): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeysRepository.findAll();
    return keys.map((key) => this.mapToResponse(key));
  }

  async findById(id: number): Promise<ApiKeyResponseDto> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException(`API Key with ID ${id} not found`);
    }
    return this.mapToResponse(key);
  }

  async findByTeamId(teamId: number): Promise<ApiKeyResponseDto[]> {
    const team = await this.teamsRepository.findById(teamId);
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }
    const keys = await this.apiKeysRepository.findByTeamId(teamId);
    return keys.map((key) => this.mapToResponse(key));
  }

  async create(dto: CreateApiKeyDto): Promise<ApiKeyCreatedResponseDto> {
    const team = await this.teamsRepository.findById(dto.teamId);
    if (!team) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }

    const { key, prefix } = this.generateApiKey();
    const encryptedKey = encrypt(key);

    const id = await this.apiKeysRepository.create({
      teamId: dto.teamId,
      encryptedKey,
      keyPrefix: prefix,
      allowedModels: dto.allowedModels || DEFAULT_ALLOWED_MODELS,
      allowedFeatures: dto.allowedFeatures || DEFAULT_ALLOWED_FEATURES,
      monthlyLimitUsd: dto.monthlyLimitUsd ?? DEFAULT_MONTHLY_LIMIT,
    });

    const created = await this.apiKeysRepository.findById(id);
    if (!created) {
      throw new BadRequestException('Failed to create API key');
    }

    return new ApiKeyCreatedResponseDto({
      ...this.mapToResponse(created),
      apiKey: key,
    });
  }

  async revoke(id: number): Promise<ApiKeyResponseDto> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException(`API Key with ID ${id} not found`);
    }

    if (key.status === 'revoked') {
      throw new BadRequestException('API Key is already revoked');
    }

    await this.apiKeysRepository.revoke(id);
    return this.findById(id);
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyRow | null> {
    // 먼저 prefix로 후보 찾기
    const prefix = apiKey.substring(0, apiKey.lastIndexOf('-') + 9);
    const keyRow = await this.apiKeysRepository.findActiveByPrefix(prefix);
    
    if (!keyRow) {
      return null;
    }

    // 암호화된 키를 복호화하여 비교
    try {
      const decryptedKey = decrypt(keyRow.encrypted_key);
      return decryptedKey === apiKey ? keyRow : null;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  /**
   * API 키 ID로 복호화된 키 값을 가져옵니다 (승인된 요청에서 사용)
   */
  async getDecryptedKey(id: number): Promise<string> {
    const keyRow = await this.apiKeysRepository.findById(id);
    if (!keyRow) {
      throw new NotFoundException(`API Key with ID ${id} not found`);
    }
    return decrypt(keyRow.encrypted_key);
  }

  async updateAllowedModels(id: number, models: string[]): Promise<ApiKeyResponseDto> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException(`API Key with ID ${id} not found`);
    }

    await this.apiKeysRepository.updateAllowedModels(id, models);
    return this.findById(id);
  }

  async updateAllowedFeatures(id: number, features: string[]): Promise<ApiKeyResponseDto> {
    const key = await this.apiKeysRepository.findById(id);
    if (!key) {
      throw new NotFoundException(`API Key with ID ${id} not found`);
    }

    await this.apiKeysRepository.updateAllowedFeatures(id, features);
    return this.findById(id);
  }
}




