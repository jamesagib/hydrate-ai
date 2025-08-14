-- Create notification_locks table for preventing race conditions
CREATE TABLE IF NOT EXISTS notification_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_key TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_locks_expires_at ON notification_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_notification_locks_acquired_at ON notification_locks(acquired_at);

-- Add RLS policies
ALTER TABLE notification_locks ENABLE ROW LEVEL SECURITY;

-- Service role can manage all locks
CREATE POLICY "Service role can manage notification locks" ON notification_locks
  FOR ALL USING (auth.role() = 'service_role');

-- Clean up expired locks (run this periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_notification_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_locks 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_notification_locks() TO service_role; 