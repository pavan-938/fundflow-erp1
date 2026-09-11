import type { Product } from '../types';

export function stockStatusLabel(product: Pick<Product, 'is_low_stock'>): string {
  return product.is_low_stock ? 'Low Stock' : 'In Stock';
}

export function stockStatusTone(product: Pick<Product, 'is_low_stock'>): 'warning' | 'success' {
  return product.is_low_stock ? 'warning' : 'success';
}

export function formatMoney(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat(undefined).format(value);
}

export function movementTypeLabel(type: 'IN' | 'OUT'): string {
  return type === 'IN' ? 'Stock In' : 'Stock Out';
}

export function movementTypeTone(type: 'IN' | 'OUT'): 'success' | 'warning' {
  return type === 'IN' ? 'success' : 'warning';
}
