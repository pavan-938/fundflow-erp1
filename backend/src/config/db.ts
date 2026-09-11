import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl:
    env.nodeEnv === 'production' || env.databaseUrl.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});
