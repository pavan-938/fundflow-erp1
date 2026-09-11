import type { UserRole } from '../models/types';

/**
 * Phase 1 approved permission matrix.
 * Backend routes must enforce these — frontend hiding is not enough.
 */
export const ROLE_PERMISSIONS = {
  customers: {
    // Phase 4: WAREHOUSE gets read-only CRM access for operational visibility
    read: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
    write: ['ADMIN', 'SALES'] as UserRole[],
    delete: ['ADMIN'] as UserRole[],
    followUp: ['ADMIN', 'SALES'] as UserRole[],
  },
  products: {
    read: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
    write: ['ADMIN', 'WAREHOUSE'] as UserRole[],
  },
  stockMovements: {
    read: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
    write: ['ADMIN', 'WAREHOUSE'] as UserRole[],
  },
  challans: {
    // Phase 6: WAREHOUSE gets read-only challan visibility
    read: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
    write: ['ADMIN', 'SALES'] as UserRole[],
    confirm: ['ADMIN', 'SALES'] as UserRole[],
    cancel: ['ADMIN', 'SALES'] as UserRole[],
  },
  usersAdmin: {
    read: ['ADMIN'] as UserRole[],
    write: ['ADMIN'] as UserRole[],
  },
} as const;

export function can(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}
