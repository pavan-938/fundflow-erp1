export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface ApiErrorBody {
  message?: string;
  errors?: Array<{ field?: string; message?: string }> | unknown;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

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
  created_at: string;
  updated_at: string;
}

export interface CustomerFollowUp {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date: string | null;
  created_by: string;
  created_at: string;
  created_by_name: string;
  created_by_email: string;
}

export interface CustomerDetail extends Customer {
  follow_ups: CustomerFollowUp[];
}

export interface CustomerListResponse {
  data: Customer[];
  pagination: Pagination;
}

export interface CustomerInput {
  customer_name: string;
  mobile_number: string;
  email?: string | null;
  business_name: string;
  gst_number?: string | null;
  customer_type: CustomerType;
  address: string;
  status: CustomerStatus;
  follow_up_date?: string | null;
  notes?: string | null;
}

export interface FollowUpInput {
  note: string;
  follow_up_date?: string | null;
}

export type MovementType = 'IN' | 'OUT';

export interface Product {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  unit_price: string;
  current_stock: number;
  minimum_stock_quantity: number;
  warehouse_location: string;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  data: Product[];
  pagination: Pagination;
}

export interface CreateProductInput {
  product_name: string;
  sku: string;
  category: string;
  unit_price: number;
  minimum_stock_quantity: number;
  warehouse_location: string;
  initial_stock?: number;
}

export interface UpdateProductInput {
  product_name: string;
  sku: string;
  category: string;
  unit_price: number;
  minimum_stock_quantity: number;
  warehouse_location: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity_changed: number;
  movement_type: MovementType;
  reason: string;
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  product_current_stock?: number;
}

export interface StockMovementListResponse {
  data: StockMovement[];
  pagination: Pagination;
}

export interface CreateStockMovementInput {
  product_id: string;
  quantity: number;
  movement_type: MovementType;
  reason: string;
}

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanListItem {
  id: string;
  challan_number: string;
  customer_id: string;
  customer_name: string;
  business_name: string;
  total_quantity: number;
  status: ChallanStatus;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ChallanItem {
  id: string;
  challan_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: string;
  quantity: number;
  created_at: string;
}

export interface ChallanDetail extends ChallanListItem {
  customer_email: string | null;
  customer_mobile: string;
  items: ChallanItem[];
}

export interface ChallanListResponse {
  data: ChallanListItem[];
  pagination: Pagination;
}

export interface ChallanItemPayload {
  product_id: string;
  quantity: number;
}

export interface CreateChallanPayload {
  customer_id: string;
  items: ChallanItemPayload[];
}

export type UpdateChallanPayload = CreateChallanPayload;

export interface DashboardSummary {
  kpis: {
    total_customers: number;
    total_products: number;
    low_stock_products: number;
    draft_challans: number;
    confirmed_challans: number;
  };
  low_stock_items: Array<{
    id: string;
    product_name: string;
    sku: string;
    current_stock: number;
    minimum_stock_quantity: number;
    warehouse_location: string;
  }>;
  recent_challans: Array<{
    id: string;
    challan_number: string;
    customer_name: string;
    business_name: string;
    status: string;
    total_quantity: number;
    created_at: string;
  }>;
  recent_stock_movements: Array<{
    id: string;
    product_name: string;
    sku: string;
    quantity_changed: number;
    movement_type: 'IN' | 'OUT';
    reason: string;
    created_by_name: string;
    created_at: string;
  }>;
}

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
}
