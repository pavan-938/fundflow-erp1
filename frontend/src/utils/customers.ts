import type { CustomerStatus, CustomerType } from '../types';

export function customerTypeLabel(type: CustomerType): string {
  switch (type) {
    case 'RETAIL':
      return 'Retail';
    case 'WHOLESALE':
      return 'Wholesale';
    case 'DISTRIBUTOR':
      return 'Distributor';
    default:
      return type;
  }
}

export function customerStatusLabel(status: CustomerStatus): string {
  switch (status) {
    case 'LEAD':
      return 'Lead';
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    default:
      return status;
  }
}

export function customerStatusTone(status: CustomerStatus): 'warning' | 'success' | 'neutral' {
  if (status === 'LEAD') return 'warning';
  if (status === 'ACTIVE') return 'success';
  return 'neutral';
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
