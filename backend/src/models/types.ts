export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type MovementType = 'IN' | 'OUT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  customer_name: string;
  mobile_number: string;
  email: string | null;
  business_name: string;
  gst_number: string | null;
  customer_type: CustomerType;
  address: string;
  status: CustomerStatus;
  follow_up_date: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  unit_price: string;
  current_stock: number;
  minimum_stock_quantity: number;
  warehouse_location: string;
  created_at: Date;
  updated_at: Date;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity_changed: number;
  movement_type: MovementType;
  reason: string;
  created_by: string;
  created_at: Date;
}

export interface SalesChallan {
  id: string;
  challan_number: string;
  customer_id: string;
  total_quantity: number;
  status: ChallanStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerFollowUp {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date: string | null;
  created_by: string;
  created_at: Date;
  created_by_name?: string;
  created_by_email?: string;
}
