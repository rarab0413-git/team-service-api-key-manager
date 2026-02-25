import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabasePool } from '../common/config/database.config';

export interface ApiKeyRow extends RowDataPacket {
  id: number;
  team_id: number;
  encrypted_key: string;
  key_prefix: string;
  status: 'active' | 'revoked' | 'expired';
  allowed_models: string;
  allowed_features: string;
  monthly_limit_usd: number;
  created_at: Date;
  revoked_at: Date | null;
  team_name?: string;
}

@Injectable()
export class ApiKeysRepository implements OnModuleInit {
  private pool: Pool;

  onModuleInit() {
    this.pool = getDatabasePool();
  }

  async findAll(): Promise<ApiKeyRow[]> {
    const [rows] = await this.pool.execute<ApiKeyRow[]>(`
      SELECT ak.*, t.name as team_name 
      FROM team_api_keys ak
      JOIN teams_info t ON ak.team_id = t.id
      ORDER BY ak.created_at DESC
    `);
    return rows;
  }

  async findById(id: number): Promise<ApiKeyRow | null> {
    const [rows] = await this.pool.execute<ApiKeyRow[]>(`
      SELECT ak.*, t.name as team_name 
      FROM team_api_keys ak
      JOIN teams_info t ON ak.team_id = t.id
      WHERE ak.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async findByTeamId(teamId: number): Promise<ApiKeyRow[]> {
    const [rows] = await this.pool.execute<ApiKeyRow[]>(`
      SELECT ak.*, t.name as team_name 
      FROM team_api_keys ak
      JOIN teams_info t ON ak.team_id = t.id
      WHERE ak.team_id = ?
      ORDER BY ak.created_at DESC
    `, [teamId]);
    return rows;
  }

  async findAllActive(): Promise<ApiKeyRow[]> {
    const [rows] = await this.pool.execute<ApiKeyRow[]>(`
      SELECT ak.*, t.name as team_name 
      FROM team_api_keys ak
      JOIN teams_info t ON ak.team_id = t.id
      WHERE ak.status = 'active'
    `);
    return rows;
  }

  async findActiveByPrefix(prefix: string): Promise<ApiKeyRow | null> {
    const [rows] = await this.pool.execute<ApiKeyRow[]>(`
      SELECT ak.*, t.name as team_name 
      FROM team_api_keys ak
      JOIN teams_info t ON ak.team_id = t.id
      WHERE ak.key_prefix = ? AND ak.status = 'active'
    `, [prefix]);
    return rows[0] || null;
  }

  async create(data: {
    teamId: number;
    encryptedKey: string;
    keyPrefix: string;
    allowedModels: string[];
    allowedFeatures: string[];
    monthlyLimitUsd: number;
  }): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO team_api_keys (team_id, encrypted_key, key_prefix, allowed_models, allowed_features, monthly_limit_usd) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.teamId,
        data.encryptedKey,
        data.keyPrefix,
        JSON.stringify(data.allowedModels),
        JSON.stringify(data.allowedFeatures),
        data.monthlyLimitUsd,
      ]
    );
    return result.insertId;
  }

  async revoke(id: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE team_api_keys SET status = 'revoked', revoked_at = NOW() WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async updateAllowedModels(id: number, models: string[]): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE team_api_keys SET allowed_models = ? WHERE id = ?`,
      [JSON.stringify(models), id]
    );
    return result.affectedRows > 0;
  }

  async updateAllowedFeatures(id: number, features: string[]): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE team_api_keys SET allowed_features = ? WHERE id = ?`,
      [JSON.stringify(features), id]
    );
    return result.affectedRows > 0;
  }
}





