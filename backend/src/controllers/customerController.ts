import type { NextFunction, Request, Response } from 'express';
import { getValidated } from '../middleware/validate';
import type {
  CreateCustomerInput,
  CreateFollowUpInput,
  CustomerListQuery,
} from '../schemas/customerSchemas';
import * as customerService from '../services/customerService';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = getValidated<CustomerListQuery>(req, 'query');
    const result = await customerService.listCustomers(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = getValidated<CreateCustomerInput>(req, 'body');
    const customer = await customerService.createCustomer(body);
    res.status(201).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const customer = await customerService.getCustomerById(id);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const body = getValidated<CreateCustomerInput>(req, 'body');
    const customer = await customerService.updateCustomer(id, body);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    await customerService.deleteCustomer(id);
    res.status(200).json({ message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
}

export async function addFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const body = getValidated<CreateFollowUpInput>(req, 'body');
    const followUp = await customerService.addFollowUp(id, req.user!.id, body);
    res.status(201).json({ data: followUp });
  } catch (error) {
    next(error);
  }
}
