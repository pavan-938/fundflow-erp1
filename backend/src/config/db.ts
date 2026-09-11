import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Enable TLS when hosted providers require it (e.g. Neon `sslmode=require`).
  // Local Docker Postgres typically has no SSL and leaves this undefined.
  ssl:
    env.nodeEnv === 'production' || env.databaseUrl.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});
