# FundFlow frontend

React + TypeScript + Vite UI for FundFlow ERP.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Required env:

```
VITE_API_BASE_URL=http://localhost:4000/api
```

For production builds set `VITE_API_BASE_URL` to your deployed API base (`…/api`).

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run lint` — Oxlint
- `npm run preview` — preview production build

See the root [README](../README.md) for roles, demo credentials, and architecture.
