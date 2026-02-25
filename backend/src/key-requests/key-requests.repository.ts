import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabasePool } from '../common/config/database.config';

export interface KeyRevealRequestRow extends RowDataPacket {
  id: number;
  api_key_id: number;
  requester_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'revealed';
  approved_by: number | null;
  approved_at: Date | null;
  revealed_at: Date | null;
  created_at: Date;
  // JOIN 필드
  requester_email?: string;
  approver_email?: string;
  key_prefix?: string;
  team_name?: string;
  team_id?: number;
}

@Injectable()
export class KeyRequestsRepository implements OnModuleInit {
  private pool: Pool;

  onModuleInit() {
    this.pool = getDatabasePool();
  }

  async findAll(): Promise<KeyRevealRequestRow[]> {
    const [rows] = await this.pool.execute<KeyRevealRequestRow[]>(`
      SELECT 
        kr.*,
        req.email as requester_email,
        apr.email as approver_email,
        ak.key_prefix,
        ak.team_id,
        t.name as team_name
      FROM key_reveal_requests kr
      JOIN users_info req ON kr.requester_id = req.id
      LEFT JOIN users_info apr ON kr.approved_by = apr.id
      JOIN team_api_keys ak ON kr.api_key_id = ak.id
      JOIN teams_info t ON ak.team_id = t.id
      ORDER BY kr.created_at DESC
    `);
    return rows;
  }

  async findById(id: number): Promise<KeyRevealRequestRow | null> {
    const [rows] = await this.pool.execute<KeyRevealRequestRow[]>(`
      SELECT 
        kr.*,
        req.email as requester_email,
        apr.email as approver_email,
        ak.key_prefix,
        ak.team_id,
        t.name as team_name
      FROM key_reveal_requests kr
      JOIN users_info req ON kr.requester_id = req.id
      LEFT JOIN users_info apr ON kr.approved_by = apr.id
      JOIN team_api_keys ak ON kr.api_key_id = ak.id
      JOIN teams_info t ON ak.team_id = t.id
      WHERE kr.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async findByRequesterId(requesterId: number): Promise<KeyRevealRequestRow[]> {
    const [rows] = await this.pool.execute<KeyRevealRequestRow[]>(`
      SELECT 
        kr.*,
        req.email as requester_email,
        apr.email as approver_email,
        ak.key_prefix,
        ak.team_id,
        t.name as team_name
      FROM key_reveal_requests kr
      JOIN users_info req ON kr.requester_id = req.id
      LEFT JOIN users_info apr ON kr.approved_by = apr.id
      JOIN team_api_keys ak ON kr.api_key_id = ak.id
      JOIN teams_info t ON ak.team_id = t.id
      WHERE kr.requester_id = ?
      ORDER BY kr.created_at DESC
    `, [requesterId]);
    return rows;
  }

  async findPendingByApiKeyAndRequester(apiKeyId: number, requesterId: number): Promise<KeyRevealRequestRow | null> {
    const [rows] = await this.pool.execute<KeyRevealRequestRow[]>(`
      SELECT * FROM key_reveal_requests 
      WHERE api_key_id = ? AND requester_id = ? AND status = 'pending'
    `, [apiKeyId, requesterId]);
    return rows[0] || null;
  }

  async findApprovedByApiKeyAndRequester(apiKeyId: number, requesterId: number): Promise<KeyRevealRequestRow | null> {
    const [rows] = await this.pool.execute<KeyRevealRequestRow[]>(`
      SELECT * FROM key_reveal_requests 
      WHERE api_key_id = ? AND requester_id = ? AND status = 'approved'
    `, [apiKeyId, requesterId]);
    return rows[0] || null;
  }

  async create(data: { apiKeyId: number; requesterId: number }): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO key_reveal_requests (api_key_id, requester_id) VALUES (?, ?)`,
      [data.apiKeyId, data.requesterId]
    );
    return result.insertId;
  }

  async approve(id: number, approvedBy: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE key_reveal_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ? AND status = 'pending'`,
      [approvedBy, id]
    );
    return result.affectedRows > 0;
  }

  async reject(id: number, approvedBy: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE key_reveal_requests SET status = 'rejected', approved_by = ?, approved_at = NOW() WHERE id = ? AND status = 'pending'`,
      [approvedBy, id]
    );
    return result.affectedRows > 0;
  }

  async markRevealed(id: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE key_reveal_requests SET status = 'revealed', revealed_at = NOW() WHERE id = ? AND status = 'approved'`,
      [id]
    );
    return result.affectedRows > 0;
  }
}
