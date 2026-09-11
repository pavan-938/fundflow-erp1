import type { PoolClient } from 'pg';
import { pool } from '../config/db';
import type { ChallanStatus } from '../models/types';
import type { ChallanItemInput, ChallanListQuery, CreateChallanInput } from '../schemas/challanSchemas';
import { AppError } from '../utils/AppError';

export type ChallanItemView = {
  id: string;
  challan_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: string;
  quantity: number;
  created_at: Date;
};

export type ChallanListItem = {
  id: string;
  challan_number: string;
  customer_id: string;
  customer_name: string;
  business_name: string;
  total_quantity: number;
  status: ChallanStatus;
  created_by: string;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
};

export type ChallanDetail = ChallanListItem & {
  customer_email: string | null;
  customer_mobile: string;
  items: ChallanItemView[];
};

export function mergeItemsByProduct(items: ChallanItemInput[]): ChallanItemInput[] {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.product_id, (map.get(item.product_id) ?? 0) + item.quantity);
  }
  return [...map.entries()].map(([product_id, quantity]) => ({ product_id, quantity }));
}

async function nextChallanNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query<{ last_value: number }>(
    `INSERT INTO challan_number_seq (year, last_value)
     VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE
       SET last_value = challan_number_seq.last_value + 1
     RETURNING last_value`,
    [year],
  );
  const seq = result.rows[0].last_value;
  return `SC-${year}-${String(seq).padStart(4, '0')}`;
}

async function loadProductSnapshots(
  client: PoolClient,
  items: ChallanItemInput[],
): Promise<
  Array<{
    product_id: string;
    quantity: number;
    product_name: string;
    sku: string;
    unit_price: string;
  }>
> {
  const snapshots = [];
  for (const item of items) {
    const result = await client.query(
      `SELECT id, product_name, sku, unit_price::text AS unit_price
       FROM products
       WHERE id = $1
       LIMIT 1`,
      [item.product_id],
    );
    if (!result.rows[0]) {
      throw new AppError(404, 'Product not found', {
        details: { product_id: item.product_id },
      });
    }
    snapshots.push({
      product_id: item.product_id,
      quantity: item.quantity,
      product_name: result.rows[0].product_name as string,
      sku: result.rows[0].sku as string,
      unit_price: result.rows[0].unit_price as string,
    });
  }
  return snapshots;
}

async function assertCustomerExists(client: PoolClient, customerId: string): Promise<void> {
  const result = await client.query(`SELECT id FROM customers WHERE id = $1 LIMIT 1`, [customerId]);
  if (!result.rows[0]) {
    throw new AppError(404, 'Customer not found');
  }
}

export async function listChallans(query: ChallanListQuery): Promise<{ data: ChallanListItem[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.status) {
    params.push(query.status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (query.customer_id) {
    params.push(query.customer_id);
    conditions.push(`c.customer_id = $${params.length}`);
  }
  if (query.search) {
    params.push(`%${query.search}%`);
    conditions.push(`c.challan_number ILIKE $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sales_challans c ${where}`,
    params,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const offset = (query.page - 1) * query.limit;
  params.push(query.limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const result = await pool.query(
    `SELECT c.id, c.challan_number, c.customer_id, c.total_quantity, c.status,
            c.created_by, c.created_at, c.updated_at,
            cu.customer_name, cu.business_name,
            u.name AS created_by_name
     FROM sales_challans c
     INNER JOIN customers cu ON cu.id = c.customer_id
     INNER JOIN users u ON u.id = c.created_by
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );

  return {
    data: result.rows.map((row) => ({
      id: row.id as string,
      challan_number: row.challan_number as string,
      customer_id: row.customer_id as string,
      customer_name: row.customer_name as string,
      business_name: row.business_name as string,
      total_quantity: Number(row.total_quantity),
      status: row.status as ChallanStatus,
      created_by: row.created_by as string,
      created_by_name: row.created_by_name as string,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    })),
    total,
  };
}

export async function findChallanDetail(id: string): Promise<ChallanDetail | null> {
  const result = await pool.query(
    `SELECT c.id, c.challan_number, c.customer_id, c.total_quantity, c.status,
            c.created_by, c.created_at, c.updated_at,
            cu.customer_name, cu.business_name, cu.email AS customer_email, cu.mobile_number AS customer_mobile,
            u.name AS created_by_name
     FROM sales_challans c
     INNER JOIN customers cu ON cu.id = c.customer_id
     INNER JOIN users u ON u.id = c.created_by
     WHERE c.id = $1
     LIMIT 1`,
    [id],
  );
  if (!result.rows[0]) return null;

  const items = await pool.query(
    `SELECT id, challan_id, product_id, product_name_snapshot, sku_snapshot,
            unit_price_snapshot::text AS unit_price_snapshot, quantity, created_at
     FROM sales_challan_items
     WHERE challan_id = $1
     ORDER BY created_at ASC`,
    [id],
  );

  const row = result.rows[0];
  return {
    id: row.id as string,
    challan_number: row.challan_number as string,
    customer_id: row.customer_id as string,
    customer_name: row.customer_name as string,
    business_name: row.business_name as string,
    customer_email: (row.customer_email as string | null) ?? null,
    customer_mobile: row.customer_mobile as string,
    total_quantity: Number(row.total_quantity),
    status: row.status as ChallanStatus,
    created_by: row.created_by as string,
    created_by_name: row.created_by_name as string,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    items: items.rows.map((item) => ({
      id: item.id as string,
      challan_id: item.challan_id as string,
      product_id: item.product_id as string,
      product_name_snapshot: item.product_name_snapshot as string,
      sku_snapshot: item.sku_snapshot as string,
      unit_price_snapshot: item.unit_price_snapshot as string,
      quantity: Number(item.quantity),
      created_at: item.created_at as Date,
    })),
  };
}

export async function createDraftChallan(
  input: CreateChallanInput,
  createdBy: string,
): Promise<ChallanDetail> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await assertCustomerExists(client, input.customer_id);

    const merged = mergeItemsByProduct(input.items);
    const snapshots = await loadProductSnapshots(client, merged);
    const totalQuantity = snapshots.reduce((sum, item) => sum + item.quantity, 0);
    const challanNumber = await nextChallanNumber(client);

    const challan = await client.query(
      `INSERT INTO sales_challans (challan_number, customer_id, total_quantity, status, created_by)
       VALUES ($1, $2, $3, 'DRAFT', $4)
       RETURNING id`,
      [challanNumber, input.customer_id, totalQuantity, createdBy],
    );
    const challanId = challan.rows[0].id as string;

    for (const item of snapshots) {
      await client.query(
        `INSERT INTO sales_challan_items (
           challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          challanId,
          item.product_id,
          item.product_name,
          item.sku,
          item.unit_price,
          item.quantity,
        ],
      );
    }

    await client.query('COMMIT');
    const detail = await findChallanDetail(challanId);
    if (!detail) {
      throw new AppError(500, 'Failed to load created challan');
    }
    return detail;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateDraftChallan(
  id: string,
  input: CreateChallanInput,
): Promise<ChallanDetail> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, status FROM sales_challans WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!existing.rows[0]) {
      throw new AppError(404, 'Challan not found');
    }
    if (existing.rows[0].status !== 'DRAFT') {
      throw new AppError(409, 'Only DRAFT challans can be edited');
    }

    await assertCustomerExists(client, input.customer_id);
    const merged = mergeItemsByProduct(input.items);
    const snapshots = await loadProductSnapshots(client, merged);
    const totalQuantity = snapshots.reduce((sum, item) => sum + item.quantity, 0);

    await client.query(`DELETE FROM sales_challan_items WHERE challan_id = $1`, [id]);
    await client.query(
      `UPDATE sales_challans
       SET customer_id = $1, total_quantity = $2
       WHERE id = $3`,
      [input.customer_id, totalQuantity, id],
    );

    for (const item of snapshots) {
      await client.query(
        `INSERT INTO sales_challan_items (
           challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          item.product_id,
          item.product_name,
          item.sku,
          item.unit_price,
          item.quantity,
        ],
      );
    }

    await client.query('COMMIT');
    const detail = await findChallanDetail(id);
    if (!detail) {
      throw new AppError(500, 'Failed to load updated challan');
    }
    return detail;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmChallan(id: string, confirmedBy: string): Promise<ChallanDetail> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const challanResult = await client.query(
      `SELECT id, challan_number, status
       FROM sales_challans
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );
    if (!challanResult.rows[0]) {
      throw new AppError(404, 'Challan not found');
    }

    const challan = challanResult.rows[0];
    if (challan.status === 'CONFIRMED') {
      throw new AppError(409, 'Challan is already confirmed');
    }
    if (challan.status === 'CANCELLED') {
      throw new AppError(409, 'Cancelled challans cannot be confirmed');
    }
    if (challan.status !== 'DRAFT') {
      throw new AppError(409, 'Only DRAFT challans can be confirmed');
    }

    const itemsResult = await client.query(
      `SELECT product_id, quantity, product_name_snapshot, sku_snapshot, unit_price_snapshot
       FROM sales_challan_items
       WHERE challan_id = $1`,
      [id],
    );
    if (itemsResult.rows.length === 0) {
      throw new AppError(400, 'Challan has no items');
    }

    const productIds = [...new Set(itemsResult.rows.map((row) => row.product_id as string))].sort();
    const products = await client.query(
      `SELECT id, product_name, current_stock
       FROM products
       WHERE id = ANY($1::uuid[])
       ORDER BY id ASC
       FOR UPDATE`,
      [productIds],
    );

    if (products.rows.length !== productIds.length) {
      throw new AppError(404, 'One or more products on this challan no longer exist');
    }

    const stockById = new Map(
      products.rows.map((row) => [row.id as string, Number(row.current_stock)]),
    );
    const nameById = new Map(
      products.rows.map((row) => [row.id as string, row.product_name as string]),
    );

    // Aggregate requested qty per product (items may theoretically duplicate)
    const requestedByProduct = new Map<string, number>();
    for (const item of itemsResult.rows) {
      const productId = item.product_id as string;
      requestedByProduct.set(
        productId,
        (requestedByProduct.get(productId) ?? 0) + Number(item.quantity),
      );
    }

    const shortages: Array<{
      product_id: string;
      product_name: string;
      available: number;
      requested: number;
    }> = [];

    for (const [productId, requested] of requestedByProduct.entries()) {
      const available = stockById.get(productId) ?? 0;
      if (requested > available) {
        shortages.push({
          product_id: productId,
          product_name: nameById.get(productId) ?? 'Unknown product',
          available,
          requested,
        });
      }
    }

    if (shortages.length > 0) {
      const first = shortages[0];
      throw new AppError(
        409,
        `Insufficient stock for ${first.product_name}. Available: ${first.available}. Requested: ${first.requested}`,
        { details: shortages },
      );
    }

    // All checks passed — deduct and write OUT movements
    for (const [productId, requested] of requestedByProduct.entries()) {
      const available = stockById.get(productId)!;
      const nextStock = available - requested;
      await client.query(`UPDATE products SET current_stock = $1 WHERE id = $2`, [
        nextStock,
        productId,
      ]);
      await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, 'OUT', $3, $4)`,
        [
          productId,
          requested,
          `Sales challan ${challan.challan_number as string} confirmation`,
          confirmedBy,
        ],
      );
    }

    await client.query(
      `UPDATE sales_challans SET status = 'CONFIRMED' WHERE id = $1`,
      [id],
    );

    await client.query('COMMIT');
    const detail = await findChallanDetail(id);
    if (!detail) {
      throw new AppError(500, 'Failed to load confirmed challan');
    }
    return detail;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelDraftChallan(id: string): Promise<ChallanDetail> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, status FROM sales_challans WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!existing.rows[0]) {
      throw new AppError(404, 'Challan not found');
    }
    if (existing.rows[0].status === 'CANCELLED') {
      throw new AppError(409, 'Challan is already cancelled');
    }
    if (existing.rows[0].status === 'CONFIRMED') {
      throw new AppError(409, 'Confirmed challans cannot be cancelled');
    }
    if (existing.rows[0].status !== 'DRAFT') {
      throw new AppError(409, 'Only DRAFT challans can be cancelled');
    }

    await client.query(`UPDATE sales_challans SET status = 'CANCELLED' WHERE id = $1`, [id]);
    await client.query('COMMIT');

    const detail = await findChallanDetail(id);
    if (!detail) {
      throw new AppError(500, 'Failed to load cancelled challan');
    }
    return detail;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
