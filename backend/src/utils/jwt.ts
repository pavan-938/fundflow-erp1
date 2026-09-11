import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../models/types';
import { AppError } from './AppError';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export function signAccessToken(user: PublicUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new AppError(401, 'Invalid or expired token');
    }

    const { sub, email, role } = decoded as Partial<JwtPayload>;
    if (!sub || !email || !role) {
      throw new AppError(401, 'Invalid or expired token');
    }

    return { sub, email, role };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, 'Invalid or expired token');
  }
}
