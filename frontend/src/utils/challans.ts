import type { ChallanStatus } from '../types';
import { ApiError } from '../services/api';

export function challanStatusLabel(status: ChallanStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function challanStatusTone(status: ChallanStatus): 'warning' | 'success' | 'danger' {
  if (status === 'DRAFT') return 'warning';
  if (status === 'CONFIRMED') return 'success';
  return 'danger';
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.status === 401) return 'Your session has expired. Please sign in again.';
  if (err.status === 403) return 'You do not have permission to perform this action.';
  if (err.status === 404) return err.message || 'Challan not found.';
  if (err.status === 409) {
    if (/insufficient stock/i.test(err.message)) {
      return (
        err.message ||
        'Unable to confirm this challan because the requested stock is no longer available.'
      );
    }
    return err.message || 'This action conflicts with the current challan state.';
  }
  if (err.status === 400 || err.status === 422) {
    return err.message || 'Please check the highlighted fields.';
  }
  if (err.status >= 500) return 'Something went wrong. Please try again.';
  return err.message || fallback;
}
