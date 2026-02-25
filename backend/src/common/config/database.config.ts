import * as mysql from 'mysql2/promise';
import { Pool } from 'mysql2/promise';

let pool: Pool | null = null;

export const getDatabasePool = (): Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'api_key_manager',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
};

export const closeDatabasePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};





