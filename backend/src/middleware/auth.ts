import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/types';
import { findUserById } from '../repositories/userRepository';
import { AppError } from '../utils/AppError';
import { verifyAccessToken, type PublicUser } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Verifies JWT and loads the current user from the database.
 * Role comes from DB (not trusted from the client body).
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req.header('authorization'));
    if (!token) {
      throw new AppError(401, 'Authentication required');
    }

    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      throw new AppError(401, 'Authentication required');
    }

    // Prefer DB role over token claim in case role changes after issuance
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      if (!roles.includes(req.user.role)) {
        throw new AppError(403, 'You do not have permission to perform this action');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
