/**
 * Phase 12 API smoke + business-flow verification against a running local API.
 * Usage: npx tsx scripts/phase12-smoke.ts
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

type Json = Record<string, unknown>;

async function req(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; expect?: number | number[] } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: Json | null = null;
  try {
    json = text ? (JSON.parse(text) as Json) : null;
  } catch {
    json = { raw: text };
  }
  const expected = opts.expect === undefined ? null : Array.isArray(opts.expect) ? opts.expect : [opts.expect];
  if (expected && !expected.includes(res.status)) {
    throw new Error(`${method} ${path} expected ${expected.join('|')} got ${res.status}: ${text}`);
  }
  return { status: res.status, json };
}

async function login(email: string) {
  const { json } = await req('POST', '/api/auth/login', {
    body: { email, password: 'Password@123' },
    expect: 200,
  });
  const token = String(json?.token ?? '');
  const role = String((json?.user as Json | undefined)?.role ?? '');
  if (!token) throw new Error(`No token for ${email}`);
  return { token, role, user: json?.user as Json };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('BASE', BASE);

  // 1 Health
  const health = await req('GET', '/health', { expect: 200 });
  assert(health.json?.status === 'ok', 'health not ok');
  console.log('PASS health');

  // 2–5 Logins
  const admin = await login('admin@fundflow.local');
  const sales = await login('sales@fundflow.local');
  const warehouse = await login('warehouse@fundflow.local');
  const accounts = await login('accounts@fundflow.local');
  console.log('PASS logins', { admin: admin.role, sales: sales.role, warehouse: warehouse.role, accounts: accounts.role });

  // 6 /me
  const me = await req('GET', '/api/auth/me', { token: sales.token, expect: 200 });
  assert((me.json as Json)?.email === 'sales@fundflow.local' || (me.json as Json)?.user, 'me failed shape');
  console.log('PASS /me');

  // 7–11 lists
  await req('GET', '/api/customers?page=1&limit=5', { token: admin.token, expect: 200 });
  await req('GET', '/api/products?page=1&limit=5', { token: admin.token, expect: 200 });
  await req('GET', '/api/stock-movements?page=1&limit=5', { token: admin.token, expect: 200 });
  await req('GET', '/api/challans?page=1&limit=5', { token: admin.token, expect: 200 });
  await req('GET', '/api/dashboard/summary', { token: admin.token, expect: 200 });
  console.log('PASS list endpoints + dashboard');

  // 12 RBAC / auth
  const unauth = await req('GET', '/api/customers', { expect: 401 });
  assert(unauth.status === 401, 'expected 401');
  const forbidConfirm = await req('POST', '/api/challans/00000000-0000-0000-0000-000000000001/confirm', {
    token: warehouse.token,
    expect: [403, 404],
  });
  assert([403, 404].includes(forbidConfirm.status), 'warehouse confirm should be forbidden or not found without write role');
  // Prefer explicit 403 on write probe
  await req('GET', '/api/rbac/challans-write', { token: warehouse.token, expect: 403 });
  await req('GET', '/api/rbac/challans-write', { token: sales.token, expect: 200 });
  await req('GET', '/api/rbac/inventory-write', { token: accounts.token, expect: 403 });
  await req('GET', '/api/rbac/inventory-write', { token: warehouse.token, expect: 200 });
  console.log('PASS 401/403 RBAC checks');

  // Business flow — confirm + stock deduction
  const customers = await req('GET', '/api/customers?page=1&limit=20&status=ACTIVE', {
    token: sales.token,
    expect: 200,
  });
  const customerRows = ((customers.json as Json)?.data as Json[] | undefined) ?? [];
  assert(customerRows.length > 0, 'need active customers');
  const customerId = String(customerRows[0].id);

  const products = await req('GET', '/api/products?page=1&limit=50', { token: sales.token, expect: 200 });
  const productRows = ((products.json as Json)?.data as Json[] | undefined) ?? [];
  const product = productRows.find((p) => Number(p.current_stock) >= 2);
  assert(product, 'need a product with stock >= 2');
  const productId = String(product.id);
  const stockBefore = Number(product.current_stock);

  const draft = await req('POST', '/api/challans', {
    token: sales.token,
    body: { customer_id: customerId, items: [{ product_id: productId, quantity: 1 }] },
    expect: [200, 201],
  });
  const draftData = ((draft.json as Json)?.data as Json | undefined) ?? (draft.json as Json);
  const challanId = String(draftData.id);
  assert(draftData.status === 'DRAFT', 'expected DRAFT');
  console.log('PASS create draft', draftData.challan_number);

  const confirmed = await req('POST', `/api/challans/${challanId}/confirm`, {
    token: sales.token,
    expect: 200,
  });
  const confirmedData = ((confirmed.json as Json)?.data as Json | undefined) ?? (confirmed.json as Json);
  assert(confirmedData.status === 'CONFIRMED', 'expected CONFIRMED');

  const productAfter = await req('GET', `/api/products/${productId}`, { token: sales.token, expect: 200 });
  const afterData = ((productAfter.json as Json)?.data as Json | undefined) ?? (productAfter.json as Json);
  const stockAfter = Number(afterData.current_stock);
  assert(stockAfter === stockBefore - 1, `stock expected ${stockBefore - 1}, got ${stockAfter}`);

  const movements = await req('GET', `/api/stock-movements?page=1&limit=20&product_id=${productId}&movement_type=OUT`, {
    token: sales.token,
    expect: 200,
  });
  const movementRows = ((movements.json as Json)?.data as Json[] | undefined) ?? [];
  const related = movementRows.some(
    (m) => String(m.reason ?? '').includes(String(confirmedData.challan_number ?? '')),
  );
  assert(related, 'expected OUT movement referencing challan number');
  console.log('PASS confirm + stock deduction + OUT movement');

  // Insufficient stock path
  const stockNow = stockAfter;
  const excessiveQty = stockNow + 1000;
  const badDraft = await req('POST', '/api/challans', {
    token: sales.token,
    body: { customer_id: customerId, items: [{ product_id: productId, quantity: excessiveQty }] },
    expect: [200, 201],
  });
  const badData = ((badDraft.json as Json)?.data as Json | undefined) ?? (badDraft.json as Json);
  const badId = String(badData.id);
  const failConfirm = await req('POST', `/api/challans/${badId}/confirm`, {
    token: sales.token,
    expect: 409,
  });
  assert(failConfirm.status === 409, 'expected 409');

  const stillDraft = await req('GET', `/api/challans/${badId}`, { token: sales.token, expect: 200 });
  const stillData = ((stillDraft.json as Json)?.data as Json | undefined) ?? (stillDraft.json as Json);
  assert(stillData.status === 'DRAFT', 'challan must remain DRAFT after failed confirm');

  const productUnchanged = await req('GET', `/api/products/${productId}`, { token: sales.token, expect: 200 });
  const unchangedData =
    ((productUnchanged.json as Json)?.data as Json | undefined) ?? (productUnchanged.json as Json);
  assert(Number(unchangedData.current_stock) === stockNow, 'stock must be unchanged after failed confirm');
  console.log('PASS insufficient stock rollback');

  console.log('PHASE12_SMOKE_OK');
}

main().catch((err) => {
  console.error('PHASE12_SMOKE_FAIL', err);
  process.exit(1);
});
