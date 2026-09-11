import { pool } from '../config/db';
import type { CreateStockMovementInput, StockMovementListQuery } from '../schemas/productSchemas';
import { AppError } from '../utils/AppError';

export type StockMovementView = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity_changed: number;
  movement_type: 'IN' | 'OUT';
  reason: string;
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  created_at: Date;
  product_current_stock?: number;
};

export async function listStockMovements(query: StockMovementListQuery): Promise<{
  data: StockMovementView[];
  total: number;
}> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.product_id) {
    params.push(query.product_id);
    conditions.push(`m.product_id = $${params.length}`);
  }

  if (query.movement_type) {
    params.push(query.movement_type);
    conditions.push(`m.movement_type = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM stock_movements m
     ${where}`,
    params,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const offset = (query.page - 1) * query.limit;
  params.push(query.limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const result = await pool.query(
    `SELECT m.id, m.product_id, m.quantity_changed, m.movement_type, m.reason,
            m.created_by, m.created_at,
            p.product_name, p.sku,
            u.name AS created_by_name, u.email AS created_by_email
     FROM stock_movements m
     INNER JOIN products p ON p.id = m.product_id
     INNER JOIN users u ON u.id = m.created_by
     ${where}
     ORDER BY m.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );

  return {
    data: result.rows.map((row) => ({
      id: row.id as string,
      product_id: row.product_id as string,
      product_name: row.product_name as string,
      sku: row.sku as string,
      quantity_changed: Number(row.quantity_changed),
      movement_type: row.movement_type as 'IN' | 'OUT',
      reason: row.reason as string,
      created_by: row.created_by as string,
      created_by_name: row.created_by_name as string,
      created_by_email: row.created_by_email as string,
      created_at: row.created_at as Date,
    })),
    total,
  };
}

/**
 * Atomically applies a stock movement with row-level locking.
 * OUT with insufficient stock throws 409 and leaves stock unchanged.
 */
export async function createStockMovementTransactional(
  input: CreateStockMovementInput,
  createdBy: string,
): Promise<StockMovementView> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      `SELECT id, product_name, sku, current_stock
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [input.product_id],
    );

    if (!productResult.rows[0]) {
      throw new AppError(404, 'Product not found');
    }

    const product = productResult.rows[0];
    const currentStock = Number(product.current_stock);
    let nextStock = currentStock;

    if (input.movement_type === 'IN') {
      nextStock = currentStock + input.quantity;
    } else {
      if (input.quantity > currentStock) {
        throw new AppError(409, 'Insufficient stock', {
          details: {
            product_name: product.product_name,
            available: currentStock,
            requested: input.quantity,
          },
        });
      }
      nextStock = currentStock - input.quantity;
    }

    await client.query(`UPDATE products SET current_stock = $1 WHERE id = $2`, [
      nextStock,
      input.product_id,
    ]);

    const movement = await client.query(
      `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, product_id, quantity_changed, movement_type, reason, created_by, created_at`,
      [input.product_id, input.quantity, input.movement_type, input.reason, createdBy],
    );

    const user = await client.query<{ name: string; email: string }>(
      `SELECT name, email FROM users WHERE id = $1`,
      [createdBy],
    );

    await client.query('COMMIT');

    const row = movement.rows[0];
    return {
      id: row.id as string,
      product_id: row.product_id as string,
      product_name: product.product_name as string,
      sku: product.sku as string,
      quantity_changed: Number(row.quantity_changed),
      movement_type: row.movement_type as 'IN' | 'OUT',
      reason: row.reason as string,
      created_by: row.created_by as string,
      created_by_name: user.rows[0]?.name ?? '',
      created_by_email: user.rows[0]?.email ?? '',
      created_at: row.created_at as Date,
      product_current_stock: nextStock,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
