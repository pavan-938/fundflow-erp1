# FundFlow ERP

Mini ERP + CRM Operations Portal for wholesale/distribution operations.

FundFlow helps internal teams manage customers, inventory, stock movements, and sales challans with role-based access and transactional stock deduction on challan confirmation.

## Project overview

FundFlow ERP is a practical full-stack operations portal for:

- Customer CRM (leads, active customers, follow-ups)
- Product catalog and warehouse locations
- Stock movement audit trail (IN / OUT)
- Sales challans (Draft → Confirm / Cancel)
- Role-aware dashboard with live operational KPIs
- JWT authentication and backend-enforced RBAC

**Core flow**

Customer → Product → Draft Challan → Confirm → Stock validation → Stock deduction → OUT stock movement → Confirmed challan

Confirmation runs in a single PostgreSQL transaction. Insufficient stock returns **409** and rolls back with no partial updates.

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React, TypeScript, Vite, CSS |
| Backend | Node.js, TypeScript, Express.js |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |

## Architecture

```
React frontend
    ↓ REST (JSON)
Express / Node API (modular monolith)
    ↓
PostgreSQL
```

The backend is organized by routes → controllers → services → repositories. It is a modular monolith — not microservices.

## Roles

| Role | Capabilities |
|------|----------------|
| **ADMIN** | Full operational access (CRM, inventory, challans, confirm/cancel, delete customers) |
| **SALES** | Customer write + follow-ups, challan create/edit/confirm/cancel, product & stock read |
| **WAREHOUSE** | Product write, stock movement write, CRM/challan read |
| **ACCOUNTS** | Read-only operational access across CRM, inventory, and challans |

Frontend hides unauthorized write actions; **backend RBAC remains the security boundary**.

## Core workflow

1. Create/select a customer
2. Create a sales challan with product lines → status **DRAFT** (no stock change)
3. Confirm the draft
4. System validates available stock for every line
5. Stock is deducted and OUT stock movements are created
6. Challan status becomes **CONFIRMED**
7. Product snapshots on line items are preserved for history

Cancel is allowed only for **DRAFT** challans and does not affect stock. Confirmed challans cannot be cancelled or restocked in v1.

## Repository structure

```
project-root/
  backend/           Express API
  frontend/          React + Vite app
  database/
    migrations/      SQL migrations
    seeds/           Seed notes
  docs/
    API.md
    DATABASE.md
    DEPLOYMENT.md
    postman/
  .env.example
  README.md
```

## Local setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (local, Docker, or hosted)
- npm

### 1. Clone and environment

```bash
git clone <your-repo-url>
cd "fundsroom project"
cp .env.example .env
```

Edit `.env` with your database URL and a strong `JWT_SECRET`.

**Quick local Postgres (Docker):**

```bash
docker run -d --name fundflow-pg ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=fundflow ^
  -p 5433:5432 postgres:16-alpine
```

Default `.env.example` points at `localhost:5433`.

### 2. Backend

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

Health check: `GET http://localhost:4000/health`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`frontend/.env` must include:

```
VITE_API_BASE_URL=http://localhost:4000/api
```

Open the Vite URL shown in the terminal (commonly `http://localhost:5173` or `5174`).

### Useful scripts

| Location | Script | Purpose |
|----------|--------|---------|
| `backend` | `npm run migrate` | Apply SQL migrations (local/dev via `tsx`) |
| `backend` | `npm run db:migrate` | Apply SQL migrations (production via compiled `dist/`) — **non-destructive** |
| `backend` | `npm run seed` | Seed demo users and sample data (local/dev) |
| `backend` | `npm run db:seed` | Seed demo data (production via compiled `dist/`) — **wipes business rows** |
| `backend` | `npm run db:reset` | Local migrate + seed only — **never use on Neon/production** |
| `backend` | `npm run build` | Compile TypeScript to `dist/` |
| `backend` | `npm start` | Run compiled API (`node dist/server.js`) |
| `backend` | `npm test` | Vitest suite |
| `frontend` | `npm run build` | Production build |
| `frontend` | `npm run lint` | Oxlint |
| `frontend` | `npm run preview` | Preview production build |

## Environment variables

### Backend (root `.env` and/or `backend/.env`)

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `DATABASE_URL` | Yes | Local: `postgresql://…@localhost:5433/fundflow`. Hosted Neon: `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` (set only in host env, e.g. Render → `DATABASE_URL`) |
| `JWT_SECRET` | Yes | Long random secret (never commit real values) |
| `JWT_EXPIRES_IN` | No | Default `8h` |
| `CORS_ORIGINS` | No | Comma-separated origins. Dev default includes localhost Vite ports. Production: deployed frontend origin only. Do **not** use `*` with credentials. |
| `PORT` | No | Default `4000` (hosting platforms usually inject `PORT`) |
| `NODE_ENV` | No | `development` / `production` |

### Frontend (`frontend/.env`)

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_BASE_URL` | Yes | Local: `http://localhost:4000/api` · Production: `https://your-api.example.com/api` |

Placeholders only are in `.env.example` files. Real `.env` files are gitignored.

## Demo / test credentials

**DEMO / TEST CREDENTIALS ONLY** — for local seed and demo environments. Do not use in production.

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@fundflow.local` | `Password@123` |
| SALES | `sales@fundflow.local` | `Password@123` |
| WAREHOUSE | `warehouse@fundflow.local` | `Password@123` |
| ACCOUNTS | `accounts@fundflow.local` | `Password@123` |

Seed data also includes customers, products (including low-stock examples), stock movements, and Draft / Confirmed / Cancelled challans.

## API documentation

- Full API reference: [`docs/API.md`](docs/API.md)
- Postman collection: [`docs/postman/FundFlow-ERP.postman_collection.json`](docs/postman/FundFlow-ERP.postman_collection.json)
- Database notes: [`docs/DATABASE.md`](docs/DATABASE.md)
- Deployment guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Deployment

Preferred simple free/low-cost stack:

| Layer | Suggested host |
|-------|----------------|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon (or Render PostgreSQL) |

Step-by-step setup: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

**Live URLs:** not published in this repository yet. After you deploy, add the frontend URL, backend URL, and confirmed `CORS_ORIGINS` / `VITE_API_BASE_URL` values to your private notes or PR description — do not commit production secrets.

## Assumptions

- Draft challans do not affect inventory
- Product `current_stock` is not editable from the product form; stock changes go through movements / challan confirmation
- Confirmed challans cannot be cancelled or restocked in v1
- Stock OUT requires sufficient quantity or the operation fails atomically
- Frontend permissions are UX-only; APIs enforce RBAC

## Limitations

- Challan search currently filters by challan number
- Customer/product selectors used in forms load up to 100 records per request
- No PDF invoice generation
- No purchase orders, payments, or financial reporting
- No email / notification / calendar integrations
- Dashboard follow-up attention section is not included (no dedicated dashboard follow-up API)
- AWS / Docker / CI pipelines are optional and not required for the case study core

## Suggested demo script

1. Login as **SALES**
2. Open Dashboard (KPIs, low stock, recent challans/movements)
3. Browse Customers and Products
4. Create a Draft Challan
5. Confirm the challan
6. Show reduced product stock and new OUT stock movement
7. Return to Dashboard
8. Login as **WAREHOUSE** / **ACCOUNTS** to show role-aware write restrictions
