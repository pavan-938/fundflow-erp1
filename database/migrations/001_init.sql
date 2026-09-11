-- FundFlow ERP — initial schema
-- Migration: 001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('RETAIL', 'WHOLESALE', 'DISTRIBUTOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_status AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM ('IN', 'OUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE challan_status AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   VARCHAR(200) NOT NULL,
  mobile_number   VARCHAR(20) NOT NULL,
  email           VARCHAR(255),
  business_name   VARCHAR(255) NOT NULL,
  gst_number      VARCHAR(20),
  customer_type   customer_type NOT NULL,
  address         TEXT NOT NULL,
  status          customer_status NOT NULL DEFAULT 'LEAD',
  follow_up_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name             VARCHAR(255) NOT NULL,
  sku                      VARCHAR(64) NOT NULL UNIQUE,
  category                 VARCHAR(100) NOT NULL,
  unit_price               NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  current_stock            INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock_quantity >= 0),
  warehouse_location       VARCHAR(100) NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id),
  quantity_changed   INTEGER NOT NULL CHECK (quantity_changed > 0),
  movement_type      movement_type NOT NULL,
  reason             VARCHAR(500) NOT NULL,
  created_by         UUID NOT NULL REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_challans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_number   VARCHAR(32) NOT NULL UNIQUE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  total_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  status           challan_status NOT NULL DEFAULT 'DRAFT',
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_challan_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id             UUID NOT NULL REFERENCES sales_challans(id) ON DELETE CASCADE,
  product_id             UUID NOT NULL REFERENCES products(id),
  product_name_snapshot  VARCHAR(255) NOT NULL,
  sku_snapshot           VARCHAR(64) NOT NULL,
  unit_price_snapshot    NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity               INTEGER NOT NULL CHECK (quantity > 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Challan number sequence helper (SC-YYYY-####)
CREATE TABLE IF NOT EXISTS challan_number_seq (
  year         INTEGER PRIMARY KEY,
  last_value   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(current_stock);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challans_status ON sales_challans(status);
CREATE INDEX IF NOT EXISTS idx_challans_number ON sales_challans(challan_number);
CREATE INDEX IF NOT EXISTS idx_challans_customer ON sales_challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON sales_challan_items(challan_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_challans_updated_at ON sales_challans;
CREATE TRIGGER trg_challans_updated_at
  BEFORE UPDATE ON sales_challans
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
