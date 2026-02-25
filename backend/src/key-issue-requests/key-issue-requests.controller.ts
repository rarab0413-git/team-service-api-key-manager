import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { KeyIssueRequestsService } from './key-issue-requests.service';
import {
  CreateKeyIssueRequestDto,
  ApproveKeyIssueRequestDto,
  KeyIssueRequestResponseDto,
} from './dto/key-issue-request.dto';

@Controller('api/key-issue-requests')
export class KeyIssueRequestsController {
  constructor(private readonly keyIssueRequestsService: KeyIssueRequestsService) {}

  /**
   * 키 발급 신청 생성 (일반 사용자)
   */
  @Post()
  async create(
    @Body() dto: CreateKeyIssueRequestDto,
    @Query('email') email: string,
  ): Promise<KeyIssueRequestResponseDto> {
    return this.keyIssueRequestsService.create(dto, email);
  }

  /**
   * 모든 키 발급 신청 조회 (관리자)
   */
  @Get()
  async findAll(): Promise<KeyIssueRequestResponseDto[]> {
    return this.keyIssueRequestsService.findAll();
  }

  /**
   * 대기 중인 신청 수 조회 (관리자)
   */
  @Get('pending-count')
  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.keyIssueRequestsService.findPendingCount();
    return { count };
  }

  /**
   * 내 키 발급 신청 조회
   */
  @Get('my')
  async findMyRequests(
    @Query('email') email: string,
  ): Promise<KeyIssueRequestResponseDto[]> {
    return this.keyIssueRequestsService.findMyRequests(email);
  }

  /**
   * 키 발급 신청 승인 (관리자)
   * 승인 시 API 키가 발급되고 최초 1회 열람용 키 반환
   */
  @Put(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Query('email') adminEmail: string,
    @Body() dto?: ApproveKeyIssueRequestDto,
  ): Promise<{ request: KeyIssueRequestResponseDto; apiKey: string }> {
    return this.keyIssueRequestsService.approve(id, adminEmail, dto);
  }

  /**
   * 키 발급 신청 거절 (관리자)
   */
  @Put(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Query('email') adminEmail: string,
  ): Promise<KeyIssueRequestResponseDto> {
    return this.keyIssueRequestsService.reject(id, adminEmail);
  }

  /**
   * 승인된 신청의 키 열람 (최초 1회)
   */
  @Get(':id/reveal')
  async revealKey(
    @Param('id', ParseIntPipe) id: number,
    @Query('email') email: string,
  ): Promise<{ requestId: number; apiKey: string }> {
    return this.keyIssueRequestsService.revealKey(id, email);
  }
}
