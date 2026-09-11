import type { UserRole } from '../types';

/** Mirrors backend ROLE_PERMISSIONS for UX-only navigation. */
export const NAV_PERMISSIONS = {
  customers: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
  products: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
  stockMovements: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
  challans: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
  dashboard: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[],
};

export const CUSTOMER_WRITE_ROLES: UserRole[] = ['ADMIN', 'SALES'];
export const CUSTOMER_FOLLOW_UP_ROLES: UserRole[] = ['ADMIN', 'SALES'];
export const INVENTORY_WRITE_ROLES: UserRole[] = ['ADMIN', 'WAREHOUSE'];
export const CHALLAN_WRITE_ROLES: UserRole[] = ['ADMIN', 'SALES'];

export function canAccess(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}

export function canWriteCustomers(role: UserRole): boolean {
  return canAccess(role, CUSTOMER_WRITE_ROLES);
}

export function canAddCustomerFollowUps(role: UserRole): boolean {
  return canAccess(role, CUSTOMER_FOLLOW_UP_ROLES);
}

export function canWriteInventory(role: UserRole): boolean {
  return canAccess(role, INVENTORY_WRITE_ROLES);
}

export function canWriteChallans(role: UserRole): boolean {
  return canAccess(role, CHALLAN_WRITE_ROLES);
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'SALES':
      return 'Sales';
    case 'WAREHOUSE':
      return 'Warehouse';
    case 'ACCOUNTS':
      return 'Accounts';
    default:
      return role;
  }
}
