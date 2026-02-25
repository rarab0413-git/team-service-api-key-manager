import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabasePool } from '../common/config/database.config';

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  team_id: number | null;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
  // JOIN된 팀 정보
  team_name?: string;
  team_monthly_budget?: number;
}

@Injectable()
export class UsersRepository implements OnModuleInit {
  private pool: Pool;

  onModuleInit() {
    this.pool = getDatabasePool();
  }

  async findAll(): Promise<UserRow[]> {
    const [rows] = await this.pool.execute<UserRow[]>(`
      SELECT u.*, t.name as team_name, t.monthly_budget as team_monthly_budget
      FROM users_info u
      LEFT JOIN teams_info t ON u.team_id = t.id
      ORDER BY u.created_at DESC
    `);
    return rows;
  }

  async findById(id: number): Promise<UserRow | null> {
    const [rows] = await this.pool.execute<UserRow[]>(`
      SELECT u.*, t.name as team_name, t.monthly_budget as team_monthly_budget
      FROM users_info u
      LEFT JOIN teams_info t ON u.team_id = t.id
      WHERE u.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await this.pool.execute<UserRow[]>(`
      SELECT u.*, t.name as team_name, t.monthly_budget as team_monthly_budget
      FROM users_info u
      LEFT JOIN teams_info t ON u.team_id = t.id
      WHERE u.email = ?
    `, [email]);
    return rows[0] || null;
  }

  async findByTeamId(teamId: number): Promise<UserRow[]> {
    const [rows] = await this.pool.execute<UserRow[]>(`
      SELECT u.*, t.name as team_name, t.monthly_budget as team_monthly_budget
      FROM users_info u
      LEFT JOIN teams_info t ON u.team_id = t.id
      WHERE u.team_id = ?
      ORDER BY u.created_at DESC
    `, [teamId]);
    return rows;
  }

  async create(email: string, teamId: number | null, role: 'admin' | 'user' = 'user'): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO users_info (email, team_id, role) VALUES (?, ?, ?)',
      [email, teamId, role]
    );
    return result.insertId;
  }

  async updateTeam(id: number, teamId: number | null): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'UPDATE users_info SET team_id = ? WHERE id = ?',
      [teamId, id]
    );
    return result.affectedRows > 0;
  }

  async updateRole(id: number, role: 'admin' | 'user'): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'UPDATE users_info SET role = ? WHERE id = ?',
      [role, id]
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'DELETE FROM users_info WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}
