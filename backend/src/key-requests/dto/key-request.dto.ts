import { IsInt } from 'class-validator';

export class CreateKeyRequestDto {
  @IsInt()
  apiKeyId: number;
}

export class KeyRequestResponseDto {
  id: number;
  apiKeyId: number;
  requesterId: number;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'revealed';
  approvedBy: number | null;
  approverEmail: string | null;
  approvedAt: Date | null;
  revealedAt: Date | null;
  createdAt: Date;
  keyPrefix: string;
  teamId: number;
  teamName: string;

  constructor(partial: Partial<KeyRequestResponseDto>) {
    Object.assign(this, partial);
  }
}

export class KeyRevealResponseDto {
  requestId: number;
  apiKey: string;

  constructor(partial: Partial<KeyRevealResponseDto>) {
    Object.assign(this, partial);
  }
}
