# Deployment guide — FundFlow ERP

This guide documents how to deploy FundFlow using a simple free/low-cost stack. It does **not** invent live URLs. Add real URLs only after you deploy and verify them.

## Recommended architecture

| Layer | Service | Notes |
|-------|---------|-------|
| Frontend | Vercel | Static Vite build |
| Backend | Render (Web Service) | Node `npm start` after `npm run build` |
| Database | Neon PostgreSQL | Managed Postgres (`sslmode=require`) |

AWS is optional and not required.

## Backend commands (actual package.json scripts)

| Purpose | Command | Notes |
|---------|---------|-------|
| Install | `npm install` | From `backend/` |
| Build | `npm run build` | `tsc` → `dist/` |
| Start | `npm start` | `node dist/server.js` (uses host `PORT`) |
| Migrate (local/dev) | `npm run migrate` | Uses `tsx` + `src/db/migrate.ts` |
| Migrate (production) | `npm run db:migrate` | Uses compiled `dist/db/migrate.js` — **non-destructive** |
| Seed (local/dev) | `npm run seed` | Uses `tsx` + `src/db/seed.ts` |
| Seed (production first-time) | `npm run db:seed` | Uses compiled `dist/db/seed.js` |
| Local demo reset | `npm run db:reset` | migrate + seed — **wipes business tables** |

### Critical production rules

- Use **`npm run db:migrate`** on hosted databases. It only applies pending SQL files.
- **Never** run `npm run db:reset` against Neon/production — seed deletes all business rows then re-inserts demo data.
- Run **`npm run db:seed`** only once on a **fresh** Neon database for the recruiter/demo dataset.
- Put secrets in the host environment only (not GitHub).

## 1. Neon PostgreSQL (database)

1. Create a Neon project and PostgreSQL database.
2. Copy the connection string from the Neon dashboard.
3. Prefer a URL that includes `sslmode=require`.
4. Configure it later as **Render Backend Environment Variables → `DATABASE_URL`**.
5. Do **not** commit the Neon URL to Git, README, or `.env.example`.

Placeholder shape only:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

### Initialize a fresh Neon database

From a machine that can reach Neon (or a Render shell / one-off job), after backend build:

```bash
cd backend
npm install
npm run build

# DATABASE_URL and JWT_SECRET must already be set in the environment
npm run db:migrate
npm run db:seed
```

Expected result:

- schema from `database/migrations` (`001_init.sql`, `002_customer_follow_ups.sql`)
- clean demo seed: 4 users, 5 customers, 8 products, stock movements, 1 Draft / 1 Confirmed / 1 Cancelled challan, low-stock examples

## 2. Backend (Render — prepare only; deploy in a later phase)

1. Create a **Web Service** from the GitHub repository.
2. Root directory: `backend`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon connection string (`sslmode=require`) |
| `JWT_SECRET` | long random secret |
| `JWT_EXPIRES_IN` | e.g. `8h` |
| `CORS_ORIGINS` | exact frontend origin, e.g. `https://your-app.vercel.app` |
| `PORT` | usually injected by Render — do not hardcode |

6. After first deploy / DB create: run `npm run db:migrate` then (once) `npm run db:seed`.
7. Verify: `GET https://<your-api-host>/health` → `{ "status": "ok", "service": "fundflow-api" }`

## 3. Frontend (Vercel — later phase)

1. Import the repository in Vercel.
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://<your-api-host>/api` |

## 4. CORS checklist

- Development: localhost Vite origins in `CORS_ORIGINS`
- Production: **only** the deployed frontend origin(s)
- Do **not** set `Access-Control-Allow-Origin: *` when using credentials

## 5. Post-deploy smoke checklist

1. `GET /health`
2. Login each role
3. Dashboard loads
4. Customers / Products / Stock Movements / Challans lists
5. One Draft → Confirm flow with stock deduction
6. One insufficient-stock confirm → 409, draft unchanged

## 6. Secrets

Never commit:

- real `DATABASE_URL` / Neon password
- real `JWT_SECRET`
- hosting API tokens
- production passwords

Keep secrets in the host dashboard / password manager.
