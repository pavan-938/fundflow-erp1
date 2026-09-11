import * as stockMovementRepository from '../repositories/stockMovementRepository';
import type { CreateStockMovementInput, StockMovementListQuery } from '../schemas/productSchemas';

export async function listStockMovements(query: StockMovementListQuery) {
  const { data, total } = await stockMovementRepository.listStockMovements(query);
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function createStockMovement(input: CreateStockMovementInput, createdBy: string) {
  return stockMovementRepository.createStockMovementTransactional(input, createdBy);
}
