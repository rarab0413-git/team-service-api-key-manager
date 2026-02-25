import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabasePool } from '../common/config/database.config';

export interface UsageLogRow extends RowDataPacket {
  id: number;
  team_id: number;
  api_key_id: number;
  feature_type: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  image_count: number;
  audio_seconds: number;
  cost_usd: number;
  request_path: string;
  response_status: number;
  created_at: Date;
}

export interface MonthlyUsageRow extends RowDataPacket {
  team_id: number;
  month: string;
  total_cost_usd: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  request_count: number;
}

@Injectable()
export class UsageRepository implements OnModuleInit {
  private pool: Pool;

  onModuleInit() {
    this.pool = getDatabasePool();
  }

  async create(data: {
    teamId: number;
    apiKeyId: number;
    featureType?: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    imageCount?: number;
    audioSeconds?: number;
    costUsd: number;
    requestPath?: string;
    responseStatus?: number;
  }): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO usage_logs 
       (team_id, api_key_id, feature_type, model, prompt_tokens, completion_tokens, total_tokens, image_count, audio_seconds, cost_usd, request_path, response_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.teamId,
        data.apiKeyId,
        data.featureType || 'chat',
        data.model,
        data.promptTokens,
        data.completionTokens,
        data.totalTokens,
        data.imageCount || 0,
        data.audioSeconds || 0,
        data.costUsd,
        data.requestPath || null,
        data.responseStatus || null,
      ]
    );
    return result.insertId;
  }

  async findByTeamId(teamId: number, limit = 100): Promise<UsageLogRow[]> {
    const [rows] = await this.pool.execute<UsageLogRow[]>(
      `SELECT * FROM usage_logs WHERE team_id = ? ORDER BY created_at DESC LIMIT ?`,
      [teamId, limit]
    );
    return rows;
  }

  async getCurrentMonthUsage(teamId: number): Promise<number> {
    const [rows] = await this.pool.execute<MonthlyUsageRow[]>(
      `SELECT COALESCE(SUM(cost_usd), 0) as total_cost_usd
       FROM usage_logs 
       WHERE team_id = ? 
       AND YEAR(created_at) = YEAR(CURRENT_DATE())
       AND MONTH(created_at) = MONTH(CURRENT_DATE())`,
      [teamId]
    );
    return Number(rows[0]?.total_cost_usd || 0);
  }

  async getCurrentMonthApiKeyUsage(apiKeyId: number): Promise<number> {
    const [rows] = await this.pool.execute<MonthlyUsageRow[]>(
      `SELECT COALESCE(SUM(cost_usd), 0) as total_cost_usd
       FROM usage_logs 
       WHERE api_key_id = ? 
       AND YEAR(created_at) = YEAR(CURRENT_DATE())
       AND MONTH(created_at) = MONTH(CURRENT_DATE())`,
      [apiKeyId]
    );
    return Number(rows[0]?.total_cost_usd || 0);
  }

  async getMonthlyUsageByTeam(teamId: number, months = 6): Promise<MonthlyUsageRow[]> {
    const [rows] = await this.pool.execute<MonthlyUsageRow[]>(
      `SELECT 
        team_id,
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(cost_usd) AS total_cost_usd,
        SUM(prompt_tokens) AS total_prompt_tokens,
        SUM(completion_tokens) AS total_completion_tokens,
        COUNT(*) AS request_count
       FROM usage_logs
       WHERE team_id = ?
       AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? MONTH)
       GROUP BY team_id, DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC`,
      [teamId, months]
    );
    return rows;
  }

  async getAllTeamsCurrentMonthUsage(): Promise<{ teamId: number; totalCostUsd: number }[]> {
    const [rows] = await this.pool.execute<(RowDataPacket & { team_id: number; total_cost_usd: number })[]>(
      `SELECT team_id, COALESCE(SUM(cost_usd), 0) as total_cost_usd
       FROM usage_logs 
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE())
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       GROUP BY team_id`
    );
    return rows.map(r => ({ teamId: r.team_id, totalCostUsd: Number(r.total_cost_usd) }));
  }

  // 기능별 사용량 조회 (이번 달)
  async getCurrentMonthUsageByFeature(teamId: number): Promise<{ featureType: string; totalCostUsd: number; requestCount: number }[]> {
    const [rows] = await this.pool.execute<(RowDataPacket & { feature_type: string; total_cost_usd: number; request_count: number })[]>(
      `SELECT feature_type, COALESCE(SUM(cost_usd), 0) as total_cost_usd, COUNT(*) as request_count
       FROM usage_logs 
       WHERE team_id = ?
       AND YEAR(created_at) = YEAR(CURRENT_DATE())
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       GROUP BY feature_type`,
      [teamId]
    );
    return rows.map(r => ({ 
      featureType: r.feature_type, 
      totalCostUsd: Number(r.total_cost_usd),
      requestCount: Number(r.request_count)
    }));
  }

  // API 키별 기능 사용량 조회 (이번 달)
  async getCurrentMonthApiKeyUsageByFeature(apiKeyId: number): Promise<{ featureType: string; totalCostUsd: number; requestCount: number }[]> {
    const [rows] = await this.pool.execute<(RowDataPacket & { feature_type: string; total_cost_usd: number; request_count: number })[]>(
      `SELECT feature_type, COALESCE(SUM(cost_usd), 0) as total_cost_usd, COUNT(*) as request_count
       FROM usage_logs 
       WHERE api_key_id = ?
       AND YEAR(created_at) = YEAR(CURRENT_DATE())
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       GROUP BY feature_type`,
      [apiKeyId]
    );
    return rows.map(r => ({ 
      featureType: r.feature_type, 
      totalCostUsd: Number(r.total_cost_usd),
      requestCount: Number(r.request_count)
    }));
  }

  // 전체 기능별 사용량 조회 (관리자용)
  async getAllTeamsCurrentMonthUsageByFeature(): Promise<{ featureType: string; totalCostUsd: number; requestCount: number }[]> {
    const [rows] = await this.pool.execute<(RowDataPacket & { feature_type: string; total_cost_usd: number; request_count: number })[]>(
      `SELECT feature_type, COALESCE(SUM(cost_usd), 0) as total_cost_usd, COUNT(*) as request_count
       FROM usage_logs 
       WHERE YEAR(created_at) = YEAR(CURRENT_DATE())
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       GROUP BY feature_type`
    );
    return rows.map(r => ({ 
      featureType: r.feature_type, 
      totalCostUsd: Number(r.total_cost_usd),
      requestCount: Number(r.request_count)
    }));
  }
}





