-- Debug script to check and fix table issues

-- First, let's check if the tables exist and their structure
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('drink_analysis_cache', 'daily_scan_counts')
ORDER BY table_name, ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('drink_analysis_cache', 'daily_scan_counts');

-- Drop and recreate tables with proper permissions
DROP TABLE IF EXISTS drink_analysis_cache CASCADE;
DROP TABLE IF EXISTS daily_scan_counts CASCADE;

-- Create drink_analysis_cache table
CREATE TABLE drink_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_hash TEXT UNIQUE NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_scan_counts table
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
ALTER TABLE drink_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scan_counts ENABLE ROW LEVEL SECURITY;

-- Create policies that allow service role to insert/update
-- This is important for edge functions which run with service role
CREATE POLICY "Allow service role full access to cache" ON drink_analysis_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to scan counts" ON daily_scan_counts
  FOR ALL USING (auth.role() = 'service_role');

-- Also allow authenticated users to read their own data
CREATE POLICY "Allow authenticated users to read cache" ON drink_analysis_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read their scan counts" ON daily_scan_counts
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_drink_analysis_cache_hash ON drink_analysis_cache(image_hash);
CREATE INDEX idx_daily_scan_counts_user_date ON daily_scan_counts(user_id, scan_date);

-- Function to increment scan count
CREATE OR REPLACE FUNCTION increment_daily_scan_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO daily_scan_counts (user_id, scan_date, scan_count)
  VALUES (user_uuid, CURRENT_DATE, 1)
  ON CONFLICT (user_id, scan_date)
  DO UPDATE SET 
    scan_count = daily_scan_counts.scan_count + 1,
    updated_at = NOW()
  RETURNING scan_count INTO current_count;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON drink_analysis_cache TO service_role;
GRANT ALL ON daily_scan_counts TO service_role;
GRANT EXECUTE ON FUNCTION increment_daily_scan_count TO service_role; 