-- Add subscription_status column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';

-- Update existing users to have trial status
UPDATE profiles SET subscription_status = 'trial' WHERE subscription_status IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Grant permissions
GRANT SELECT, UPDATE ON profiles TO service_role; 