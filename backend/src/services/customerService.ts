import * as customerRepository from '../repositories/customerRepository';
import type {
  CreateCustomerInput,
  CreateFollowUpInput,
  CustomerListQuery,
} from '../schemas/customerSchemas';
import { AppError } from '../utils/AppError';

export async function listCustomers(query: CustomerListQuery) {
  const { data, total } = await customerRepository.listCustomers(query);
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

export async function getCustomerById(id: string) {
  const customer = await customerRepository.findCustomerById(id);
  if (!customer) {
    throw new AppError(404, 'Customer not found');
  }

  const followUps = await customerRepository.listFollowUps(id);
  return { ...customer, follow_ups: followUps };
}

export async function createCustomer(input: CreateCustomerInput) {
  return customerRepository.createCustomer(input);
}

export async function updateCustomer(id: string, input: CreateCustomerInput) {
  const existing = await customerRepository.findCustomerById(id);
  if (!existing) {
    throw new AppError(404, 'Customer not found');
  }
  const updated = await customerRepository.updateCustomer(id, input);
  if (!updated) {
    throw new AppError(404, 'Customer not found');
  }
  return updated;
}

/**
 * Hard delete is allowed only when no sales challans reference the customer.
 * Follow-ups cascade via FK ON DELETE CASCADE.
 */
export async function deleteCustomer(id: string) {
  const existing = await customerRepository.findCustomerById(id);
  if (!existing) {
    throw new AppError(404, 'Customer not found');
  }

  const challanCount = await customerRepository.countChallansForCustomer(id);
  if (challanCount > 0) {
    throw new AppError(
      409,
      'Cannot delete customer with existing sales challans. Set status to INACTIVE instead.',
    );
  }

  const deleted = await customerRepository.deleteCustomer(id);
  if (!deleted) {
    throw new AppError(404, 'Customer not found');
  }
}

export async function addFollowUp(customerId: string, createdBy: string, input: CreateFollowUpInput) {
  const existing = await customerRepository.findCustomerById(customerId);
  if (!existing) {
    throw new AppError(404, 'Customer not found');
  }
  return customerRepository.createFollowUp(customerId, createdBy, input);
}
