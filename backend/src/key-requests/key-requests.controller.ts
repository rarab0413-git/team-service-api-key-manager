import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KeyRequestsService } from './key-requests.service';
import { CreateKeyRequestDto, KeyRequestResponseDto, KeyRevealResponseDto } from './dto/key-request.dto';

@Controller('api/key-requests')
export class KeyRequestsController {
  constructor(private readonly keyRequestsService: KeyRequestsService) {}

  /**
   * 모든 키 조회 요청 목록 (관리자용)
   */
  @Get()
  async findAll(): Promise<KeyRequestResponseDto[]> {
    return this.keyRequestsService.findAll();
  }

  /**
   * 내 키 조회 요청 목록
   * @param email 요청자 이메일 (쿼리 파라미터)
   */
  @Get('my')
  async findMyRequests(@Query('email') email: string): Promise<KeyRequestResponseDto[]> {
    return this.keyRequestsService.findMyRequests(email);
  }

  /**
   * 키 조회 요청 생성
   * @param email 요청자 이메일 (쿼리 파라미터)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateKeyRequestDto,
    @Query('email') email: string,
  ): Promise<KeyRequestResponseDto> {
    return this.keyRequestsService.create(dto, email);
  }

  /**
   * 키 조회 요청 승인 (관리자)
   * @param email 관리자 이메일 (쿼리 파라미터)
   */
  @Put(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Query('email') email: string,
  ): Promise<KeyRequestResponseDto> {
    return this.keyRequestsService.approve(id, email);
  }

  /**
   * 키 조회 요청 거절 (관리자)
   * @param email 관리자 이메일 (쿼리 파라미터)
   */
  @Put(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Query('email') email: string,
  ): Promise<KeyRequestResponseDto> {
    return this.keyRequestsService.reject(id, email);
  }

  /**
   * 승인된 요청으로 키 값 확인 (1회성)
   * @param email 요청자 이메일 (쿼리 파라미터)
   */
  @Get(':id/reveal')
  async revealKey(
    @Param('id', ParseIntPipe) id: number,
    @Query('email') email: string,
  ): Promise<KeyRevealResponseDto> {
    return this.keyRequestsService.revealKey(id, email);
  }
}
