import { apiRequest } from './api';
import type {
  Customer,
  CustomerDetail,
  CustomerInput,
  CustomerListResponse,
  CustomerStatus,
  CustomerType,
  FollowUpInput,
  CustomerFollowUp,
} from '../types';

export type CustomerListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus | '';
  customer_type?: CustomerType | '';
};

function toQuery(params: CustomerListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status) query.set('status', params.status);
  if (params.customer_type) query.set('customer_type', params.customer_type);
  const value = query.toString();
  return value ? `?${value}` : '';
}

export async function getCustomers(params: CustomerListParams = {}): Promise<CustomerListResponse> {
  return apiRequest<CustomerListResponse>(`/customers${toQuery(params)}`);
}

export async function getCustomer(id: string): Promise<{ data: CustomerDetail }> {
  return apiRequest<{ data: CustomerDetail }>(`/customers/${id}`);
}

export async function createCustomer(input: CustomerInput): Promise<{ data: Customer }> {
  return apiRequest<{ data: Customer }>('/customers', {
    method: 'POST',
    body: input,
  });
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<{ data: Customer }> {
  return apiRequest<{ data: Customer }>(`/customers/${id}`, {
    method: 'PUT',
    body: input,
  });
}

export async function addCustomerFollowUp(
  id: string,
  input: FollowUpInput,
): Promise<{ data: CustomerFollowUp }> {
  return apiRequest<{ data: CustomerFollowUp }>(`/customers/${id}/follow-ups`, {
    method: 'POST',
    body: input,
  });
}
