import * as productRepository from '../repositories/productRepository';
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from '../schemas/productSchemas';
import { AppError } from '../utils/AppError';

export async function listProducts(query: ProductListQuery) {
  const { data, total } = await productRepository.listProducts(query);
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

export async function getProductById(id: string) {
  const product = await productRepository.findProductById(id);
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  return product;
}

export async function createProduct(input: CreateProductInput, createdBy: string) {
  return productRepository.createProductWithOptionalOpeningStock(input, createdBy);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await productRepository.findProductById(id);
  if (!existing) {
    throw new AppError(404, 'Product not found');
  }
  const updated = await productRepository.updateProduct(id, input);
  if (!updated) {
    throw new AppError(404, 'Product not found');
  }
  return updated;
}
