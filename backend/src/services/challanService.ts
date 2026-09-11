import * as challanRepository from '../repositories/challanRepository';
import type { ChallanListQuery, CreateChallanInput } from '../schemas/challanSchemas';
import { AppError } from '../utils/AppError';

export async function listChallans(query: ChallanListQuery) {
  const { data, total } = await challanRepository.listChallans(query);
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

export async function getChallanById(id: string) {
  const challan = await challanRepository.findChallanDetail(id);
  if (!challan) {
    throw new AppError(404, 'Challan not found');
  }
  return challan;
}

export async function createChallan(input: CreateChallanInput, createdBy: string) {
  return challanRepository.createDraftChallan(input, createdBy);
}

export async function updateChallan(id: string, input: CreateChallanInput) {
  return challanRepository.updateDraftChallan(id, input);
}

export async function confirmChallan(id: string, confirmedBy: string) {
  return challanRepository.confirmChallan(id, confirmedBy);
}

export async function cancelChallan(id: string) {
  return challanRepository.cancelDraftChallan(id);
}
