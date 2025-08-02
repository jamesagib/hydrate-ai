-- Create cache table for drink analysis results
CREATE TABLE IF NOT EXISTS drink_analysis_cache (
  id SERIAL PRIMARY KEY,
  image_hash VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  estimated_oz INTEGER NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drink_cache_hash ON drink_analysis_cache(image_hash);
CREATE INDEX IF NOT EXISTS idx_drink_cache_created ON drink_analysis_cache(created_at);

-- Add RLS policy (optional - for security)
ALTER TABLE drink_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on drink_analysis_cache" ON drink_analysis_cache
  FOR ALL USING (true);

-- Function to clean up old cache entries (optional)
CREATE OR REPLACE FUNCTION cleanup_old_cache_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM drink_analysis_cache 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql; 