import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // Zod-style errors if thrown with name ZodError
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
    const zodErr = err as unknown as { issues: Array<{ path: (string | number)[]; message: string }> };
    res.status(400).json({
      message: 'Validation failed',
      errors: zodErr.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found' });
}
