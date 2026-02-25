import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getDatabasePool } from '../common/config/database.config';

export interface TeamRow extends RowDataPacket {
  id: number;
  name: string;
  monthly_budget: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class TeamsRepository implements OnModuleInit {
  private pool: Pool;

  onModuleInit() {
    this.pool = getDatabasePool();
  }

  async findAll(): Promise<TeamRow[]> {
    const [rows] = await this.pool.execute<TeamRow[]>(
      'SELECT * FROM teams_info ORDER BY created_at DESC'
    );
    return rows;
  }

  async findById(id: number): Promise<TeamRow | null> {
    const [rows] = await this.pool.execute<TeamRow[]>(
      'SELECT * FROM teams_info WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async findByName(name: string): Promise<TeamRow | null> {
    const [rows] = await this.pool.execute<TeamRow[]>(
      'SELECT * FROM teams_info WHERE name = ?',
      [name]
    );
    return rows[0] || null;
  }

  async create(name: string, monthlyBudget: number): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO teams_info (name, monthly_budget) VALUES (?, ?)',
      [name, monthlyBudget]
    );
    return result.insertId;
  }

  async update(id: number, data: { name?: string; monthlyBudget?: number }): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.monthlyBudget !== undefined) {
      fields.push('monthly_budget = ?');
      values.push(data.monthlyBudget);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE teams_info SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'DELETE FROM teams_info WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}





