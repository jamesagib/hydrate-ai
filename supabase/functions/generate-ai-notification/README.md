# AI-Powered Hydration Notifications

This Edge Function generates personalized hydration notifications using OpenAI GPT-4o-mini.

## Features

- **Personalized Messages**: Generates unique notifications based on user's hydration data
- **Smart Tone Selection**: Automatically chooses appropriate tone (encouraging, gentle reminder, playful roast, celebratory)
- **Cost Optimized**: Uses minimal context to reduce token usage
- **Friendly Roasting**: Light-hearted roasting for users who haven't drunk water in a while

## How it Works

1. **Receives User Data**: Gets hydration context (goal, current consumption, streak, hours since last drink)
2. **Determines Tone**: Based on user's hydration status:
   - `playful_roast`: 8+ hours without drinking, no logs today
   - `gentle_reminder`: 4+ hours without drinking
   - `celebratory`: 80%+ of daily goal reached
   - `encouraging`: Default supportive tone
3. **Generates Message**: Uses OpenAI to create personalized notification
4. **Returns Response**: Structured response with message and metadata

## Usage

```typescript
const response = await fetch('/functions/v1/generate-ai-notification', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userData: {
      dailyGoal: 80,
      currentConsumption: 45,
      streak: 7,
      hoursSinceLastDrink: 3,
      hasLoggedToday: true,
      timeOfDay: '3pm'
    }
  })
})
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key

## Cost Analysis

- **Input tokens**: ~150-200 per request
- **Output tokens**: ~50-100 per request
- **Cost per notification**: ~$0.0001-0.0002
- **1,000 users/day**: ~$0.10-0.20
- **10,000 users/day**: ~$1-2

## Integration

This function is designed to be called from the `send-hydration-reminder` function to replace static notification templates with AI-generated personalized messages. 