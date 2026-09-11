import { apiRequest } from './api';
import type {
  CreateProductInput,
  Product,
  ProductListResponse,
  UpdateProductInput,
} from '../types';

export type ProductListParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  low_stock?: boolean;
};

function toQuery(params: ProductListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.category?.trim()) query.set('category', params.category.trim());
  if (params.low_stock === true) query.set('low_stock', 'true');
  if (params.low_stock === false) query.set('low_stock', 'false');
  const value = query.toString();
  return value ? `?${value}` : '';
}

export async function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  return apiRequest<ProductListResponse>(`/products${toQuery(params)}`);
}

export async function getProduct(id: string): Promise<{ data: Product }> {
  return apiRequest<{ data: Product }>(`/products/${id}`);
}

export async function createProduct(input: CreateProductInput): Promise<{ data: Product }> {
  return apiRequest<{ data: Product }>('/products', {
    method: 'POST',
    body: input,
  });
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<{ data: Product }> {
  return apiRequest<{ data: Product }>(`/products/${id}`, {
    method: 'PUT',
    body: input,
  });
}
