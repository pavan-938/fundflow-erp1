import { pool } from '../src/config/db';

export default async function globalTeardown(): Promise<void> {
  await pool.end();
}
