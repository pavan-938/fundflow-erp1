import { apiRequest } from './api';
import type { DashboardSummary } from '../types';

export async function fetchDashboardSummary(): Promise<{ data: DashboardSummary }> {
  return apiRequest<{ data: DashboardSummary }>('/dashboard/summary');
}
