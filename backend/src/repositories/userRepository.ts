import { pool } from '../config/db';
import type { User, UserRole } from '../models/types';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at, updated_at
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export function toPublicUser(user: Pick<User, 'id' | 'name' | 'email' | 'role'>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
