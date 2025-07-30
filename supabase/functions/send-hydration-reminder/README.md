# Hydration Reminder Push Notifications

This Edge Function sends push notifications to users at their scheduled hydration times.

## How it works

1. **Scheduled Execution**: This function should be called every minute via a cron job or scheduled task
2. **User Filtering**: Gets all users who want coaching (`wants_coaching = true`)
3. **Time Matching**: Checks if current time matches any of the user's hydration plan times
4. **Push Delivery**: Sends push notifications via Expo's push service

## Setup

### 1. Deploy the function
```bash
supabase functions deploy send-hydration-reminder
```

### 2. Set up scheduled execution
You can use a service like:
- **GitHub Actions** (free)
- **Vercel Cron Jobs** (free tier available)
- **AWS EventBridge** (paid)
- **Google Cloud Scheduler** (paid)

### 3. GitHub Actions Example
Create `.github/workflows/hydration-reminders.yml`:
```yaml
name: Hydration Reminders
on:
  schedule:
    - cron: '* * * * *'  # Every minute

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send hydration reminders
        run: |
          curl -X POST "https://your-project.supabase.co/functions/v1/send-hydration-reminder" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

## Environment Variables

Make sure these are set in your Supabase project:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PROJECT_ID` (for push notifications)

## Database Requirements

The function expects:
- `profiles` table with `push_token` column
- `hydration_plans` table with `suggested_logging_times` JSON array
- `notifications` table for logging sent notifications

## Benefits over Local Notifications

1. **No duplicates** - Single source of truth
2. **Server-controlled** - Can be modified without app updates
3. **Better reliability** - Works even if app is reinstalled
4. **Easier management** - Centralized control
5. **No battery drain** - No local scheduling needed 