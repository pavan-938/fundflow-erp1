import { pool } from '../config/db';
import type { Customer, CustomerStatus, CustomerType } from '../models/types';
import type { CreateCustomerInput, CustomerListQuery, CreateFollowUpInput } from '../schemas/customerSchemas';

export type CustomerRow = Customer;

export type FollowUpRow = {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date: string | null;
  created_by: string;
  created_at: Date;
  created_by_name: string;
  created_by_email: string;
};

function formatFollowUpDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    // DATE columns from node-pg are midnight in local TZ; avoid UTC shift via toISOString().
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    customer_name: row.customer_name as string,
    mobile_number: row.mobile_number as string,
    email: (row.email as string | null) ?? null,
    business_name: row.business_name as string,
    gst_number: (row.gst_number as string | null) ?? null,
    customer_type: row.customer_type as CustomerType,
    address: row.address as string,
    status: row.status as CustomerStatus,
    follow_up_date: formatFollowUpDate(row.follow_up_date),
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export async function listCustomers(query: CustomerListQuery): Promise<{
  data: Customer[];
  total: number;
}> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.search) {
    params.push(`%${query.search}%`);
    const idx = params.length;
    conditions.push(
      `(customer_name ILIKE $${idx}
        OR mobile_number ILIKE $${idx}
        OR COALESCE(email, '') ILIKE $${idx}
        OR business_name ILIKE $${idx})`,
    );
  }

  if (query.status) {
    params.push(query.status);
    conditions.push(`status = $${params.length}`);
  }

  if (query.customer_type) {
    params.push(query.customer_type);
    conditions.push(`customer_type = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM customers ${where}`,
    params,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const offset = (query.page - 1) * query.limit;
  params.push(query.limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const result = await pool.query(
    `SELECT id, customer_name, mobile_number, email, business_name, gst_number,
            customer_type, address, status, follow_up_date::text AS follow_up_date, notes, created_at, updated_at
     FROM customers
     ${where}
     ORDER BY created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );

  return {
    data: result.rows.map((row) => mapCustomer(row)),
    total,
  };
}

export async function findCustomerById(id: string): Promise<Customer | null> {
  const result = await pool.query(
    `SELECT id, customer_name, mobile_number, email, business_name, gst_number,
            customer_type, address, status, follow_up_date::text AS follow_up_date, notes, created_at, updated_at
     FROM customers
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  if (!result.rows[0]) return null;
  return mapCustomer(result.rows[0]);
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const result = await pool.query(
    `INSERT INTO customers (
       customer_name, mobile_number, email, business_name, gst_number,
       customer_type, address, status, follow_up_date, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, customer_name, mobile_number, email, business_name, gst_number,
               customer_type, address, status, follow_up_date::text AS follow_up_date, notes, created_at, updated_at`,
    [
      input.customer_name,
      input.mobile_number,
      input.email ?? null,
      input.business_name,
      input.gst_number ?? null,
      input.customer_type,
      input.address,
      input.status,
      input.follow_up_date ?? null,
      input.notes ?? null,
    ],
  );
  return mapCustomer(result.rows[0]);
}

export async function updateCustomer(id: string, input: CreateCustomerInput): Promise<Customer | null> {
  const result = await pool.query(
    `UPDATE customers SET
       customer_name = $1,
       mobile_number = $2,
       email = $3,
       business_name = $4,
       gst_number = $5,
       customer_type = $6,
       address = $7,
       status = $8,
       follow_up_date = $9,
       notes = $10
     WHERE id = $11
     RETURNING id, customer_name, mobile_number, email, business_name, gst_number,
               customer_type, address, status, follow_up_date::text AS follow_up_date, notes, created_at, updated_at`,
    [
      input.customer_name,
      input.mobile_number,
      input.email ?? null,
      input.business_name,
      input.gst_number ?? null,
      input.customer_type,
      input.address,
      input.status,
      input.follow_up_date ?? null,
      input.notes ?? null,
      id,
    ],
  );
  if (!result.rows[0]) return null;
  return mapCustomer(result.rows[0]);
}

export async function countChallansForCustomer(customerId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sales_challans WHERE customer_id = $1`,
    [customerId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM customers WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listFollowUps(customerId: string): Promise<FollowUpRow[]> {
  const result = await pool.query(
    `SELECT f.id, f.customer_id, f.note, f.follow_up_date::text AS follow_up_date, f.created_by, f.created_at,
            u.name AS created_by_name, u.email AS created_by_email
     FROM customer_follow_ups f
     INNER JOIN users u ON u.id = f.created_by
     WHERE f.customer_id = $1
     ORDER BY f.created_at DESC`,
    [customerId],
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    customer_id: row.customer_id as string,
    note: row.note as string,
    follow_up_date: formatFollowUpDate(row.follow_up_date),
    created_by: row.created_by as string,
    created_at: row.created_at as Date,
    created_by_name: row.created_by_name as string,
    created_by_email: row.created_by_email as string,
  }));
}

export async function createFollowUp(
  customerId: string,
  createdBy: string,
  input: CreateFollowUpInput,
): Promise<FollowUpRow> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insert = await client.query(
      `INSERT INTO customer_follow_ups (customer_id, note, follow_up_date, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, customer_id, note, follow_up_date::text AS follow_up_date, created_by, created_at`,
      [customerId, input.note, input.follow_up_date ?? null, createdBy],
    );

    if (input.follow_up_date) {
      await client.query(`UPDATE customers SET follow_up_date = $1 WHERE id = $2`, [
        input.follow_up_date,
        customerId,
      ]);
    }

    await client.query('COMMIT');

    const row = insert.rows[0];
    const user = await pool.query<{ name: string; email: string }>(
      `SELECT name, email FROM users WHERE id = $1`,
      [createdBy],
    );

    return {
      id: row.id as string,
      customer_id: row.customer_id as string,
      note: row.note as string,
      follow_up_date: formatFollowUpDate(row.follow_up_date),
      created_by: row.created_by as string,
      created_at: row.created_at as Date,
      created_by_name: user.rows[0]?.name ?? '',
      created_by_email: user.rows[0]?.email ?? '',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
