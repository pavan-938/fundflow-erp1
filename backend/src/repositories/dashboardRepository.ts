import { pool } from '../config/db';

export type DashboardSummary = {
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
    created_at: Date;
  }>;
  recent_stock_movements: Array<{
    id: string;
    product_name: string;
    sku: string;
    quantity_changed: number;
    movement_type: 'IN' | 'OUT';
    reason: string;
    created_by_name: string;
    created_at: Date;
  }>;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [customers, products, lowStockCount, draftChallans, confirmedChallans, lowStockItems, recentChallans, recentMovements] =
    await Promise.all([
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM customers`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM products`),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM products WHERE current_stock <= minimum_stock_quantity`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM sales_challans WHERE status = 'DRAFT'`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM sales_challans WHERE status = 'CONFIRMED'`,
      ),
      pool.query(
        `SELECT id, product_name, sku, current_stock, minimum_stock_quantity, warehouse_location
         FROM products
         WHERE current_stock <= minimum_stock_quantity
         ORDER BY current_stock ASC, product_name ASC
         LIMIT 8`,
      ),
      pool.query(
        `SELECT c.id, c.challan_number, c.status, c.total_quantity, c.created_at,
                cu.customer_name, cu.business_name
         FROM sales_challans c
         INNER JOIN customers cu ON cu.id = c.customer_id
         ORDER BY c.created_at DESC
         LIMIT 8`,
      ),
      pool.query(
        `SELECT m.id, m.quantity_changed, m.movement_type, m.reason, m.created_at,
                p.product_name, p.sku, u.name AS created_by_name
         FROM stock_movements m
         INNER JOIN products p ON p.id = m.product_id
         INNER JOIN users u ON u.id = m.created_by
         ORDER BY m.created_at DESC
         LIMIT 8`,
      ),
    ]);

  return {
    kpis: {
      total_customers: Number(customers.rows[0]?.count ?? 0),
      total_products: Number(products.rows[0]?.count ?? 0),
      low_stock_products: Number(lowStockCount.rows[0]?.count ?? 0),
      draft_challans: Number(draftChallans.rows[0]?.count ?? 0),
      confirmed_challans: Number(confirmedChallans.rows[0]?.count ?? 0),
    },
    low_stock_items: lowStockItems.rows.map((row) => ({
      id: row.id as string,
      product_name: row.product_name as string,
      sku: row.sku as string,
      current_stock: Number(row.current_stock),
      minimum_stock_quantity: Number(row.minimum_stock_quantity),
      warehouse_location: row.warehouse_location as string,
    })),
    recent_challans: recentChallans.rows.map((row) => ({
      id: row.id as string,
      challan_number: row.challan_number as string,
      customer_name: row.customer_name as string,
      business_name: row.business_name as string,
      status: row.status as string,
      total_quantity: Number(row.total_quantity),
      created_at: row.created_at as Date,
    })),
    recent_stock_movements: recentMovements.rows.map((row) => ({
      id: row.id as string,
      product_name: row.product_name as string,
      sku: row.sku as string,
      quantity_changed: Number(row.quantity_changed),
      movement_type: row.movement_type as 'IN' | 'OUT',
      reason: row.reason as string,
      created_by_name: row.created_by_name as string,
      created_at: row.created_at as Date,
    })),
  };
}
