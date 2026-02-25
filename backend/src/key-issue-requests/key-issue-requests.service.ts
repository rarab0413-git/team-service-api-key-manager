import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { KeyIssueRequestsRepository, KeyIssueRequestRow } from './key-issue-requests.repository';
import { UsersRepository } from '../users/users.repository';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { FeatureType } from '../api-keys/dto/create-api-key.dto';
import {
  CreateKeyIssueRequestDto,
  ApproveKeyIssueRequestDto,
  KeyIssueRequestResponseDto,
} from './dto/key-issue-request.dto';

@Injectable()
export class KeyIssueRequestsService {
  constructor(
    private readonly keyIssueRequestsRepository: KeyIssueRequestsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  private mapToResponse(row: KeyIssueRequestRow): KeyIssueRequestResponseDto {
    let allowedModels: string[];
    try {
      allowedModels = typeof row.allowed_models === 'string'
        ? JSON.parse(row.allowed_models)
        : row.allowed_models;
    } catch {
      allowedModels = [];
    }

    return {
      id: row.id,
      teamId: row.team_id,
      teamName: row.team_name,
      requesterId: row.requester_id,
      requesterEmail: row.requester_email,
      status: row.status,
      allowedFeature: row.allowed_feature,
      allowedModels,
      monthlyLimitUsd: Number(row.monthly_limit_usd),
      approvedBy: row.approved_by,
      approverEmail: row.approver_email,
      approvedAt: row.approved_at,
      issuedApiKeyId: row.issued_api_key_id,
      keyPrefix: row.key_prefix,
      revealedAt: row.revealed_at,
      createdAt: row.created_at,
    };
  }

  async create(dto: CreateKeyIssueRequestDto, email: string): Promise<KeyIssueRequestResponseDto> {
    // 요청자 조회
    const requester = await this.usersRepository.findByEmail(email);
    if (!requester) {
      throw new NotFoundException('User not found');
    }

    // 관리자는 신청할 필요 없음
    if (requester.role === 'admin') {
      throw new BadRequestException('Admins can create API keys directly');
    }

    // 사용자는 본인 팀에만 신청 가능
    if (requester.team_id !== dto.teamId) {
      throw new ForbiddenException('You can only request keys for your own team');
    }

    // 중복 신청 방지 (같은 팀, 같은 사용자의 pending 요청이 있는지)
    const existingRequest = await this.keyIssueRequestsRepository.findPendingByTeamAndRequester(
      dto.teamId,
      requester.id,
    );
    if (existingRequest) {
      throw new BadRequestException('You already have a pending request for this team');
    }

    const id = await this.keyIssueRequestsRepository.create({
      teamId: dto.teamId,
      requesterId: requester.id,
      allowedFeature: dto.allowedFeature,
      allowedModels: dto.allowedModels,
      monthlyLimitUsd: dto.monthlyLimitUsd,
    });

    const created = await this.keyIssueRequestsRepository.findById(id);
    if (!created) {
      throw new BadRequestException('Failed to create key issue request');
    }

    return this.mapToResponse(created);
  }

  async findAll(): Promise<KeyIssueRequestResponseDto[]> {
    const requests = await this.keyIssueRequestsRepository.findAll();
    return requests.map((r) => this.mapToResponse(r));
  }

  async findMyRequests(email: string): Promise<KeyIssueRequestResponseDto[]> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const requests = await this.keyIssueRequestsRepository.findByRequesterId(user.id);
    return requests.map((r) => this.mapToResponse(r));
  }

  async findPendingCount(): Promise<number> {
    return this.keyIssueRequestsRepository.findPendingCount();
  }

  async approve(
    id: number,
    adminEmail: string,
    dto?: ApproveKeyIssueRequestDto,
  ): Promise<{ request: KeyIssueRequestResponseDto; apiKey: string }> {
    // 관리자 확인
    const admin = await this.usersRepository.findByEmail(adminEmail);
    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('Only admin can approve requests');
    }

    // 요청 조회
    const request = await this.keyIssueRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Key issue request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    // 최종 모델과 한도 결정 (관리자가 수정했으면 수정된 값, 아니면 원래 값)
    const finalModels = dto?.allowedModels || JSON.parse(request.allowed_models);
    const finalLimit = dto?.monthlyLimitUsd ?? Number(request.monthly_limit_usd);

    // API 키 발급
    const createdKey = await this.apiKeysService.create({
      teamId: request.team_id,
      allowedModels: finalModels,
      allowedFeatures: [request.allowed_feature as FeatureType],
      monthlyLimitUsd: finalLimit,
    });

    // 요청 승인 처리
    await this.keyIssueRequestsRepository.approve(
      id,
      admin.id,
      createdKey.id,
      dto?.allowedModels,
      dto?.monthlyLimitUsd,
    );

    const approved = await this.keyIssueRequestsRepository.findById(id);
    if (!approved) {
      throw new BadRequestException('Failed to approve request');
    }

    return {
      request: this.mapToResponse(approved),
      apiKey: createdKey.apiKey, // 최초 1회 열람용
    };
  }

  async reject(id: number, adminEmail: string): Promise<KeyIssueRequestResponseDto> {
    // 관리자 확인
    const admin = await this.usersRepository.findByEmail(adminEmail);
    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('Only admin can reject requests');
    }

    // 요청 조회
    const request = await this.keyIssueRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Key issue request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    await this.keyIssueRequestsRepository.reject(id, admin.id);

    const rejected = await this.keyIssueRequestsRepository.findById(id);
    if (!rejected) {
      throw new BadRequestException('Failed to reject request');
    }

    return this.mapToResponse(rejected);
  }

  /**
   * 승인된 요청의 최초 키 열람
   * approved 상태에서만 열람 가능, 열람 후 issued 상태로 변경
   */
  async revealKey(id: number, email: string): Promise<{ requestId: number; apiKey: string }> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const request = await this.keyIssueRequestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Key issue request not found');
    }

    // 본인 요청인지 확인
    if (request.requester_id !== user.id) {
      throw new ForbiddenException('You can only reveal your own requests');
    }

    // approved 상태에서만 열람 가능
    if (request.status !== 'approved') {
      if (request.status === 'issued') {
        throw new BadRequestException('Key has already been revealed. Use key reveal request system for subsequent access.');
      }
      throw new BadRequestException('Request is not approved');
    }

    if (!request.issued_api_key_id) {
      throw new BadRequestException('No API key was issued for this request');
    }

    // 키 복호화
    const apiKey = await this.apiKeysService.getDecryptedKey(request.issued_api_key_id);

    // issued 상태로 변경
    await this.keyIssueRequestsRepository.markIssued(id);

    return {
      requestId: id,
      apiKey,
    };
  }
}
