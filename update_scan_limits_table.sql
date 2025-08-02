-- First, let's check what columns exist in the current table
-- Then update the table structure to match our new schema

-- Drop the existing table and recreate it with the correct schema
DROP TABLE IF EXISTS daily_scan_counts CASCADE;

-- Create the daily_scan_counts table with correct schema
CREATE TABLE daily_scan_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scan_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, scan_date)
);

-- Enable RLS
ALTER TABLE daily_scan_counts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own scan counts
CREATE POLICY "Users can manage their own scan counts" ON daily_scan_counts
  FOR ALL USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_scan_counts_user_date ON daily_scan_counts(user_id, scan_date);

-- Function to increment scan count for a user on a given date
CREATE OR REPLACE FUNCTION increment_daily_scan_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Try to insert a new record, if it fails due to unique constraint, update existing
  INSERT INTO daily_scan_counts (user_id, scan_date, scan_count)
  VALUES (user_uuid, CURRENT_DATE, 1)
  ON CONFLICT (user_id, scan_date)
  DO UPDATE SET 
    scan_count = daily_scan_counts.scan_count + 1,
    updated_at = NOW()
  RETURNING scan_count INTO current_count;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get current scan count for a user
CREATE OR REPLACE FUNCTION get_daily_scan_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT scan_count INTO current_count
  FROM daily_scan_counts
  WHERE user_id = user_uuid AND scan_date = CURRENT_DATE;
  
  RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old scan count records (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_scan_counts()
RETURNS void AS $$
BEGIN
  DELETE FROM daily_scan_counts 
  WHERE scan_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql; 