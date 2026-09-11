import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/config/db';

const app = createApp();
const DEMO_PASSWORD = 'Password@123';

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const baseProduct = {
  product_name: 'Phase5 Test Widget',
  sku: `P5-WIDGET-${Date.now()}`,
  category: 'Electronics',
  unit_price: 499.5,
  minimum_stock_quantity: 5,
  warehouse_location: 'Shelf T-01',
  initial_stock: 20,
};

let adminToken: string;
let salesToken: string;
let warehouseToken: string;
let accountsToken: string;
let productId: string;
let stockProductId: string;

beforeAll(async () => {
  adminToken = await login('admin@fundflow.local');
  salesToken = await login('sales@fundflow.local');
  warehouseToken = await login('warehouse@fundflow.local');
  accountsToken = await login('accounts@fundflow.local');
});

describe('Products — list access', () => {
  it('allows ADMIN to list products', async () => {
    const res = await request(app).get('/api/products').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  it('allows SALES to list products', async () => {
    const res = await request(app).get('/api/products').set(auth(salesToken));
    expect(res.status).toBe(200);
  });

  it('allows WAREHOUSE to list products', async () => {
    const res = await request(app).get('/api/products').set(auth(warehouseToken));
    expect(res.status).toBe(200);
  });

  it('allows ACCOUNTS to list products', async () => {
    const res = await request(app).get('/api/products').set(auth(accountsToken));
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated product list with 401', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });
});

describe('Products — create / update RBAC', () => {
  it('allows ADMIN to create product with opening stock movement', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(adminToken))
      .send({ ...baseProduct, sku: `P5-ADMIN-${Date.now()}` });
    expect(res.status).toBe(201);
    expect(res.body.data.current_stock).toBe(20);
    expect(res.body.data.is_low_stock).toBe(false);
    productId = res.body.data.id;

    const movements = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productId, movement_type: 'IN' })
      .set(auth(adminToken));
    expect(movements.status).toBe(200);
    expect(movements.body.data.some((m: { reason: string }) => m.reason.includes('Opening stock'))).toBe(
      true,
    );
  });

  it('allows WAREHOUSE to create product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(warehouseToken))
      .send({
        ...baseProduct,
        sku: `P5-WH-${Date.now()}`,
        product_name: 'Warehouse Created Item',
        initial_stock: 10,
      });
    expect(res.status).toBe(201);
    stockProductId = res.body.data.id;
  });

  it('rejects SALES create with 403', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(salesToken))
      .send({ ...baseProduct, sku: `P5-SALES-${Date.now()}` });
    expect(res.status).toBe(403);
  });

  it('rejects ACCOUNTS create with 403', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(accountsToken))
      .send({ ...baseProduct, sku: `P5-ACC-${Date.now()}` });
    expect(res.status).toBe(403);
  });

  it('allows ADMIN to update product without changing stock', async () => {
    const before = await request(app).get(`/api/products/${productId}`).set(auth(adminToken));
    const stockBefore = before.body.data.current_stock;

    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set(auth(adminToken))
      .send({
        product_name: 'Phase5 Test Widget Updated',
        sku: before.body.data.sku,
        category: 'Electronics',
        unit_price: 550,
        minimum_stock_quantity: 5,
        warehouse_location: 'Shelf T-02',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.product_name).toBe('Phase5 Test Widget Updated');
    expect(res.body.data.current_stock).toBe(stockBefore);
  });

  it('rejects product update that tries to set current_stock directly', async () => {
    const before = await request(app).get(`/api/products/${productId}`).set(auth(adminToken));
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set(auth(adminToken))
      .send({
        product_name: before.body.data.product_name,
        sku: before.body.data.sku,
        category: before.body.data.category,
        unit_price: Number(before.body.data.unit_price),
        minimum_stock_quantity: before.body.data.minimum_stock_quantity,
        warehouse_location: before.body.data.warehouse_location,
        current_stock: 99999,
      });
    expect(res.status).toBe(400);

    const after = await request(app).get(`/api/products/${productId}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBe(before.body.data.current_stock);
  });

  it('allows WAREHOUSE to update product', async () => {
    const before = await request(app).get(`/api/products/${stockProductId}`).set(auth(warehouseToken));
    const res = await request(app)
      .put(`/api/products/${stockProductId}`)
      .set(auth(warehouseToken))
      .send({
        product_name: 'Warehouse Updated Item',
        sku: before.body.data.sku,
        category: 'Electronics',
        unit_price: 100,
        minimum_stock_quantity: 2,
        warehouse_location: 'Bay W-01',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.product_name).toBe('Warehouse Updated Item');
  });

  it('rejects SALES update with 403', async () => {
    const before = await request(app).get(`/api/products/${productId}`).set(auth(adminToken));
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set(auth(salesToken))
      .send({
        product_name: before.body.data.product_name,
        sku: before.body.data.sku,
        category: before.body.data.category,
        unit_price: Number(before.body.data.unit_price),
        minimum_stock_quantity: before.body.data.minimum_stock_quantity,
        warehouse_location: before.body.data.warehouse_location,
      });
    expect(res.status).toBe(403);
  });

  it('rejects ACCOUNTS update with 403', async () => {
    const before = await request(app).get(`/api/products/${productId}`).set(auth(adminToken));
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set(auth(accountsToken))
      .send({
        product_name: before.body.data.product_name,
        sku: before.body.data.sku,
        category: before.body.data.category,
        unit_price: Number(before.body.data.unit_price),
        minimum_stock_quantity: before.body.data.minimum_stock_quantity,
        warehouse_location: before.body.data.warehouse_location,
      });
    expect(res.status).toBe(403);
  });
});

describe('Products — detail / filters / validation', () => {
  it('returns product detail with low-stock flag', async () => {
    const res = await request(app).get(`/api/products/${productId}`).set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('is_low_stock');
    expect(res.body.data).toHaveProperty('current_stock');
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  it('returns 404 for nonexistent product', async () => {
    const res = await request(app)
      .get('/api/products/00000000-0000-4000-8000-000000000099')
      .set(auth(adminToken));
    expect(res.status).toBe(404);
  });

  it('supports search', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ search: 'Paper' })
      .set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('supports category filtering', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ category: 'Stationery' })
      .set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data.every((p: { category: string }) => p.category === 'Stationery')).toBe(true);
  });

  it('supports low-stock filtering', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ low_stock: 'true' })
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every(
        (p: { current_stock: number; minimum_stock_quantity: number; is_low_stock: boolean }) =>
          p.is_low_stock === true && p.current_stock <= p.minimum_stock_quantity,
      ),
    ).toBe(true);
  });

  it('supports pagination', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ page: 1, limit: 2 })
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2 });
  });

  it('rejects missing required product fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(adminToken))
      .send({ product_name: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(adminToken))
      .send({ ...baseProduct, sku: `P5-BADPRICE-${Date.now()}`, unit_price: -10 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid minimum stock', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth(adminToken))
      .send({
        ...baseProduct,
        sku: `P5-BADMIN-${Date.now()}`,
        minimum_stock_quantity: -1,
      });
    expect(res.status).toBe(400);
  });
});

describe('Stock movements — RBAC and behavior', () => {
  it('rejects unauthenticated stock movement list with 401', async () => {
    const res = await request(app).get('/api/stock-movements');
    expect(res.status).toBe(401);
  });

  it('allows ADMIN to create IN movement and increases stock', async () => {
    const before = await request(app).get(`/api/products/${stockProductId}`).set(auth(adminToken));
    const stockBefore = before.body.data.current_stock;

    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(adminToken))
      .send({
        product_id: stockProductId,
        quantity: 5,
        movement_type: 'IN',
        reason: 'Admin replenishment',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.movement_type).toBe('IN');
    expect(res.body.data.created_by).toEqual(expect.any(String));
    expect(res.body.data.created_at).toEqual(expect.any(String));
    expect(res.body.data.product_current_stock).toBe(stockBefore + 5);

    const after = await request(app).get(`/api/products/${stockProductId}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBe(stockBefore + 5);
  });

  it('allows WAREHOUSE to create IN movement', async () => {
    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(warehouseToken))
      .send({
        product_id: stockProductId,
        quantity: 2,
        movement_type: 'IN',
        reason: 'Warehouse intake',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.created_by_email).toBe('warehouse@fundflow.local');
  });

  it('rejects SALES create movement with 403', async () => {
    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(salesToken))
      .send({
        product_id: stockProductId,
        quantity: 1,
        movement_type: 'IN',
        reason: 'Nope',
      });
    expect(res.status).toBe(403);
  });

  it('rejects ACCOUNTS create movement with 403', async () => {
    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(accountsToken))
      .send({
        product_id: stockProductId,
        quantity: 1,
        movement_type: 'OUT',
        reason: 'Nope',
      });
    expect(res.status).toBe(403);
  });

  it('OUT movement decreases current_stock and records movement', async () => {
    const before = await request(app).get(`/api/products/${stockProductId}`).set(auth(adminToken));
    const stockBefore = before.body.data.current_stock;
    const movementsBefore = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: stockProductId })
      .set(auth(adminToken));
    const countBefore = movementsBefore.body.pagination.total;

    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(warehouseToken))
      .send({
        product_id: stockProductId,
        quantity: 3,
        movement_type: 'OUT',
        reason: 'Damaged goods write-off',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.product_current_stock).toBe(stockBefore - 3);

    const after = await request(app).get(`/api/products/${stockProductId}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBe(stockBefore - 3);

    const movementsAfter = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: stockProductId })
      .set(auth(adminToken));
    expect(movementsAfter.body.pagination.total).toBe(countBefore + 1);
  });

  it('rejects invalid movement quantity', async () => {
    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(adminToken))
      .send({
        product_id: stockProductId,
        quantity: 0,
        movement_type: 'IN',
        reason: 'Invalid qty',
      });
    expect(res.status).toBe(400);
  });

  it('rejects invalid movement type', async () => {
    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(adminToken))
      .send({
        product_id: stockProductId,
        quantity: 1,
        movement_type: 'TRANSFER',
        reason: 'Invalid type',
      });
    expect(res.status).toBe(400);
  });

  it('rejects OUT greater than stock, leaves stock unchanged, and creates no movement', async () => {
    const before = await request(app).get(`/api/products/${stockProductId}`).set(auth(adminToken));
    const stockBefore = before.body.data.current_stock;
    const movementsBefore = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: stockProductId })
      .set(auth(adminToken));
    const countBefore = movementsBefore.body.pagination.total;

    const res = await request(app)
      .post('/api/stock-movements')
      .set(auth(adminToken))
      .send({
        product_id: stockProductId,
        quantity: stockBefore + 50,
        movement_type: 'OUT',
        reason: 'Should fail',
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient stock/i);

    const after = await request(app).get(`/api/products/${stockProductId}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBe(stockBefore);
    expect(after.body.data.current_stock).toBeGreaterThanOrEqual(0);

    const movementsAfter = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: stockProductId })
      .set(auth(adminToken));
    expect(movementsAfter.body.pagination.total).toBe(countBefore);
  });

  it('prevents concurrent OUTs from driving stock negative', async () => {
    const create = await request(app)
      .post('/api/products')
      .set(auth(adminToken))
      .send({
        product_name: 'Concurrency Lock Item',
        sku: `P5-LOCK-${Date.now()}`,
        category: 'Safety',
        unit_price: 10,
        minimum_stock_quantity: 0,
        warehouse_location: 'Lock Bay',
        initial_stock: 10,
      });
    expect(create.status).toBe(201);
    const id = create.body.data.id as string;

    const [first, second] = await Promise.all([
      request(app)
        .post('/api/stock-movements')
        .set(auth(adminToken))
        .send({ product_id: id, quantity: 7, movement_type: 'OUT', reason: 'Concurrent A' }),
      request(app)
        .post('/api/stock-movements')
        .set(auth(warehouseToken))
        .send({ product_id: id, quantity: 6, movement_type: 'OUT', reason: 'Concurrent B' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const after = await request(app).get(`/api/products/${id}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBeGreaterThanOrEqual(0);
    expect([3, 4]).toContain(after.body.data.current_stock);

    const negativeCheck = await pool.query<{ current_stock: number }>(
      'SELECT current_stock FROM products WHERE id = $1',
      [id],
    );
    expect(Number(negativeCheck.rows[0].current_stock)).toBeGreaterThanOrEqual(0);
  });
});
