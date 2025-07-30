# Supabase Cron Job Setup

## **Edge Functions Deployed ✅**
- `send-hydration-reminder` - Sends push notifications at scheduled times
- `send-push-notification` - Handles Expo push notification delivery

## **Set up Cron Job in Supabase Dashboard**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/spiuczenpydodsegisvb

2. **Navigate to Database → Extensions**

3. **Enable the `cron` and `net` extensions** if not already enabled

4. **Go to Database → SQL Editor**

5. **Run this SQL to create the cron job**:
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to run every 5 minutes during active hours (6 AM to 10 PM UTC)
SELECT cron.schedule(
  'send-hydration-reminders',
  '*/5 6-22 * * *', -- Every 5 minutes, 6 AM to 10 PM UTC
  $$
  SELECT net.http_post(
    url := 'https://spiuczenpydodsegisvb.supabase.co/functions/v1/send-hydration-reminder',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}',
    body := '{}'
  );
  $$
);
```

6. **Replace `YOUR_SERVICE_ROLE_KEY`** with your actual service role key from:
   - Dashboard → Settings → API → `service_role` key

## **Timezone Support ✅**

The system now supports user timezones:
- Users can set their timezone in their profile
- Notifications are sent at the correct local time for each user
- Default timezone is UTC if not specified

## **How It Works**

1. **Every 5 minutes during active hours** (6 AM to 10 PM UTC), the cron job calls the edge function
2. **Function checks** all users who want coaching
3. **For each user**, checks if it's time for their hydration reminder in their timezone
4. **Sends push notification** at the exact scheduled time in their timezone
5. **No duplicates** - exact time matching only
6. **Efficient** - 80% fewer database calls than every minute

## **Benefits**

✅ **No GitHub Actions needed** - Uses Supabase's built-in cron  
✅ **User timezone support** - Notifications at correct local time  
✅ **No duplicates** - Exact time matching  
✅ **Server-controlled** - Can modify without app updates  
✅ **Free** - No additional service costs  

## **Test the System**

1. **Set up a test user** with a hydration plan
2. **Set their timezone** in the database
3. **Wait for the scheduled time** to see if notification arrives
4. **Check the logs** in Supabase Dashboard → Functions → Logs 