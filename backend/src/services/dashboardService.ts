import * as dashboardRepository from '../repositories/dashboardRepository';

export async function getSummary() {
  return dashboardRepository.getDashboardSummary();
}
