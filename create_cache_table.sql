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

-- Function to handle drink analysis with caching and scan counting
CREATE OR REPLACE FUNCTION process_drink_analysis(
  p_image_hash TEXT,
  p_analysis_result JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  cached_result JSONB;
  current_scan_count INTEGER;
  max_scans_per_day INTEGER := 5;
  cache_age_ms BIGINT;
  max_cache_age_ms BIGINT := 7 * 24 * 60 * 60 * 1000; -- 7 days
BEGIN
  -- Check cache first
  SELECT analysis_result, 
         EXTRACT(EPOCH FROM (NOW() - created_at)) * 1000 INTO cached_result, cache_age_ms
  FROM drink_analysis_cache 
  WHERE image_hash = p_image_hash;
  
  -- If cache hit and not expired
  IF cached_result IS NOT NULL AND cache_age_ms <= max_cache_age_ms THEN
    -- Still increment scan count even for cached results
    IF p_user_id IS NOT NULL THEN
      current_scan_count := increment_daily_scan_count(p_user_id);
      
      -- Check if user has exceeded daily limit
      IF current_scan_count > max_scans_per_day THEN
        RAISE EXCEPTION 'Daily scan limit exceeded' USING ERRCODE = 'LIMIT_EXCEEDED';
      END IF;
    END IF;
    
    -- Return cached result with flag
    RETURN jsonb_build_object(
      'result', cached_result,
      'cached', true,
      'scan_count', current_scan_count
    );
  END IF;
  
  -- Cache miss or expired - check scan limit first
  IF p_user_id IS NOT NULL THEN
    current_scan_count := get_daily_scan_count(p_user_id);
    
    IF current_scan_count >= max_scans_per_day THEN
      RAISE EXCEPTION 'Daily scan limit exceeded' USING ERRCODE = 'LIMIT_EXCEEDED';
    END IF;
  END IF;
  
  -- Insert or update cache
  INSERT INTO drink_analysis_cache (image_hash, analysis_result)
  VALUES (p_image_hash, p_analysis_result)
  ON CONFLICT (image_hash) 
  DO UPDATE SET 
    analysis_result = p_analysis_result,
    created_at = NOW();
  
  -- Increment scan count for new analysis
  IF p_user_id IS NOT NULL THEN
    current_scan_count := increment_daily_scan_count(p_user_id);
  END IF;
  
  -- Return new result
  RETURN jsonb_build_object(
    'result', p_analysis_result,
    'cached', false,
    'scan_count', current_scan_count
  );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM drink_analysis_cache 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 