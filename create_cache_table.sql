-- Create the drink_analysis_cache table
CREATE TABLE IF NOT EXISTS drink_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_hash TEXT UNIQUE NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE drink_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read/write cache entries
CREATE POLICY "Allow authenticated users to manage cache" ON drink_analysis_cache
  FOR ALL USING (auth.role() = 'authenticated');

-- Create index on image_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_drink_analysis_cache_hash ON drink_analysis_cache(image_hash); 