import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { UsageService, UsageLogDto, MonthlyUsageDto, FeatureUsageDto } from './usage.service';

@Controller('api/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  /**
   * 전체 팀의 이번 달 사용량 조회 (관리자용)
   */
  @Get('all-teams/current-month')
  async getAllTeamsCurrentMonthUsage(): Promise<{ teamId: number; totalCostUsd: number }[]> {
    return this.usageService.getAllTeamsCurrentMonthUsage();
  }

  /**
   * 전체 기능별 이번 달 사용량 조회 (관리자용)
   */
  @Get('all-teams/current-month/by-feature')
  async getAllTeamsCurrentMonthUsageByFeature(): Promise<FeatureUsageDto[]> {
    return this.usageService.getAllTeamsCurrentMonthUsageByFeature();
  }

  @Get('team/:teamId')
  async getTeamUsageLogs(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('limit') limit?: string,
  ): Promise<UsageLogDto[]> {
    return this.usageService.getTeamUsageLogs(teamId, limit ? parseInt(limit, 10) : 100);
  }

  @Get('team/:teamId/current-month')
  async getCurrentMonthUsage(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<{ teamId: number; currentMonthUsageUsd: number }> {
    const usage = await this.usageService.getCurrentMonthTeamUsage(teamId);
    return { teamId, currentMonthUsageUsd: usage };
  }

  @Get('team/:teamId/current-month/by-feature')
  async getCurrentMonthUsageByFeature(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<FeatureUsageDto[]> {
    return this.usageService.getCurrentMonthUsageByFeature(teamId);
  }

  @Get('team/:teamId/monthly')
  async getMonthlyUsageHistory(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('months') months?: string,
  ): Promise<MonthlyUsageDto[]> {
    return this.usageService.getMonthlyUsageHistory(teamId, months ? parseInt(months, 10) : 6);
  }

  @Get('api-key/:apiKeyId/current-month/by-feature')
  async getApiKeyUsageByFeature(
    @Param('apiKeyId', ParseIntPipe) apiKeyId: number,
  ): Promise<FeatureUsageDto[]> {
    return this.usageService.getCurrentMonthApiKeyUsageByFeature(apiKeyId);
  }
}






