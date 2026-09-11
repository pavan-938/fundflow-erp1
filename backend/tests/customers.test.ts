import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

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

const sampleCustomer = {
  customer_name: 'Nisha Rao',
  mobile_number: '9000011122',
  email: 'nisha@raosupplies.in',
  business_name: 'Rao Supplies',
  gst_number: '29AABCR1111A1Z5',
  customer_type: 'WHOLESALE' as const,
  address: '14 Residency Road, Bengaluru, KA',
  status: 'LEAD' as const,
  follow_up_date: '2026-09-20',
  notes: 'Interested in packaging starter kit.',
};

let adminToken: string;
let salesToken: string;
let warehouseToken: string;
let accountsToken: string;
let createdCustomerId: string;
let deletableCustomerId: string;

beforeAll(async () => {
  adminToken = await login('admin@fundflow.local');
  salesToken = await login('sales@fundflow.local');
  warehouseToken = await login('warehouse@fundflow.local');
  accountsToken = await login('accounts@fundflow.local');
});

describe('Customer CRM — list access', () => {
  it('allows ADMIN to list customers', async () => {
    const res = await request(app).get('/api/customers').set(auth(adminToken));
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

  it('allows SALES to list customers', async () => {
    const res = await request(app).get('/api/customers').set(auth(salesToken));
    expect(res.status).toBe(200);
  });

  it('allows WAREHOUSE to list customers', async () => {
    const res = await request(app).get('/api/customers').set(auth(warehouseToken));
    expect(res.status).toBe(200);
  });

  it('allows ACCOUNTS to list customers', async () => {
    const res = await request(app).get('/api/customers').set(auth(accountsToken));
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated list with 401', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });
});

describe('Customer CRM — create / update RBAC', () => {
  it('allows ADMIN to create customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(adminToken))
      .send(sampleCustomer);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      customer_name: sampleCustomer.customer_name,
      business_name: sampleCustomer.business_name,
      customer_type: 'WHOLESALE',
      status: 'LEAD',
    });
    expect(res.body.data).not.toHaveProperty('password_hash');
    createdCustomerId = res.body.data.id;
  });

  it('allows SALES to create customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(salesToken))
      .send({
        ...sampleCustomer,
        customer_name: 'Sales Created Customer',
        mobile_number: '9000011133',
        email: 'sales.created@example.com',
        business_name: 'Sales Created Co',
      });
    expect(res.status).toBe(201);
    deletableCustomerId = res.body.data.id;
  });

  it('rejects WAREHOUSE create with 403', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(warehouseToken))
      .send(sampleCustomer);
    expect(res.status).toBe(403);
  });

  it('rejects ACCOUNTS create with 403', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(accountsToken))
      .send(sampleCustomer);
    expect(res.status).toBe(403);
  });

  it('allows ADMIN to update customer', async () => {
    const res = await request(app)
      .put(`/api/customers/${createdCustomerId}`)
      .set(auth(adminToken))
      .send({
        ...sampleCustomer,
        status: 'ACTIVE',
        notes: 'Updated by admin',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.notes).toBe('Updated by admin');
  });

  it('allows SALES to update customer', async () => {
    const res = await request(app)
      .put(`/api/customers/${createdCustomerId}`)
      .set(auth(salesToken))
      .send({
        ...sampleCustomer,
        status: 'ACTIVE',
        notes: 'Updated by sales',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('Updated by sales');
  });

  it('rejects WAREHOUSE update with 403', async () => {
    const res = await request(app)
      .put(`/api/customers/${createdCustomerId}`)
      .set(auth(warehouseToken))
      .send(sampleCustomer);
    expect(res.status).toBe(403);
  });

  it('rejects ACCOUNTS update with 403', async () => {
    const res = await request(app)
      .put(`/api/customers/${createdCustomerId}`)
      .set(auth(accountsToken))
      .send(sampleCustomer);
    expect(res.status).toBe(403);
  });
});

describe('Customer CRM — detail / filters / validation', () => {
  it('returns customer detail with follow_ups', async () => {
    const res = await request(app)
      .get(`/api/customers/${createdCustomerId}`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdCustomerId);
    expect(Array.isArray(res.body.data.follow_ups)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  it('returns 404 for nonexistent customer', async () => {
    const res = await request(app)
      .get('/api/customers/00000000-0000-4000-8000-000000000099')
      .set(auth(adminToken));
    expect(res.status).toBe(404);
  });

  it('supports search', async () => {
    const res = await request(app)
      .get('/api/customers')
      .query({ search: 'Patel' })
      .set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.some((c: { business_name: string }) => c.business_name.includes('Patel')),
    ).toBe(true);
  });

  it('supports status filter', async () => {
    const res = await request(app)
      .get('/api/customers')
      .query({ status: 'ACTIVE' })
      .set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: { status: string }) => c.status === 'ACTIVE')).toBe(true);
  });

  it('supports customer_type filter', async () => {
    const res = await request(app)
      .get('/api/customers')
      .query({ customer_type: 'DISTRIBUTOR' })
      .set(auth(salesToken));
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: { customer_type: string }) => c.customer_type === 'DISTRIBUTOR')).toBe(
      true,
    );
  });

  it('supports pagination', async () => {
    const res = await request(app)
      .get('/api/customers')
      .query({ page: 1, limit: 2 })
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2 });
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('rejects invalid customer_type', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(adminToken))
      .send({ ...sampleCustomer, customer_type: 'VIP' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid status', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(adminToken))
      .send({ ...sampleCustomer, status: 'PENDING' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email when supplied', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(adminToken))
      .send({ ...sampleCustomer, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth(adminToken))
      .send({ customer_name: 'Only Name' });
    expect(res.status).toBe(400);
  });
});

describe('Customer CRM — follow-ups', () => {
  it('allows ADMIN to create follow-up', async () => {
    const res = await request(app)
      .post(`/api/customers/${createdCustomerId}/follow-ups`)
      .set(auth(adminToken))
      .send({ note: 'Admin follow-up note', follow_up_date: '2026-09-25' });
    expect(res.status).toBe(201);
    expect(res.body.data.note).toBe('Admin follow-up note');
    expect(res.body.data.created_by_name).toEqual(expect.any(String));
  });

  it('allows SALES to create follow-up without overwriting customer notes', async () => {
    const before = await request(app)
      .get(`/api/customers/${createdCustomerId}`)
      .set(auth(salesToken));
    const notesBefore = before.body.data.notes;

    const res = await request(app)
      .post(`/api/customers/${createdCustomerId}/follow-ups`)
      .set(auth(salesToken))
      .send({ note: 'Sales follow-up note', follow_up_date: '2026-09-28' });
    expect(res.status).toBe(201);

    const after = await request(app)
      .get(`/api/customers/${createdCustomerId}`)
      .set(auth(salesToken));
    expect(after.body.data.notes).toBe(notesBefore);
    expect(after.body.data.follow_ups.some((f: { note: string }) => f.note === 'Sales follow-up note')).toBe(
      true,
    );
    expect(after.body.data.follow_up_date).toBe('2026-09-28');
  });

  it('rejects WAREHOUSE follow-up with 403', async () => {
    const res = await request(app)
      .post(`/api/customers/${createdCustomerId}/follow-ups`)
      .set(auth(warehouseToken))
      .send({ note: 'Nope' });
    expect(res.status).toBe(403);
  });

  it('rejects ACCOUNTS follow-up with 403', async () => {
    const res = await request(app)
      .post(`/api/customers/${createdCustomerId}/follow-ups`)
      .set(auth(accountsToken))
      .send({ note: 'Nope' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for follow-up on nonexistent customer', async () => {
    const res = await request(app)
      .post('/api/customers/00000000-0000-4000-8000-000000000099/follow-ups')
      .set(auth(salesToken))
      .send({ note: 'Missing customer' });
    expect(res.status).toBe(404);
  });
});

describe('Customer CRM — delete', () => {
  it('rejects SALES delete with 403', async () => {
    const res = await request(app)
      .delete(`/api/customers/${deletableCustomerId}`)
      .set(auth(salesToken));
    expect(res.status).toBe(403);
  });

  it('allows ADMIN to delete customer without challans', async () => {
    const res = await request(app)
      .delete(`/api/customers/${deletableCustomerId}`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
  });

  it('returns 409 when deleting customer with sales challans', async () => {
    const list = await request(app)
      .get('/api/customers')
      .query({ search: 'Patel Traders' })
      .set(auth(adminToken));
    const patel = list.body.data.find(
      (c: { business_name: string }) => c.business_name === 'Patel Traders',
    );
    expect(patel).toBeTruthy();

    const res = await request(app).delete(`/api/customers/${patel.id}`).set(auth(adminToken));
    expect(res.status).toBe(409);
  });
});
