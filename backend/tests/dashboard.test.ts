import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

async function login(email: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password@123' });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe('Dashboard summary', () => {
  let adminToken: string;
  let salesToken: string;
  let warehouseToken: string;
  let accountsToken: string;

  beforeAll(async () => {
    adminToken = await login('admin@fundflow.local');
    salesToken = await login('sales@fundflow.local');
    warehouseToken = await login('warehouse@fundflow.local');
    accountsToken = await login('accounts@fundflow.local');
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('returns live KPIs for all roles', async () => {
    for (const token of [adminToken, salesToken, warehouseToken, accountsToken]) {
      const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.kpis).toMatchObject({
        total_customers: expect.any(Number),
        total_products: expect.any(Number),
        low_stock_products: expect.any(Number),
        draft_challans: expect.any(Number),
        confirmed_challans: expect.any(Number),
      });
      expect(Array.isArray(res.body.data.low_stock_items)).toBe(true);
      expect(Array.isArray(res.body.data.recent_challans)).toBe(true);
      expect(Array.isArray(res.body.data.recent_stock_movements)).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain('password_hash');
    }
  });
});
