-- FundFlow ERP — customer follow-up history
-- Migration: 002_customer_follow_ups.sql

CREATE TABLE IF NOT EXISTS customer_follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note            TEXT NOT NULL,
  follow_up_date  DATE,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_follow_ups_customer
  ON customer_follow_ups(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_follow_ups_created_by
  ON customer_follow_ups(created_by);
