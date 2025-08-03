-- Setup optimized database functions for drink analysis
-- This file should be run in your Supabase SQL editor

-- First, ensure the tables exist
\i create_cache_table.sql
\i create_scan_limits_table.sql

-- Grant necessary permissions to the service role
GRANT EXECUTE ON FUNCTION process_drink_analysis(TEXT, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION increment_daily_scan_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_scan_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_cache() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_scan_counts() TO service_role;

-- Grant table permissions
GRANT ALL ON drink_analysis_cache TO service_role;
GRANT ALL ON daily_scan_counts TO service_role;

-- Create a scheduled job to clean up expired cache entries (optional)
-- This can be set up in Supabase dashboard under Database > Functions > Scheduled Functions
-- SELECT cron.schedule('cleanup-expired-cache', '0 2 * * *', 'SELECT cleanup_expired_cache();');
-- SELECT cron.schedule('cleanup-old-scan-counts', '0 3 * * *', 'SELECT cleanup_old_scan_counts();'); 