-- Fix RLS policies to allow service role full access (including write operations)

-- Drop existing policies
DROP POLICY IF EXISTS "Allow service role full access to cache" ON drink_analysis_cache;
DROP POLICY IF EXISTS "Allow service role full access to scan counts" ON daily_scan_counts;
DROP POLICY IF EXISTS "Allow authenticated users to read cache" ON drink_analysis_cache;
DROP POLICY IF EXISTS "Allow authenticated users to read their scan counts" ON daily_scan_counts;

-- Create new policies that allow service role FULL access (including INSERT, UPDATE, DELETE)
CREATE POLICY "Allow service role full access to cache" ON drink_analysis_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to scan counts" ON daily_scan_counts
  FOR ALL USING (auth.role() = 'service_role');

-- Also allow authenticated users to read their own data
CREATE POLICY "Allow authenticated users to read cache" ON drink_analysis_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read their scan counts" ON daily_scan_counts
  FOR SELECT USING (auth.uid() = user_id);

-- Grant explicit permissions to service role
GRANT ALL ON drink_analysis_cache TO service_role;
GRANT ALL ON daily_scan_counts TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('drink_analysis_cache', 'daily_scan_counts')
ORDER BY tablename, policyname; 