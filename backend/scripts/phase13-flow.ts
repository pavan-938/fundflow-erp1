/**
 * Phase 13 final business-flow verification. Creates temporary records then reports IDs.
 * Caller should `npm run db:reset` afterward for a clean demo DB.
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

type Json = Record<string, unknown>;

async function req(method: string, path: string, opts: { token?: string; body?: unknown; expect?: number | number[] } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Json) : null;
  const expected = opts.expect === undefined ? null : Array.isArray(opts.expect) ? opts.expect : [opts.expect];
  if (expected && !expected.includes(res.status)) {
    throw new Error(`${method} ${path} expected ${expected.join('|')} got ${res.status}: ${text}`);
  }
  return { status: res.status, json };
}

function dataOf(json: Json | null): Json {
  return ((json?.data as Json | undefined) ?? json ?? {}) as Json;
}

async function login(email: string) {
  const { json } = await req('POST', '/api/auth/login', {
    body: { email, password: 'Password@123' },
    expect: 200,
  });
  return String(json?.token ?? '');
}

async function main() {
  const sales = await login('sales@fundflow.local');
  const warehouse = await login('warehouse@fundflow.local');
  const accounts = await login('accounts@fundflow.local');

  await req('GET', '/api/rbac/challans-write', { token: warehouse, expect: 403 });
  await req('GET', '/api/rbac/inventory-write', { token: accounts, expect: 403 });
  await req('POST', '/api/challans', {
    token: warehouse,
    body: { customer_id: '00000000-0000-0000-0000-000000000001', items: [{ product_id: '00000000-0000-0000-0000-000000000001', quantity: 1 }] },
    expect: 403,
  });
  console.log('PASS RBAC');

  const customers = dataOf((await req('GET', '/api/customers?page=1&limit=20&status=ACTIVE', { token: sales, expect: 200 })).json);
  const customerRows = (customers as { data?: Json[] }).data ?? (Array.isArray(customers) ? (customers as unknown as Json[]) : []);
  // list shape is { data, meta }
  const list = ((await req('GET', '/api/customers?page=1&limit=20&status=ACTIVE', { token: sales, expect: 200 })).json?.data as Json[]) ?? [];
  const products = ((await req('GET', '/api/products?page=1&limit=50', { token: sales, expect: 200 })).json?.data as Json[]) ?? [];
  const customerId = String(list[0].id);
  const p1 = products.find((p) => Number(p.current_stock) >= 5)!;
  const p2 = products.find((p) => p.id !== p1.id && Number(p.current_stock) >= 5)!;
  const before1 = Number(p1.current_stock);
  const before2 = Number(p2.current_stock);

  const draft = dataOf(
    (
      await req('POST', '/api/challans', {
        token: sales,
        body: {
          customer_id: customerId,
          items: [
            { product_id: String(p1.id), quantity: 2 },
            { product_id: String(p2.id), quantity: 1 },
          ],
        },
        expect: 201,
      })
    ).json,
  );
  console.log('PASS draft', draft.challan_number, draft.status);

  const mid1 = Number(dataOf((await req('GET', `/api/products/${p1.id}`, { token: sales, expect: 200 })).json).current_stock);
  const mid2 = Number(dataOf((await req('GET', `/api/products/${p2.id}`, { token: sales, expect: 200 })).json).current_stock);
  if (mid1 !== before1 || mid2 !== before2) throw new Error('Draft changed stock');

  const confirmed = dataOf((await req('POST', `/api/challans/${draft.id}/confirm`, { token: sales, expect: 200 })).json);
  if (confirmed.status !== 'CONFIRMED') throw new Error('not confirmed');
  const after1 = Number(dataOf((await req('GET', `/api/products/${p1.id}`, { token: sales, expect: 200 })).json).current_stock);
  const after2 = Number(dataOf((await req('GET', `/api/products/${p2.id}`, { token: sales, expect: 200 })).json).current_stock);
  if (after1 !== before1 - 2 || after2 !== before2 - 1) throw new Error(`stock mismatch ${after1}/${after2}`);

  const movements = ((await req('GET', `/api/stock-movements?page=1&limit=20&movement_type=OUT`, { token: sales, expect: 200 })).json?.data as Json[]) ?? [];
  const hasOut = movements.some((m) => String(m.reason ?? '').includes(String(confirmed.challan_number)));
  if (!hasOut) throw new Error('missing OUT movement');
  console.log('PASS confirm + stock + OUT');

  const bad = dataOf(
    (
      await req('POST', '/api/challans', {
        token: sales,
        body: { customer_id: customerId, items: [{ product_id: String(p1.id), quantity: after1 + 500 }] },
        expect: 201,
      })
    ).json,
  );
  await req('POST', `/api/challans/${bad.id}/confirm`, { token: sales, expect: 409 });
  const still = dataOf((await req('GET', `/api/challans/${bad.id}`, { token: sales, expect: 200 })).json);
  if (still.status !== 'DRAFT') throw new Error('should remain draft');
  const unchanged = Number(dataOf((await req('GET', `/api/products/${p1.id}`, { token: sales, expect: 200 })).json).current_stock);
  if (unchanged !== after1) throw new Error('stock changed after 409');
  console.log('PASS insufficient stock rollback');

  // cancel a separate draft
  const cancelDraft = dataOf(
    (
      await req('POST', '/api/challans', {
        token: sales,
        body: { customer_id: customerId, items: [{ product_id: String(p2.id), quantity: 1 }] },
        expect: 201,
      })
    ).json,
  );
  const cancelled = dataOf((await req('POST', `/api/challans/${cancelDraft.id}/cancel`, { token: sales, expect: 200 })).json);
  if (cancelled.status !== 'CANCELLED') throw new Error('cancel failed');
  console.log('PASS cancel draft');

  const dash = dataOf((await req('GET', '/api/dashboard/summary', { token: sales, expect: 200 })).json);
  console.log('DASH', dash.kpis);
  console.log('PHASE13_FLOW_OK');
}

main().catch((e) => {
  console.error('PHASE13_FLOW_FAIL', e);
  process.exit(1);
});
