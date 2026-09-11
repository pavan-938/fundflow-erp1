import { pool } from '../config/db';
import type { Product } from '../models/types';
import type { CreateProductInput, ProductListQuery, UpdateProductInput } from '../schemas/productSchemas';
import { AppError } from '../utils/AppError';

export type ProductView = Product & { is_low_stock: boolean };

function mapProduct(row: Record<string, unknown>): ProductView {
  const currentStock = Number(row.current_stock);
  const minimumStock = Number(row.minimum_stock_quantity);
  return {
    id: row.id as string,
    product_name: row.product_name as string,
    sku: row.sku as string,
    category: row.category as string,
    unit_price: String(row.unit_price),
    current_stock: currentStock,
    minimum_stock_quantity: minimumStock,
    warehouse_location: row.warehouse_location as string,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    is_low_stock: currentStock <= minimumStock,
  };
}

const PRODUCT_SELECT = `
  id, product_name, sku, category, unit_price, current_stock,
  minimum_stock_quantity, warehouse_location, created_at, updated_at
`;

export async function listProducts(query: ProductListQuery): Promise<{ data: ProductView[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.search) {
    params.push(`%${query.search}%`);
    const idx = params.length;
    conditions.push(
      `(product_name ILIKE $${idx} OR sku ILIKE $${idx} OR category ILIKE $${idx})`,
    );
  }

  if (query.category) {
    params.push(query.category);
    conditions.push(`category ILIKE $${params.length}`);
  }

  if (query.low_stock === true) {
    conditions.push('current_stock <= minimum_stock_quantity');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM products ${where}`,
    params,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const offset = (query.page - 1) * query.limit;
  params.push(query.limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const result = await pool.query(
    `SELECT ${PRODUCT_SELECT}
     FROM products
     ${where}
     ORDER BY product_name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );

  return { data: result.rows.map((row) => mapProduct(row)), total };
}

export async function findProductById(id: string): Promise<ProductView | null> {
  const result = await pool.query(
    `SELECT ${PRODUCT_SELECT} FROM products WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!result.rows[0]) return null;
  return mapProduct(result.rows[0]);
}

export async function findProductBySku(sku: string, excludeId?: string): Promise<ProductView | null> {
  const params: unknown[] = [sku];
  let sql = `SELECT ${PRODUCT_SELECT} FROM products WHERE lower(sku) = lower($1)`;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND id <> $2`;
  }
  sql += ' LIMIT 1';
  const result = await pool.query(sql, params);
  if (!result.rows[0]) return null;
  return mapProduct(result.rows[0]);
}

/**
 * Creates a product at stock 0, then records opening stock via IN movement when initial_stock > 0.
 */
export async function createProductWithOptionalOpeningStock(
  input: CreateProductInput,
  createdBy: string,
): Promise<ProductView> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insert = await client.query(
      `INSERT INTO products (
         product_name, sku, category, unit_price, current_stock,
         minimum_stock_quantity, warehouse_location
       ) VALUES ($1, $2, $3, $4, 0, $5, $6)
       RETURNING ${PRODUCT_SELECT}`,
      [
        input.product_name,
        input.sku,
        input.category,
        input.unit_price,
        input.minimum_stock_quantity,
        input.warehouse_location,
      ],
    );

    let row = insert.rows[0];
    const productId = row.id as string;
    const initialStock = input.initial_stock ?? 0;

    if (initialStock > 0) {
      await client.query(
        `SELECT id FROM products WHERE id = $1 FOR UPDATE`,
        [productId],
      );
      const updated = await client.query(
        `UPDATE products SET current_stock = $1 WHERE id = $2
         RETURNING ${PRODUCT_SELECT}`,
        [initialStock, productId],
      );
      await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, 'IN', $3, $4)`,
        [productId, initialStock, 'Opening stock / GRN intake', createdBy],
      );
      row = updated.rows[0];
    }

    await client.query('COMMIT');
    return mapProduct(row);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'A product with this SKU already exists');
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductView | null> {
  try {
    const result = await pool.query(
      `UPDATE products SET
         product_name = $1,
         sku = $2,
         category = $3,
         unit_price = $4,
         minimum_stock_quantity = $5,
         warehouse_location = $6
       WHERE id = $7
       RETURNING ${PRODUCT_SELECT}`,
      [
        input.product_name,
        input.sku,
        input.category,
        input.unit_price,
        input.minimum_stock_quantity,
        input.warehouse_location,
        id,
      ],
    );
    if (!result.rows[0]) return null;
    return mapProduct(result.rows[0]);
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, 'A product with this SKU already exists');
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505',
  );
}
