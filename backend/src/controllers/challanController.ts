import type { NextFunction, Request, Response } from 'express';
import { getValidated } from '../middleware/validate';
import type { ChallanListQuery, CreateChallanInput } from '../schemas/challanSchemas';
import * as challanService from '../services/challanService';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = getValidated<ChallanListQuery>(req, 'query');
    const result = await challanService.listChallans(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = getValidated<CreateChallanInput>(req, 'body');
    const challan = await challanService.createChallan(body, req.user!.id);
    res.status(201).json({ data: challan });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const challan = await challanService.getChallanById(id);
    res.status(200).json({ data: challan });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const body = getValidated<CreateChallanInput>(req, 'body');
    const challan = await challanService.updateChallan(id, body);
    res.status(200).json({ data: challan });
  } catch (error) {
    next(error);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const challan = await challanService.confirmChallan(id, req.user!.id);
    res.status(200).json({ data: challan });
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const challan = await challanService.cancelChallan(id);
    res.status(200).json({ data: challan });
  } catch (error) {
    next(error);
  }
}
