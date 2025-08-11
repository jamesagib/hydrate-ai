ALTER TABLE profiles DROP COLUMN IF EXISTS pronouns; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
-- Promo support columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_source text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS promo_expires_at timestamptz;
