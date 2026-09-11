import type { NextFunction, Request, Response } from 'express';
import { getValidated } from '../middleware/validate';
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from '../schemas/productSchemas';
import * as productService from '../services/productService';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = getValidated<ProductListQuery>(req, 'query');
    const result = await productService.listProducts(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = getValidated<CreateProductInput>(req, 'body');
    const product = await productService.createProduct(body, req.user!.id);
    res.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const product = await productService.getProductById(id);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getValidated<{ id: string }>(req, 'params');
    const body = getValidated<UpdateProductInput>(req, 'body');
    const product = await productService.updateProduct(id, body);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
}
