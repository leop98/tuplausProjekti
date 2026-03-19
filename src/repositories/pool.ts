import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function createPool(config: DbConfig): Pool {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
  });
}