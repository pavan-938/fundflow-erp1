# Deployment guide — FundFlow ERP

This guide documents how to deploy FundFlow using a simple free/low-cost stack. It does **not** invent live URLs. Add real URLs only after you deploy and verify them.

## Recommended architecture

| Layer | Service | Notes |
|-------|---------|-------|
| Frontend | Vercel | Static Vite build |
| Backend | Render (Web Service) | Node `npm start` after `npm run build` |
| Database | Neon PostgreSQL (or Render Postgres) | Managed Postgres |

AWS is optional and not required.

## 1. Database

1. Create a PostgreSQL database (Neon / Render / other).
2. Copy the connection string (prefer `sslmode=require` for hosted DBs).
3. From a machine with network access to the DB:

```bash
cd backend
# set DATABASE_URL and JWT_SECRET in the environment or a local .env
npm install
npm run migrate
npm run seed
```

Seed creates demo users (`admin|sales|warehouse|accounts@fundflow.local` / `Password@123`). Rotate or disable demo users for any public production use.

## 2. Backend (Render example)

1. Create a **Web Service** from the repository.
2. Root directory: `backend`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | hosted Postgres URL |
| `JWT_SECRET` | long random secret |
| `JWT_EXPIRES_IN` | e.g. `8h` |
| `CORS_ORIGINS` | exact frontend origin, e.g. `https://your-app.vercel.app` |
| `PORT` | usually injected by the host — do not hardcode |

6. Verify: `GET https://<your-api-host>/health` → `{ "status": "ok", "service": "fundflow-api" }`

## 3. Frontend (Vercel example)

1. Import the repository in Vercel.
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://<your-api-host>/api` |

6. Deploy, then confirm the SPA loads and login works against the live API.

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

- real `DATABASE_URL`
- real `JWT_SECRET`
- hosting API tokens
- production passwords

Keep secrets in the host dashboard / password manager.
