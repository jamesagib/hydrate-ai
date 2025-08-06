# AI-Powered Hydration Notifications Setup

## Overview

This implementation adds AI-generated personalized notifications using OpenAI GPT-4o-mini, with friendly roasting for users who haven't been hydrating.

## Features

- **Personalized Messages**: Each notification is unique based on user's hydration data
- **Smart Tone Selection**: Automatically chooses appropriate tone (encouraging, gentle reminder, playful roast, celebratory)
- **Cost Optimized**: Minimal token usage (~150-200 input, ~50-100 output tokens per notification)
- **Friendly Roasting**: Light-hearted roasting for users who haven't drunk water in 8+ hours

## Setup Steps

### 1. Deploy AI Notification Function

```bash
supabase functions deploy generate-ai-notification
```

### 2. Set OpenAI API Key

In your Supabase dashboard:
1. Go to Settings → API
2. Add environment variable: `OPENAI_API_KEY`
3. Set value to your OpenAI API key

### 3. Deploy Updated Hydration Reminder

```bash
supabase functions deploy send-hydration-reminder
```

### 4. Test the Implementation

```bash
node test-ai-notification.js
```

## Cost Analysis

### Per Notification
- **Input tokens**: ~150-200
- **Output tokens**: ~50-100
- **Cost**: ~$0.0001-0.0002 per notification

### Monthly Costs
- **1,000 users** (10 notifications/day): ~$3-6/month
- **10,000 users** (10 notifications/day): ~$30-60/month
- **100,000 users** (10 notifications/day): ~$300-600/month

## How It Works

### Tone Selection Logic
1. **Playful Roast**: 8+ hours without drinking, no logs today
2. **Gentle Reminder**: 4+ hours without drinking
3. **Celebratory**: 80%+ of daily goal reached
4. **Encouraging**: Default supportive tone

### Context Data Sent to AI
```
Goal: 80oz | Current: 45oz | Streak: 7 | Last: 2hrs ago | Time: afternoon
```

### Example AI Responses
- **Roast Mode**: "Bro, you good? Your plants are more hydrated than you 💧"
- **Celebratory**: "🔥 7-day streak! You're absolutely crushing it!"
- **Gentle Reminder**: "Time for a water break! Your body is waiting 💧"
- **Encouraging**: "Keep that hydration flow going! 💪"

## Fallback System

If AI generation fails, the system falls back to simple messages:
- **8+ hours, no logs**: "Bro, you good? Your plants are more hydrated than you 💧"
- **4+ hours**: "Time for a water break! 💧"
- **Default**: "Stay hydrated! 💧"

## Monitoring

### Logs to Watch
- AI generation success/failure
- Token usage and costs
- User engagement with AI vs fallback messages

### Metrics to Track
- Notification open rates
- User hydration behavior changes
- Cost per user per month

## Optimization Tips

### Reduce Costs
1. **Cache responses** for similar user states
2. **Batch similar notifications** when possible
3. **Use GPT-3.5-turbo** for even lower costs (60-70% reduction)

### Improve Quality
1. **A/B test different prompts**
2. **Collect user feedback** on message tone
3. **Adjust tone thresholds** based on user engagement

## Troubleshooting

### Common Issues
1. **OpenAI API errors**: Check API key and rate limits
2. **High costs**: Monitor token usage, consider caching
3. **Poor message quality**: Adjust system prompt or tone logic

### Debug Commands
```bash
# Test AI generation
node test-ai-notification.js

# Check function logs
supabase functions logs generate-ai-notification

# Monitor costs
# Check OpenAI dashboard for token usage
```

## Next Steps

1. **Deploy and test** with a small user group
2. **Monitor costs** and adjust as needed
3. **Collect feedback** and iterate on prompts
4. **Scale up** gradually based on performance

## Files Modified

- `supabase/functions/generate-ai-notification/index.ts` - New AI function
- `supabase/functions/send-hydration-reminder/index.ts` - Updated to use AI
- `test-ai-notification.js` - Test script
- `AI_NOTIFICATIONS_SETUP.md` - This guide 