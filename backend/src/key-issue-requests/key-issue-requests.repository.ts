import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabasePool } from '../common/config/database.config';

export interface KeyIssueRequestRow extends RowDataPacket {
  id: number;
  team_id: number;
  team_name: string;
  requester_id: number;
  requester_email: string;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  allowed_feature: string;
  allowed_models: string;
  monthly_limit_usd: number;
  approved_by: number | null;
  approver_email: string | null;
  approved_at: Date | null;
  issued_api_key_id: number | null;
  key_prefix: string | null;
  revealed_at: Date | null;
  created_at: Date;
}

@Injectable()
export class KeyIssueRequestsRepository implements OnModuleInit {
  private pool: Pool;

  onModuleInit() {
    this.pool = getDatabasePool();
  }

  async create(data: {
    teamId: number;
    requesterId: number;
    allowedFeature: string;
    allowedModels: string[];
    monthlyLimitUsd: number;
  }): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO key_issue_requests 
       (team_id, requester_id, allowed_feature, allowed_models, monthly_limit_usd)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.teamId,
        data.requesterId,
        data.allowedFeature,
        JSON.stringify(data.allowedModels),
        data.monthlyLimitUsd,
      ]
    );
    return result.insertId;
  }

  async findAll(): Promise<KeyIssueRequestRow[]> {
    const [rows] = await this.pool.execute<KeyIssueRequestRow[]>(
      `SELECT 
        kir.*,
        t.name as team_name,
        u.email as requester_email,
        approver.email as approver_email,
        tak.key_prefix
       FROM key_issue_requests kir
       JOIN teams_info t ON kir.team_id = t.id
       JOIN users_info u ON kir.requester_id = u.id
       LEFT JOIN users_info approver ON kir.approved_by = approver.id
       LEFT JOIN team_api_keys tak ON kir.issued_api_key_id = tak.id
       ORDER BY kir.created_at DESC`
    );
    return rows;
  }

  async findById(id: number): Promise<KeyIssueRequestRow | null> {
    const [rows] = await this.pool.execute<KeyIssueRequestRow[]>(
      `SELECT 
        kir.*,
        t.name as team_name,
        u.email as requester_email,
        approver.email as approver_email,
        tak.key_prefix
       FROM key_issue_requests kir
       JOIN teams_info t ON kir.team_id = t.id
       JOIN users_info u ON kir.requester_id = u.id
       LEFT JOIN users_info approver ON kir.approved_by = approver.id
       LEFT JOIN team_api_keys tak ON kir.issued_api_key_id = tak.id
       WHERE kir.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByRequesterId(requesterId: number): Promise<KeyIssueRequestRow[]> {
    const [rows] = await this.pool.execute<KeyIssueRequestRow[]>(
      `SELECT 
        kir.*,
        t.name as team_name,
        u.email as requester_email,
        approver.email as approver_email,
        tak.key_prefix
       FROM key_issue_requests kir
       JOIN teams_info t ON kir.team_id = t.id
       JOIN users_info u ON kir.requester_id = u.id
       LEFT JOIN users_info approver ON kir.approved_by = approver.id
       LEFT JOIN team_api_keys tak ON kir.issued_api_key_id = tak.id
       WHERE kir.requester_id = ?
       ORDER BY kir.created_at DESC`,
      [requesterId]
    );
    return rows;
  }

  async findPendingByTeamAndRequester(teamId: number, requesterId: number): Promise<KeyIssueRequestRow | null> {
    const [rows] = await this.pool.execute<KeyIssueRequestRow[]>(
      `SELECT 
        kir.*,
        t.name as team_name,
        u.email as requester_email,
        NULL as approver_email,
        NULL as key_prefix
       FROM key_issue_requests kir
       JOIN teams_info t ON kir.team_id = t.id
       JOIN users_info u ON kir.requester_id = u.id
       WHERE kir.team_id = ? AND kir.requester_id = ? AND kir.status = 'pending'`,
      [teamId, requesterId]
    );
    return rows[0] || null;
  }

  async findPendingCount(): Promise<number> {
    const [rows] = await this.pool.execute<(RowDataPacket & { count: number })[]>(
      `SELECT COUNT(*) as count FROM key_issue_requests WHERE status = 'pending'`
    );
    return rows[0]?.count || 0;
  }

  async approve(
    id: number,
    approvedBy: number,
    issuedApiKeyId: number,
    allowedModels?: string[],
    monthlyLimitUsd?: number
  ): Promise<void> {
    let query = `UPDATE key_issue_requests 
                 SET status = 'approved', approved_by = ?, approved_at = NOW(), issued_api_key_id = ?`;
    const params: (number | string)[] = [approvedBy, issuedApiKeyId];

    if (allowedModels) {
      query += `, allowed_models = ?`;
      params.push(JSON.stringify(allowedModels));
    }
    if (monthlyLimitUsd !== undefined) {
      query += `, monthly_limit_usd = ?`;
      params.push(monthlyLimitUsd);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await this.pool.execute(query, params);
  }

  async reject(id: number, rejectedBy: number): Promise<void> {
    await this.pool.execute(
      `UPDATE key_issue_requests 
       SET status = 'rejected', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [rejectedBy, id]
    );
  }

  async markIssued(id: number): Promise<void> {
    await this.pool.execute(
      `UPDATE key_issue_requests SET status = 'issued', revealed_at = NOW() WHERE id = ?`,
      [id]
    );
  }
}
