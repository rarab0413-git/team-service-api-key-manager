import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';

export class CreateKeyIssueRequestDto {
  @IsNumber()
  teamId: number;

  @IsString()
  allowedFeature: string;

  @IsArray()
  @IsString({ each: true })
  allowedModels: string[];

  @IsNumber()
  @Min(1)
  monthlyLimitUsd: number;
}

export class ApproveKeyIssueRequestDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedModels?: string[];

  @IsNumber()
  @Min(1)
  @IsOptional()
  monthlyLimitUsd?: number;
}

export class KeyIssueRequestResponseDto {
  id: number;
  teamId: number;
  teamName: string;
  requesterId: number;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  allowedFeature: string;
  allowedModels: string[];
  monthlyLimitUsd: number;
  approvedBy: number | null;
  approverEmail: string | null;
  approvedAt: Date | null;
  issuedApiKeyId: number | null;
  keyPrefix: string | null;
  revealedAt: Date | null;
  createdAt: Date;
}
