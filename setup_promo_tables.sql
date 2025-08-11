-- Promo Codes and Redemptions Schema
-- Run after update_profiles_schema.sql

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Promo codes master table
CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_redemptions INTEGER,                -- null = unlimited
  duration_days INTEGER NOT NULL DEFAULT 3, -- access length in days
  campaign TEXT,                          -- optional grouping/label
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Redemptions table (who redeemed what and when)
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL REFERENCES promo_codes(code) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, code)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions (code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_code ON promo_redemptions (user_id, code);

-- Enable Row Level Security
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Only service role can manage promo_codes
DROP POLICY IF EXISTS "service role manage promo_codes" ON promo_codes;
CREATE POLICY "service role manage promo_codes" ON promo_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Redemptions: service role can do anything (Edge Function), users can only view their own
DROP POLICY IF EXISTS "service role manage redemptions" ON promo_redemptions;
CREATE POLICY "service role manage redemptions" ON promo_redemptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "users can view own redemptions" ON promo_redemptions;
CREATE POLICY "users can view own redemptions" ON promo_redemptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Optional: seed example (commented out)
-- INSERT INTO promo_codes (code, duration_days, campaign) VALUES ('LAUNCH3DAY', 3, 'launch'); 