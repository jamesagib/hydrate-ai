# Notification Timezone System Guide

## Overview

The notification system is designed to send hydration reminders at the user's local time, regardless of where the server is located or what timezone the user is in.

## How It Works

### 1. User Timezone Storage
- Each user's timezone is stored in the `profiles.timezone` field
- Defaults to 'UTC' if not set
- Validated before use to prevent errors

### 2. Timezone Conversion Process

```javascript
// Get user's timezone (default to UTC if not set)
const userTimezone = user.timezone || 'UTC'

// Validate timezone - if invalid, use UTC
let validTimezone = 'UTC'
try {
  const testDate = new Date()
  testDate.toLocaleString("en-US", {timeZone: userTimezone})
  validTimezone = userTimezone
} catch (error) {
  console.log(`Invalid timezone ${userTimezone} for user ${user.user_id}, using UTC`)
}

// Get current time in user's timezone
const utcTime = new Date()
const userLocalTime = new Date(utcTime.toLocaleString("en-US", {timeZone: validTimezone}))
const userLocalHour = userLocalTime.getHours()
const userLocalMinute = userLocalTime.getMinutes()
const todayLocalDate = userLocalTime.toDateString()
```

### 3. Notification Timing Logic

For each user's scheduled time slot:

1. **Parse the time slot** (e.g., "7:00 AM", "14:30", "7 PM")
2. **Convert to 24-hour format** for comparison
3. **Compare with user's current local time**
4. **Send if within 5-minute window** of target time

```javascript
// Example: User in New York (EST) with 9:00 AM reminder
// Server time: 14:00 UTC (2:00 PM UTC)
// User local time: 9:00 AM EST
// Target time: 9:00 AM
// Result: ✅ Send notification (exact match)

// Example: User in Tokyo (JST) with 9:00 AM reminder  
// Server time: 00:00 UTC (midnight UTC)
// User local time: 9:00 AM JST
// Target time: 9:00 AM
// Result: ✅ Send notification (exact match)
```

### 4. Timezone Validation

The system validates timezones using JavaScript's built-in timezone support:

```javascript
// Valid timezones (examples)
'America/New_York'     // Eastern Time
'Europe/London'        // British Time
'Asia/Tokyo'          // Japan Time
'Australia/Sydney'    // Australian Eastern Time
'UTC'                 // Universal Time

// Invalid timezones will fallback to UTC
'Invalid/Timezone'    // ❌ Falls back to UTC
```

## Key Features

### ✅ Timezone-Aware Scheduling
- Notifications are sent based on the user's local time
- Works correctly across all timezones
- Handles daylight saving time automatically

### ✅ Robust Error Handling
- Invalid timezones fallback to UTC
- Comprehensive logging for debugging
- No crashes due to timezone issues

### ✅ Detailed Logging
- UTC time logged for server reference
- User local time logged for verification
- Timezone information stored in notification metadata

### ✅ Duplicate Prevention
- Idempotency keys include timezone context
- Prevents duplicate notifications across timezone changes
- Tracks which function instance sent each notification

## Example Log Output

```
[abc123] User user_123 timezone: America/New_York
[abc123] UTC time: 2024-01-15T14:00:00.000Z
[abc123] User local time: 1/15/2024, 9:00:00 AM
[abc123] User local hour: 9, minute: 0
[abc123] User local date: Mon Jan 15 2024
[abc123] Time slot "9:00 AM" -> 9:00 (24h)
[abc123] User user_123 target: 9:0, current: 9:0, diff: 0 minutes, shouldSend: true
[abc123] 🎯 SENDING NOTIFICATION for user user_123 at time slot 09:00 (America/New_York)
[abc123] 📱 Sending push notification to user user_123 at America/New_York time 9:0
[abc123] ✅ Push notification sent successfully to user user_123
```

## Testing Timezone Functionality

Run the test script to verify timezone handling:

```bash
node test-notification-reliability.js
```

This will test:
- Timezone validation
- User timezone data
- Notification timing logic
- Recent notifications with timezone context

## Common Scenarios

### Scenario 1: User in New York
- **User timezone**: `America/New_York`
- **Scheduled time**: 9:00 AM
- **Server time**: 14:00 UTC (2:00 PM UTC)
- **User local time**: 9:00 AM EST
- **Result**: ✅ Notification sent at 9:00 AM EST

### Scenario 2: User in Tokyo
- **User timezone**: `Asia/Tokyo`
- **Scheduled time**: 9:00 AM
- **Server time**: 00:00 UTC (midnight UTC)
- **User local time**: 9:00 AM JST
- **Result**: ✅ Notification sent at 9:00 AM JST

### Scenario 3: Invalid Timezone
- **User timezone**: `Invalid/Timezone`
- **Scheduled time**: 9:00 AM
- **Server time**: 09:00 UTC
- **Fallback timezone**: UTC
- **Result**: ✅ Notification sent at 9:00 AM UTC

## Troubleshooting

### Issue: Notifications not sending at expected time
1. Check user's timezone in `profiles.timezone`
2. Verify timezone is valid using the test script
3. Check logs for timezone conversion details
4. Ensure scheduled time is in correct format

### Issue: Duplicate notifications
1. Check idempotency keys in notification metadata
2. Verify notification locks are working
3. Check for multiple function instances running

### Issue: Wrong timezone being used
1. Verify user's timezone setting in the app
2. Check for timezone validation errors in logs
3. Ensure timezone format is correct (e.g., `America/New_York`)

## Database Schema

### Notifications Table Metadata
```json
{
  "userTimezone": "America/New_York",
  "localTime": "9:0",
  "utcTime": "2024-01-15T14:00:00.000Z",
  "userLocalTime": "1/15/2024, 9:00:00 AM",
  "scheduledTime": "09:00",
  "dateKey": "Mon Jan 15 2024"
}
```

This ensures complete traceability of when and where each notification was sent. 