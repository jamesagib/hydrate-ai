-- Remove promo feature: functions, tables, columns

-- Drop Edge Functions (note: remove from Supabase dashboard separately if needed)
-- This script documents removals; SQL cannot drop edge functions directly here.
-- Functions to remove:
--   redeem-promo-code
--   cleanup-expired-promos

-- Drop promo tables (redemptions first due to FK)
DROP TABLE IF EXISTS promo_redemptions;
DROP TABLE IF EXISTS promo_codes;

-- Drop promo-related columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_source;
ALTER TABLE profiles DROP COLUMN IF EXISTS promo_expires_at;

-- Optionally drop grant_manual_access if you want to remove manual access function
-- DROP FUNCTION IF EXISTS grant_manual_access(uuid, integer); 