import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { KeyRequestsRepository, KeyRevealRequestRow } from './key-requests.repository';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { UsersRepository } from '../users/users.repository';
import { CreateKeyRequestDto, KeyRequestResponseDto, KeyRevealResponseDto } from './dto/key-request.dto';

@Injectable()
export class KeyRequestsService {
  constructor(
    private readonly keyRequestsRepository: KeyRequestsRepository,
    private readonly apiKeysService: ApiKeysService,
    private readonly usersRepository: UsersRepository,
  ) {}

  private mapToResponse(row: KeyRevealRequestRow): KeyRequestResponseDto {
    return new KeyRequestResponseDto({
      id: row.id,
      apiKeyId: row.api_key_id,
      requesterId: row.requester_id,
      requesterEmail: row.requester_email || '',
      status: row.status,
      approvedBy: row.approved_by,
      approverEmail: row.approver_email || null,
      approvedAt: row.approved_at,
      revealedAt: row.revealed_at,
      createdAt: row.created_at,
      keyPrefix: row.key_prefix || '',
      teamId: row.team_id || 0,
      teamName: row.team_name || '',
    });
  }

  /**
   * 모든 키 조회 요청 목록 (관리자용)
   */
  async findAll(): Promise<KeyRequestResponseDto[]> {
    const requests = await this.keyRequestsRepository.findAll();
    return requests.map(r => this.mapToResponse(r));
  }

  /**
   * 내 키 조회 요청 목록
   */
  async findMyRequests(userEmail: string): Promise<KeyRequestResponseDto[]> {
    const user = await this.usersRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const requests = await this.keyRequestsRepository.findByRequesterId(user.id);
    return requests.map(r => this.mapToResponse(r));
  }

  /**
   * 키 조회 요청 생성
   */
  async create(dto: CreateKeyRequestDto, userEmail: string): Promise<KeyRequestResponseDto> {
    const user = await this.usersRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // API 키 존재 확인
    const apiKey = await this.apiKeysService.findById(dto.apiKeyId);
    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    // 본인 팀의 키인지 확인
    if (user.team_id !== apiKey.teamId) {
      throw new ForbiddenException('You can only request keys from your own team');
    }

    // 이미 대기중인 요청이 있는지 확인
    const existingPending = await this.keyRequestsRepository.findPendingByApiKeyAndRequester(
      dto.apiKeyId,
      user.id
    );
    if (existingPending) {
      throw new BadRequestException('You already have a pending request for this key');
    }

    // 이미 승인된 요청이 있는지 확인 (아직 reveal하지 않은)
    const existingApproved = await this.keyRequestsRepository.findApprovedByApiKeyAndRequester(
      dto.apiKeyId,
      user.id
    );
    if (existingApproved) {
      throw new BadRequestException('You already have an approved request for this key. Please reveal it.');
    }

    const id = await this.keyRequestsRepository.create({
      apiKeyId: dto.apiKeyId,
      requesterId: user.id,
    });

    const created = await this.keyRequestsRepository.findById(id);
    if (!created) {
      throw new BadRequestException('Failed to create request');
    }

    return this.mapToResponse(created);
  }

  /**
   * 키 조회 요청 승인 (관리자)
   */
  async approve(requestId: number, adminEmail: string): Promise<KeyRequestResponseDto> {
    const admin = await this.usersRepository.findByEmail(adminEmail);
    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('Only admin can approve requests');
    }

    const request = await this.keyRequestsRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    const success = await this.keyRequestsRepository.approve(requestId, admin.id);
    if (!success) {
      throw new BadRequestException('Failed to approve request');
    }

    const updated = await this.keyRequestsRepository.findById(requestId);
    return this.mapToResponse(updated!);
  }

  /**
   * 키 조회 요청 거절 (관리자)
   */
  async reject(requestId: number, adminEmail: string): Promise<KeyRequestResponseDto> {
    const admin = await this.usersRepository.findByEmail(adminEmail);
    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('Only admin can reject requests');
    }

    const request = await this.keyRequestsRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    const success = await this.keyRequestsRepository.reject(requestId, admin.id);
    if (!success) {
      throw new BadRequestException('Failed to reject request');
    }

    const updated = await this.keyRequestsRepository.findById(requestId);
    return this.mapToResponse(updated!);
  }

  /**
   * 승인된 요청으로 키 값 확인 (1회성)
   */
  async revealKey(requestId: number, userEmail: string): Promise<KeyRevealResponseDto> {
    const user = await this.usersRepository.findByEmail(userEmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const request = await this.keyRequestsRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // 본인의 요청인지 확인
    if (request.requester_id !== user.id) {
      throw new ForbiddenException('You can only reveal your own requests');
    }

    // 승인된 상태인지 확인
    if (request.status !== 'approved') {
      throw new BadRequestException('Request is not approved or already revealed');
    }

    // 키 값 복호화
    const apiKey = await this.apiKeysService.getDecryptedKey(request.api_key_id);

    // 상태를 revealed로 변경
    const success = await this.keyRequestsRepository.markRevealed(requestId);
    if (!success) {
      throw new BadRequestException('Failed to mark request as revealed');
    }

    return new KeyRevealResponseDto({
      requestId,
      apiKey,
    });
  }
}
