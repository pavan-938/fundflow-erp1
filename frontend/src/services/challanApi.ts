import { apiRequest } from './api';
import type {
  ChallanDetail,
  ChallanListResponse,
  ChallanStatus,
  CreateChallanPayload,
  UpdateChallanPayload,
} from '../types';

export type ChallanListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ChallanStatus | '';
  customer_id?: string;
};

function toQuery(params: ChallanListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status) query.set('status', params.status);
  if (params.customer_id) query.set('customer_id', params.customer_id);
  const value = query.toString();
  return value ? `?${value}` : '';
}

export async function getChallans(params: ChallanListParams = {}): Promise<ChallanListResponse> {
  return apiRequest<ChallanListResponse>(`/challans${toQuery(params)}`);
}

export async function getChallan(id: string): Promise<{ data: ChallanDetail }> {
  return apiRequest<{ data: ChallanDetail }>(`/challans/${id}`);
}

export async function createChallan(input: CreateChallanPayload): Promise<{ data: ChallanDetail }> {
  return apiRequest<{ data: ChallanDetail }>('/challans', {
    method: 'POST',
    body: input,
  });
}

export async function updateChallan(
  id: string,
  input: UpdateChallanPayload,
): Promise<{ data: ChallanDetail }> {
  return apiRequest<{ data: ChallanDetail }>(`/challans/${id}`, {
    method: 'PUT',
    body: input,
  });
}

export async function confirmChallan(id: string): Promise<{ data: ChallanDetail }> {
  return apiRequest<{ data: ChallanDetail }>(`/challans/${id}/confirm`, {
    method: 'POST',
  });
}

export async function cancelChallan(id: string): Promise<{ data: ChallanDetail }> {
  return apiRequest<{ data: ChallanDetail }>(`/challans/${id}/cancel`, {
    method: 'POST',
  });
}
