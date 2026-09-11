# Database Design — FundFlow ERP

## Entities

- `users` — internal staff with roles ADMIN / SALES / WAREHOUSE / ACCOUNTS
- `customers` — CRM records (RETAIL / WHOLESALE / DISTRIBUTOR)
- `products` — inventory master with non-negative `current_stock`
- `stock_movements` — IN/OUT audit trail
- `sales_challans` — DRAFT / CONFIRMED / CANCELLED
- `sales_challan_items` — line items with product snapshots
- `challan_number_seq` — yearly sequence for `SC-YYYY-####`
- `customer_follow_ups` — CRM follow-up history (note, date, created_by)
- `schema_migrations` — migration bookkeeping

## Key rules

1. Stock never goes negative (`CHECK (current_stock >= 0)`).
2. Challan confirmation (Phase 6) runs in a single PostgreSQL transaction.
3. Draft challans do not change stock.
4. Historical challan lines keep `product_name_snapshot`, `sku_snapshot`, `unit_price_snapshot`.

## Apply schema

```bash
cd backend
cp ../.env.example ../.env   # set DATABASE_URL
npm install
npm run migrate
npm run seed
```
