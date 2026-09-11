import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for tests');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required for tests');
}

process.env.NODE_ENV = 'test';
