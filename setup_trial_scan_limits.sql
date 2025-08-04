-- Setup Trial Scan Limits - Safe execution
-- This file handles all database changes for the trial scan limit feature

-- 1. Add subscription_status column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';

-- 2. Update existing users to have trial status
UPDATE profiles SET subscription_status = 'trial' WHERE subscription_status IS NULL;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- 4. Grant permissions
GRANT SELECT, UPDATE ON profiles TO service_role;

-- 5. Update the process_drink_analysis function with trial limits
CREATE OR REPLACE FUNCTION process_drink_analysis(
  p_image_hash TEXT,
  p_analysis_result JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  cached_result JSONB;
  current_scan_count INTEGER;
  max_scans_per_day INTEGER;
  cache_age_ms BIGINT;
  max_cache_age_ms BIGINT := 7 * 24 * 60 * 60 * 1000; -- 7 days
  user_subscription_status TEXT;
BEGIN
  -- Determine scan limit based on user subscription status
  IF p_user_id IS NOT NULL THEN
    -- Get user's subscription status from profiles table
    SELECT subscription_status INTO user_subscription_status
    FROM profiles 
    WHERE user_id = p_user_id;
    
    -- Set scan limit based on subscription status
    -- Default to trial if no subscription status found
    IF user_subscription_status IS NULL OR 
       user_subscription_status = 'trial' OR user_subscription_status = 'TRIAL' OR 
       user_subscription_status = 'trialing' OR user_subscription_status = 'TRIALING' THEN
      max_scans_per_day := 3; -- Trial users get 3 scans per day
    ELSE
      max_scans_per_day := 5; -- Paid users get 5 scans per day
    END IF;
  ELSE
    max_scans_per_day := 5; -- Default for anonymous users
  END IF;
  
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

-- 6. Grant function permissions
GRANT EXECUTE ON FUNCTION process_drink_analysis(TEXT, JSONB, UUID) TO service_role;

-- 7. Verify the setup
SELECT 'Trial scan limits setup complete!' as status; 