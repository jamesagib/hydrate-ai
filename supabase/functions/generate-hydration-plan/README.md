# Generate Hydration Plan Edge Function

This Supabase Edge Function generates personalized hydration plans using OpenAI's GPT-4o mini model.

## Setup

1. **Set Environment Variables**
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Deploy the Function**
   ```bash
   supabase functions deploy generate-hydration-plan
   ```

## Usage

The function expects a POST request with onboarding data:

```json
{
  "onboarding": {
    "age": 25,
    "weight_kg": 70,
    "sex": "male",
    "activity_level": "moderate",
    "climate": "temperate",
    "wants_coaching": true
  }
}
```

## Response

Returns a JSON response with the generated hydration plan:

```json
{
  "plan_text": "HydrateAI Plan for You 🫗\n🌊 Daily Goal: 80 oz (2.4 L)\n..."
}
```

## Features

- Uses GPT-4o mini for intelligent hydration planning
- Personalized based on age, weight, activity level, climate, and preferences
- Includes daily goals, logging times, lifestyle adjustments, and pro tips
- Supports coaching preferences and reminder settings 