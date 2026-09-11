import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

const app = createApp();

const DEMO_PASSWORD = 'Password@123';

const DEMO_USERS = [
  { email: 'admin@fundflow.local', role: 'ADMIN' },
  { email: 'sales@fundflow.local', role: 'SALES' },
  { email: 'warehouse@fundflow.local', role: 'WAREHOUSE' },
  { email: 'accounts@fundflow.local', role: 'ACCOUNTS' },
] as const;

async function loginAs(email: string, password = DEMO_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

describe('Authentication', () => {
  it('logs in with valid credentials and returns token + public user', async () => {
    const res = await loginAs('admin@fundflow.local');
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      email: 'admin@fundflow.local',
      role: 'ADMIN',
      name: expect.any(String),
      id: expect.any(String),
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  it('rejects invalid password with 401', async () => {
    const res = await loginAs('admin@fundflow.local', 'WrongPassword!');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
    expect(res.body).not.toHaveProperty('token');
  });

  it('rejects unknown user with 401', async () => {
    const res = await loginAs('nobody@fundflow.local');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('authenticates all four seeded roles', async () => {
    for (const demo of DEMO_USERS) {
      const res = await loginAs(demo.email);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(demo.role);
      expect(res.body.user).not.toHaveProperty('password_hash');
    }
  });

  it('returns current user from GET /api/auth/me', async () => {
    const login = await loginAs('sales@fundflow.local');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'sales@fundflow.local',
      role: 'SALES',
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });
});

describe('Auth middleware', () => {
  it('rejects missing token on protected route', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  it('rejects malformed Authorization header', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const login = await loginAs('admin@fundflow.local');
    const expired = jwt.sign(
      {
        sub: login.body.user.id,
        email: login.body.user.email,
        role: login.body.user.role,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      env.jwtSecret,
    );

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });
});

describe('Role-based authorization', () => {
  it('allows ADMIN on admin-only route', async () => {
    const login = await loginAs('admin@fundflow.local');
    const res = await request(app)
      .get('/api/rbac/admin')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects SALES on admin-only route with 403', async () => {
    const login = await loginAs('sales@fundflow.local');
    const res = await request(app)
      .get('/api/rbac/admin')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permission/i);
  });

  it('allows SALES to customers-write and rejects WAREHOUSE', async () => {
    const sales = await loginAs('sales@fundflow.local');
    const warehouse = await loginAs('warehouse@fundflow.local');

    const allowed = await request(app)
      .get('/api/rbac/customers-write')
      .set('Authorization', `Bearer ${sales.body.token}`);
    expect(allowed.status).toBe(200);

    const denied = await request(app)
      .get('/api/rbac/customers-write')
      .set('Authorization', `Bearer ${warehouse.body.token}`);
    expect(denied.status).toBe(403);
  });

  it('allows WAREHOUSE to inventory-write and rejects ACCOUNTS', async () => {
    const warehouse = await loginAs('warehouse@fundflow.local');
    const accounts = await loginAs('accounts@fundflow.local');

    const allowed = await request(app)
      .get('/api/rbac/inventory-write')
      .set('Authorization', `Bearer ${warehouse.body.token}`);
    expect(allowed.status).toBe(200);

    const denied = await request(app)
      .get('/api/rbac/inventory-write')
      .set('Authorization', `Bearer ${accounts.body.token}`);
    expect(denied.status).toBe(403);
  });

  it('allows SALES to challans-write and rejects ACCOUNTS', async () => {
    const sales = await loginAs('sales@fundflow.local');
    const accounts = await loginAs('accounts@fundflow.local');

    const allowed = await request(app)
      .get('/api/rbac/challans-write')
      .set('Authorization', `Bearer ${sales.body.token}`);
    expect(allowed.status).toBe(200);

    const denied = await request(app)
      .get('/api/rbac/challans-write')
      .set('Authorization', `Bearer ${accounts.body.token}`);
    expect(denied.status).toBe(403);
  });

  it('rejects unauthenticated access to RBAC probe routes', async () => {
    const res = await request(app).get('/api/rbac/admin');
    expect(res.status).toBe(401);
  });
});
