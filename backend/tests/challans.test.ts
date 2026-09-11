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

let adminToken: string;
let salesToken: string;
let warehouseToken: string;
let accountsToken: string;
let customerId: string;
let productAId: string;
let productBId: string;
let draftId: string;
let confirmDraftId: string;
let cancelDraftId: string;
let snapshotDraftId: string;

beforeAll(async () => {
  adminToken = await login('admin@fundflow.local');
  salesToken = await login('sales@fundflow.local');
  warehouseToken = await login('warehouse@fundflow.local');
  accountsToken = await login('accounts@fundflow.local');

  const customers = await request(app).get('/api/customers').query({ search: 'Patel' }).set(auth(adminToken));
  customerId = customers.body.data[0].id;

  const productA = await request(app)
    .post('/api/products')
    .set(auth(adminToken))
    .send({
      product_name: 'Challan Product A',
      sku: `CH-A-${Date.now()}`,
      category: 'Stationery',
      unit_price: 100,
      minimum_stock_quantity: 1,
      warehouse_location: 'CA-01',
      initial_stock: 50,
    });
  expect(productA.status).toBe(201);
  productAId = productA.body.data.id;

  const productB = await request(app)
    .post('/api/products')
    .set(auth(adminToken))
    .send({
      product_name: 'Challan Product B',
      sku: `CH-B-${Date.now()}`,
      category: 'Packaging',
      unit_price: 50,
      minimum_stock_quantity: 1,
      warehouse_location: 'CB-01',
      initial_stock: 5,
    });
  expect(productB.status).toBe(201);
  productBId = productB.body.data.id;
});

describe('Challans — creation & RBAC', () => {
  it('rejects unauthenticated list/create', async () => {
    expect((await request(app).get('/api/challans')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/challans')
          .send({ customer_id: customerId, items: [{ product_id: productAId, quantity: 1 }] })
      ).status,
    ).toBe(401);
  });

  it('allows ADMIN to create draft challan', async () => {
    const stockBefore = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    const movementsBefore = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));

    const res = await request(app)
      .post('/api/challans')
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [
          { product_id: productAId, quantity: 2 },
          { product_id: productBId, quantity: 1 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.challan_number).toMatch(/^SC-\d{4}-\d{4}$/);
    expect(res.body.data.total_quantity).toBe(3);
    expect(res.body.data.created_by).toEqual(expect.any(String));
    expect(res.body.data.items).toHaveLength(2);
    draftId = res.body.data.id;

    const stockAfter = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    expect(stockAfter.body.data.current_stock).toBe(stockBefore.body.data.current_stock);

    const movementsAfter = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));
    expect(movementsAfter.body.pagination.total).toBe(movementsBefore.body.pagination.total);
  });

  it('allows SALES to create draft challan', async () => {
    const res = await request(app)
      .post('/api/challans')
      .set(auth(salesToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: productAId, quantity: 1 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    confirmDraftId = res.body.data.id;

    const cancel = await request(app)
      .post('/api/challans')
      .set(auth(salesToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: productAId, quantity: 1 }],
      });
    cancelDraftId = cancel.body.data.id;
  });

  it('rejects WAREHOUSE and ACCOUNTS create', async () => {
    const payload = {
      customer_id: customerId,
      items: [{ product_id: productAId, quantity: 1 }],
    };
    expect((await request(app).post('/api/challans').set(auth(warehouseToken)).send(payload)).status).toBe(
      403,
    );
    expect((await request(app).post('/api/challans').set(auth(accountsToken)).send(payload)).status).toBe(
      403,
    );
  });

  it('rejects nonexistent customer/product, empty items, invalid quantity', async () => {
    expect(
      (
        await request(app)
          .post('/api/challans')
          .set(auth(adminToken))
          .send({
            customer_id: '00000000-0000-4000-8000-000000000099',
            items: [{ product_id: productAId, quantity: 1 }],
          })
      ).status,
    ).toBe(404);

    expect(
      (
        await request(app)
          .post('/api/challans')
          .set(auth(adminToken))
          .send({
            customer_id: customerId,
            items: [{ product_id: '00000000-0000-4000-8000-000000000099', quantity: 1 }],
          })
      ).status,
    ).toBe(404);

    expect(
      (
        await request(app)
          .post('/api/challans')
          .set(auth(adminToken))
          .send({ customer_id: customerId, items: [] })
      ).status,
    ).toBe(400);

    expect(
      (
        await request(app)
          .post('/api/challans')
          .set(auth(adminToken))
          .send({
            customer_id: customerId,
            items: [{ product_id: productAId, quantity: 0 }],
          })
      ).status,
    ).toBe(400);
  });

  it('merges duplicate product lines safely', async () => {
    const res = await request(app)
      .post('/api/challans')
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [
          { product_id: productAId, quantity: 2 },
          { product_id: productAId, quantity: 3 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(5);
    expect(res.body.data.total_quantity).toBe(5);
  });
});

describe('Challans — snapshots', () => {
  it('stores snapshots and keeps them after product change; draft update refreshes; confirm keeps stored snapshot', async () => {
    const created = await request(app)
      .post('/api/challans')
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: productAId, quantity: 1 }],
      });
    expect(created.status).toBe(201);
    snapshotDraftId = created.body.data.id;
    const originalName = created.body.data.items[0].product_name_snapshot;
    const originalSku = created.body.data.items[0].sku_snapshot;
    const originalPrice = created.body.data.items[0].unit_price_snapshot;

    const product = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    await request(app)
      .put(`/api/products/${productAId}`)
      .set(auth(adminToken))
      .send({
        product_name: 'Renamed After Snapshot',
        sku: product.body.data.sku,
        category: product.body.data.category,
        unit_price: 999,
        minimum_stock_quantity: product.body.data.minimum_stock_quantity,
        warehouse_location: product.body.data.warehouse_location,
      });

    const detail = await request(app).get(`/api/challans/${snapshotDraftId}`).set(auth(adminToken));
    expect(detail.body.data.items[0].product_name_snapshot).toBe(originalName);
    expect(detail.body.data.items[0].sku_snapshot).toBe(originalSku);
    expect(detail.body.data.items[0].unit_price_snapshot).toBe(originalPrice);

    const updated = await request(app)
      .put(`/api/challans/${snapshotDraftId}`)
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: productAId, quantity: 2 }],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.items[0].product_name_snapshot).toBe('Renamed After Snapshot');
    expect(Number(updated.body.data.items[0].unit_price_snapshot)).toBe(999);

    // Restore product name for readability, then confirm and ensure confirm does not rewrite snapshots
    await request(app)
      .put(`/api/products/${productAId}`)
      .set(auth(adminToken))
      .send({
        product_name: 'Changed Again Before Confirm',
        sku: product.body.data.sku,
        category: product.body.data.category,
        unit_price: 1111,
        minimum_stock_quantity: product.body.data.minimum_stock_quantity,
        warehouse_location: product.body.data.warehouse_location,
      });

    const confirmed = await request(app)
      .post(`/api/challans/${snapshotDraftId}/confirm`)
      .set(auth(adminToken));
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.items[0].product_name_snapshot).toBe('Renamed After Snapshot');
    expect(Number(confirmed.body.data.items[0].unit_price_snapshot)).toBe(999);
  });
});

describe('Challans — list/detail/update', () => {
  it('lists with pagination, status filter, customer filter, search', async () => {
    const list = await request(app).get('/api/challans').query({ page: 1, limit: 2 }).set(auth(salesToken));
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeLessThanOrEqual(2);

    const drafts = await request(app)
      .get('/api/challans')
      .query({ status: 'DRAFT' })
      .set(auth(warehouseToken));
    expect(drafts.status).toBe(200);
    expect(drafts.body.data.every((c: { status: string }) => c.status === 'DRAFT')).toBe(true);

    const byCustomer = await request(app)
      .get('/api/challans')
      .query({ customer_id: customerId })
      .set(auth(accountsToken));
    expect(byCustomer.status).toBe(200);

    const detail = await request(app).get(`/api/challans/${draftId}`).set(auth(adminToken));
    const search = await request(app)
      .get('/api/challans')
      .query({ search: detail.body.data.challan_number })
      .set(auth(adminToken));
    expect(search.body.data.some((c: { id: string }) => c.id === draftId)).toBe(true);
  });

  it('allows ADMIN/SALES update draft; rejects warehouse/accounts; blocks non-draft edit', async () => {
    const okAdmin = await request(app)
      .put(`/api/challans/${draftId}`)
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: productAId, quantity: 2 }],
      });
    expect(okAdmin.status).toBe(200);

    const okSales = await request(app)
      .put(`/api/challans/${confirmDraftId}`)
      .set(auth(salesToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: productAId, quantity: 1 }],
      });
    expect(okSales.status).toBe(200);

    expect(
      (
        await request(app)
          .put(`/api/challans/${draftId}`)
          .set(auth(warehouseToken))
          .send({ customer_id: customerId, items: [{ product_id: productAId, quantity: 1 }] })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .put(`/api/challans/${draftId}`)
          .set(auth(accountsToken))
          .send({ customer_id: customerId, items: [{ product_id: productAId, quantity: 1 }] })
      ).status,
    ).toBe(403);

    // snapshotDraftId already confirmed above
    expect(
      (
        await request(app)
          .put(`/api/challans/${snapshotDraftId}`)
          .set(auth(adminToken))
          .send({ customer_id: customerId, items: [{ product_id: productAId, quantity: 1 }] })
      ).status,
    ).toBe(409);
  });
});

describe('Challans — confirmation & stock', () => {
  it('rejects unauthenticated confirm', async () => {
    expect((await request(app).post(`/api/challans/${confirmDraftId}/confirm`)).status).toBe(401);
  });

  it('rejects WAREHOUSE/ACCOUNTS confirm', async () => {
    expect(
      (await request(app).post(`/api/challans/${confirmDraftId}/confirm`).set(auth(warehouseToken))).status,
    ).toBe(403);
    expect(
      (await request(app).post(`/api/challans/${confirmDraftId}/confirm`).set(auth(accountsToken))).status,
    ).toBe(403);
  });

  it('successfully confirms and reduces stock with OUT movements', async () => {
    const beforeA = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    const movementsBefore = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));

    const detail = await request(app).get(`/api/challans/${confirmDraftId}`).set(auth(salesToken));
    const qty = detail.body.data.items[0].quantity as number;

    const res = await request(app)
      .post(`/api/challans/${confirmDraftId}/confirm`)
      .set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');

    const afterA = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    expect(afterA.body.data.current_stock).toBe(beforeA.body.data.current_stock - qty);

    const movementsAfter = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));
    expect(movementsAfter.body.pagination.total).toBe(movementsBefore.body.pagination.total + 1);
    expect(
      movementsAfter.body.data.some((m: { reason: string }) =>
        m.reason.includes(res.body.data.challan_number),
      ),
    ).toBe(true);
  });

  it('rejects double confirmation without further stock change', async () => {
    const before = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    const movementsBefore = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));

    const res = await request(app)
      .post(`/api/challans/${confirmDraftId}/confirm`)
      .set(auth(adminToken));
    expect(res.status).toBe(409);

    const after = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBe(before.body.data.current_stock);
    const movementsAfter = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));
    expect(movementsAfter.body.pagination.total).toBe(movementsBefore.body.pagination.total);
  });

  it('rolls back ALL stock changes when any line has insufficient stock', async () => {
    const beforeA = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    const beforeB = await request(app).get(`/api/products/${productBId}`).set(auth(adminToken));
    const outBeforeA = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));
    const outBeforeB = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productBId, movement_type: 'OUT' })
      .set(auth(adminToken));

    const draft = await request(app)
      .post('/api/challans')
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [
          { product_id: productAId, quantity: 2 },
          { product_id: productBId, quantity: beforeB.body.data.current_stock + 10 },
        ],
      });
    expect(draft.status).toBe(201);

    const confirm = await request(app)
      .post(`/api/challans/${draft.body.data.id}/confirm`)
      .set(auth(adminToken));
    expect(confirm.status).toBe(409);
    expect(confirm.body.message).toMatch(/insufficient stock/i);

    const afterA = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    const afterB = await request(app).get(`/api/products/${productBId}`).set(auth(adminToken));
    expect(afterA.body.data.current_stock).toBe(beforeA.body.data.current_stock);
    expect(afterB.body.data.current_stock).toBe(beforeB.body.data.current_stock);

    const outAfterA = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));
    const outAfterB = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productBId, movement_type: 'OUT' })
      .set(auth(adminToken));
    expect(outAfterA.body.pagination.total).toBe(outBeforeA.body.pagination.total);
    expect(outAfterB.body.pagination.total).toBe(outBeforeB.body.pagination.total);

    const stillDraft = await request(app).get(`/api/challans/${draft.body.data.id}`).set(auth(adminToken));
    expect(stillDraft.body.data.status).toBe('DRAFT');
  });

  it('handles concurrent confirmation: one success, one conflict, stock deducted once', async () => {
    const product = await request(app)
      .post('/api/products')
      .set(auth(adminToken))
      .send({
        product_name: 'Concurrent Confirm Item',
        sku: `CH-CON-${Date.now()}`,
        category: 'Safety',
        unit_price: 20,
        minimum_stock_quantity: 0,
        warehouse_location: 'CC-01',
        initial_stock: 10,
      });
    const pid = product.body.data.id;

    const draft = await request(app)
      .post('/api/challans')
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: pid, quantity: 4 }],
      });
    expect(draft.status).toBe(201);
    const id = draft.body.data.id as string;

    const [first, second] = await Promise.all([
      request(app).post(`/api/challans/${id}/confirm`).set(auth(adminToken)),
      request(app).post(`/api/challans/${id}/confirm`).set(auth(salesToken)),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);

    const after = await request(app).get(`/api/products/${pid}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBe(6);

    const detail = await request(app).get(`/api/challans/${id}`).set(auth(adminToken));
    expect(detail.body.data.status).toBe('CONFIRMED');

    const outs = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: pid, movement_type: 'OUT' })
      .set(auth(adminToken));
    const related = outs.body.data.filter((m: { reason: string }) =>
      m.reason.includes(detail.body.data.challan_number),
    );
    expect(related).toHaveLength(1);
  });
});

describe('Challans — cancellation', () => {
  it('allows ADMIN/SALES cancel draft without stock/movement changes', async () => {
    const before = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    const outsBefore = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));

    const res = await request(app)
      .post(`/api/challans/${cancelDraftId}/cancel`)
      .set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');

    const after = await request(app).get(`/api/products/${productAId}`).set(auth(adminToken));
    expect(after.body.data.current_stock).toBe(before.body.data.current_stock);
    const outsAfter = await request(app)
      .get('/api/stock-movements')
      .query({ product_id: productAId, movement_type: 'OUT' })
      .set(auth(adminToken));
    expect(outsAfter.body.pagination.total).toBe(outsBefore.body.pagination.total);
  });

  it('rejects WAREHOUSE/ACCOUNTS cancel and invalid transitions', async () => {
    const draft = await request(app)
      .post('/api/challans')
      .set(auth(adminToken))
      .send({
        customer_id: customerId,
        items: [{ product_id: productBId, quantity: 1 }],
      });

    expect(
      (await request(app).post(`/api/challans/${draft.body.data.id}/cancel`).set(auth(warehouseToken)))
        .status,
    ).toBe(403);
    expect(
      (await request(app).post(`/api/challans/${draft.body.data.id}/cancel`).set(auth(accountsToken)))
        .status,
    ).toBe(403);

    expect(
      (await request(app).post(`/api/challans/${confirmDraftId}/cancel`).set(auth(adminToken))).status,
    ).toBe(409);
    expect(
      (await request(app).post(`/api/challans/${cancelDraftId}/confirm`).set(auth(adminToken))).status,
    ).toBe(409);

    // cancelled cannot be edited
    expect(
      (
        await request(app)
          .put(`/api/challans/${cancelDraftId}`)
          .set(auth(adminToken))
          .send({ customer_id: customerId, items: [{ product_id: productAId, quantity: 1 }] })
      ).status,
    ).toBe(409);
  });

  it('never allows negative stock via confirmation', async () => {
    const row = await pool.query<{ current_stock: number }>(
      'SELECT current_stock FROM products WHERE id = $1',
      [productBId],
    );
    expect(Number(row.rows[0].current_stock)).toBeGreaterThanOrEqual(0);
  });
});
