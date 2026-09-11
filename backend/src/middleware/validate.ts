import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError';

type RequestPart = 'body' | 'query' | 'params';

declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export function validateRequest<T>(schema: ZodType<T>, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.safeParse(req[part]);
      if (!parsed.success) {
        throw new AppError(400, 'Validation failed', {
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || part,
            message: issue.message,
          })),
        });
      }

      if (part === 'body') {
        req.body = parsed.data;
      }

      req.validated = {
        ...(req.validated ?? {}),
        [part]: parsed.data,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getValidated<T>(req: Request, part: RequestPart): T {
  const value = req.validated?.[part];
  if (value === undefined) {
    return req[part] as T;
  }
  return value as T;
}
