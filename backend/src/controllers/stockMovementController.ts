import type { NextFunction, Request, Response } from 'express';
import { getValidated } from '../middleware/validate';
import type { CreateStockMovementInput, StockMovementListQuery } from '../schemas/productSchemas';
import * as stockMovementService from '../services/stockMovementService';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = getValidated<StockMovementListQuery>(req, 'query');
    const result = await stockMovementService.listStockMovements(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = getValidated<CreateStockMovementInput>(req, 'body');
    const movement = await stockMovementService.createStockMovement(body, req.user!.id);
    res.status(201).json({ data: movement });
  } catch (error) {
    next(error);
  }
}
