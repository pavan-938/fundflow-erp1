import { apiRequest } from './api';
import type {
  CreateStockMovementInput,
  MovementType,
  StockMovement,
  StockMovementListResponse,
} from '../types';

export type StockMovementListParams = {
  page?: number;
  limit?: number;
  product_id?: string;
  movement_type?: MovementType | '';
};

function toQuery(params: StockMovementListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.product_id) query.set('product_id', params.product_id);
  if (params.movement_type) query.set('movement_type', params.movement_type);
  const value = query.toString();
  return value ? `?${value}` : '';
}

export async function getStockMovements(
  params: StockMovementListParams = {},
): Promise<StockMovementListResponse> {
  return apiRequest<StockMovementListResponse>(`/stock-movements${toQuery(params)}`);
}

export async function createStockMovement(
  input: CreateStockMovementInput,
): Promise<{ data: StockMovement }> {
  return apiRequest<{ data: StockMovement }>('/stock-movements', {
    method: 'POST',
    body: input,
  });
}
