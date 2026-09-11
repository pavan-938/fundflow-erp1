# FundFlow ERP — API Reference

Base URL (local): `http://localhost:4000`

Authenticated routes expect:

```http
Authorization: Bearer <JWT>
```

Error shape (typical):

```json
{ "message": "…", "code": "OPTIONAL_CODE", "errors": [{ "field": "…", "message": "…" }] }
```

Important status codes:

| Code | Meaning |
|------|---------|
| 400 | Validation failed |
| 401 | Missing/invalid token |
| 403 | Authenticated but role not allowed |
| 404 | Resource not found |
| 409 | Conflict (e.g. insufficient stock, delete blocked) |
| 500 | Internal server error (no stack traces) |

---

## Health & meta

### `GET /health`

- **Auth:** none
- **Response:** `{ "status": "ok", "service": "fundflow-api" }`

### `GET /api`

- **Auth:** none
- **Response:** API name/version metadata

---

## Authentication

### `POST /api/auth/login`

- **Auth:** public
- **Body:**

```json
{ "email": "sales@fundflow.local", "password": "Password@123" }
```

- **Response:** `{ "token": "<jwt>", "user": { "id", "name", "email", "role" } }`
- **Notes:** Password hashes are never returned. Invalid credentials → **401**.

### `GET /api/auth/me`

- **Auth:** required
- **Roles:** any authenticated role
- **Response:** current user object (no password hash)

---

## Customers

Roles:

| Action | Roles |
|--------|-------|
| Read | ADMIN, SALES, WAREHOUSE, ACCOUNTS |
| Write | ADMIN, SALES |
| Delete | ADMIN |
| Follow-up | ADMIN, SALES |

### `GET /api/customers`

- **Auth:** required · read roles
- **Query:** `page` (default 1), `limit` (1–100, default 10), `search`, `status` (`LEAD`\|`ACTIVE`\|`INACTIVE`), `customer_type` (`RETAIL`\|`WHOLESALE`\|`DISTRIBUTOR`)
- **Response:** paginated customer list

### `POST /api/customers`

- **Auth:** required · write roles
- **Body:**

```json
{
  "customer_name": "string",
  "mobile_number": "string",
  "email": "string|null",
  "business_name": "string",
  "gst_number": "string|null",
  "customer_type": "RETAIL|WHOLESALE|DISTRIBUTOR",
  "address": "string",
  "status": "LEAD|ACTIVE|INACTIVE",
  "follow_up_date": "YYYY-MM-DD|null",
  "notes": "string|null"
}
```

### `GET /api/customers/:id`

- **Auth:** required · read roles
- **Response:** customer detail including `follow_ups`

### `PUT /api/customers/:id`

- **Auth:** required · write roles
- **Body:** same shape as create

### `DELETE /api/customers/:id`

- **Auth:** required · ADMIN
- **Errors:** **409** if customer has related sales challans (set status `INACTIVE` instead)

### `POST /api/customers/:id/follow-ups`

- **Auth:** required · follow-up roles
- **Body:**

```json
{
  "note": "string",
  "follow_up_date": "YYYY-MM-DD|null"
}
```

- **Notes:** Follow-ups are stored in `customer_follow_ups` and do not overwrite customer `notes`.

---

## Products

Roles:

| Action | Roles |
|--------|-------|
| Read | ADMIN, SALES, WAREHOUSE, ACCOUNTS |
| Write | ADMIN, WAREHOUSE |

### `GET /api/products`

- **Auth:** required · read roles
- **Query:** `page`, `limit`, `search`, `category`, `low_stock=true|false`
- **Notes:** `is_low_stock` is derived as `current_stock <= minimum_stock_quantity`

### `POST /api/products`

- **Auth:** required · write roles
- **Body:**

```json
{
  "product_name": "string",
  "sku": "string",
  "category": "string",
  "unit_price": 0,
  "minimum_stock_quantity": 0,
  "warehouse_location": "string",
  "initial_stock": 0
}
```

- **Notes:** `current_stock` is not accepted as a direct write. Optional `initial_stock` creates an IN movement in the same transaction.

### `GET /api/products/:id`

- **Auth:** required · read roles

### `PUT /api/products/:id`

- **Auth:** required · write roles
- **Body:** product fields without `initial_stock` / `current_stock`

---

## Stock movements

Roles:

| Action | Roles |
|--------|-------|
| Read | ADMIN, SALES, WAREHOUSE, ACCOUNTS |
| Write | ADMIN, WAREHOUSE |

### `GET /api/stock-movements`

- **Auth:** required · read roles
- **Query:** `page`, `limit`, `product_id`, `movement_type` (`IN`\|`OUT`)

### `POST /api/stock-movements`

- **Auth:** required · write roles
- **Body:**

```json
{
  "product_id": "uuid",
  "quantity": 1,
  "movement_type": "IN|OUT",
  "reason": "string"
}
```

- **Errors:** OUT with insufficient stock → **409** (no stock change, no movement row)

---

## Sales challans

Roles:

| Action | Roles |
|--------|-------|
| Read | ADMIN, SALES, WAREHOUSE, ACCOUNTS |
| Write / confirm / cancel | ADMIN, SALES |

### `GET /api/challans`

- **Auth:** required · read roles
- **Query:** `page`, `limit`, `status` (`DRAFT`\|`CONFIRMED`\|`CANCELLED`), `customer_id`, `search` (challan number)

### `POST /api/challans`

- **Auth:** required · write roles
- **Body:**

```json
{
  "customer_id": "uuid",
  "items": [{ "product_id": "uuid", "quantity": 1 }]
}
```

- **Result:** status **DRAFT**; no stock change. Line items store product snapshots.

### `GET /api/challans/:id`

- **Auth:** required · read roles
- **Response:** challan header + items (snapshots)

### `PUT /api/challans/:id`

- **Auth:** required · write roles
- **Notes:** DRAFT only. Confirmed/cancelled → conflict/error.

### `POST /api/challans/:id/confirm`

- **Auth:** required · confirm roles
- **Notes:** Single transaction: validate stock → deduct → create OUT movements → set **CONFIRMED**. Insufficient stock → **409** with full rollback; challan remains DRAFT.

### `POST /api/challans/:id/cancel`

- **Auth:** required · cancel roles
- **Notes:** DRAFT only. No stock change.

---

## Dashboard

### `GET /api/dashboard/summary`

- **Auth:** required · any authenticated role
- **Response:** live KPIs (`total_customers`, `total_products`, `low_stock_products`, `draft_challans`, `confirmed_challans`) plus `low_stock_items`, `recent_challans`, `recent_stock_movements`
- **Notes:** No revenue/profit/fake financial metrics

---

## RBAC probes (dev/QA helpers)

Mounted under `/api/rbac` (authenticated + role-gated). Useful for verifying 403 behavior:

- `GET /api/rbac/admin` — ADMIN
- `GET /api/rbac/customers-write` — ADMIN, SALES
- `GET /api/rbac/inventory-write` — ADMIN, WAREHOUSE
- `GET /api/rbac/challans-write` — ADMIN, SALES
