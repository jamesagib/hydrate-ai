-- Create table for tracking daily scan counts per user
CREATE TABLE IF NOT EXISTS daily_scan_counts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_scan_user_date ON daily_scan_counts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_scan_date ON daily_scan_counts(date);

-- Add RLS policy
ALTER TABLE daily_scan_counts ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on daily_scan_counts" ON daily_scan_counts
  FOR ALL USING (true);

-- Function to increment scan count
CREATE OR REPLACE FUNCTION increment_scan_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN scan_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old scan count records (optional - keeps last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_scan_counts()
RETURNS void AS $$
BEGIN
  DELETE FROM daily_scan_counts 
  WHERE date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql; 