export class ApiKeyResponseDto {
  id: number;
  teamId: number;
  teamName?: string;
  keyPrefix: string;
  status: 'active' | 'revoked' | 'expired';
  allowedModels: string[];
  allowedFeatures: string[];
  monthlyLimitUsd: number;
  createdAt: Date;
  revokedAt: Date | null;

  constructor(partial: Partial<ApiKeyResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  apiKey: string; // Full key shown only once at creation

  constructor(partial: Partial<ApiKeyCreatedResponseDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}





