import type { NextFunction, Request, Response } from 'express';
import * as authService from '../services/authService';
import type { LoginInput } from '../schemas/authSchemas';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getCurrentUser(req.user!.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}
