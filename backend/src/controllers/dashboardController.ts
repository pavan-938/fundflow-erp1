import type { NextFunction, Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';

export async function summary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getSummary();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
