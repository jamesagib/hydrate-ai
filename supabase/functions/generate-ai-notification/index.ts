import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserHydrationData {
  dailyGoal: number;
  currentConsumption: number;
  streak: number;
  hoursSinceLastDrink: number;
  hasLoggedToday: boolean;
  timeOfDay: string;
  suggestedOz?: number; // Amount suggested for this time slot
  timeSlot?: string; // The specific time slot (e.g., "7:00 AM")
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData }: { userData: UserHydrationData } = await req.json()
    
    if (!userData) {
      throw new Error('User hydration data is required')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Calculate hydration percentage and ounces remaining
    const hydrationPercentage = userData.currentConsumption > 0 
      ? Math.round((userData.currentConsumption / userData.dailyGoal) * 100)
      : 0
    const ouncesRemaining = userData.dailyGoal - userData.currentConsumption

    // Determine tone based on user's hydration status
    let tone = 'encouraging'
    if (userData.hoursSinceLastDrink >= 8 && !userData.hasLoggedToday) {
      tone = 'playful_roast'
    } else if (userData.hoursSinceLastDrink >= 4) {
      tone = 'gentle_reminder'
    } else if (hydrationPercentage >= 80) {
      tone = 'celebratory'
    }

    // Create enhanced context for AI with ounces remaining and suggested amount
    let context = `Goal: ${userData.dailyGoal}oz | Current: ${userData.currentConsumption}oz | Remaining: ${ouncesRemaining}oz | Streak: ${userData.streak} | Last: ${userData.hoursSinceLastDrink}hrs ago | Time: ${userData.timeOfDay}`
    
    if (userData.suggestedOz) {
      context += ` | Suggested: ${userData.suggestedOz}oz`
    }
    if (userData.timeSlot) {
      context += ` | Slot: ${userData.timeSlot}`
    }

    const systemPrompt = `You are a friendly hydration coach for a water tracking app. Generate a notification with title, body, and description based on the user's hydration data.

Tone guidelines:
- encouraging: Supportive and motivating
- gentle_reminder: Friendly nudge to drink water
- playful_roast: Light-hearted, funny roasting for users who haven't drunk water in a while (be creative but not mean)
- celebratory: Excited and congratulatory for good progress

Content guidelines:
- Include specific ounces when relevant (e.g., "35oz to go!" or "Try 8oz now")
- Mention remaining ounces if user is behind (e.g., "45oz left today")
- Reference suggested amount if provided (e.g., "Time for your 12oz!")
- Keep it fun, casual, and engaging
- Never use names or personal pronouns - keep messages generic and universal

Emoji guidelines:
- Title: Use exactly 2 emojis max
- Body: No emojis (keep clean)
- Description: Use exactly 1 emoji

Format your response as JSON:
{
  "title": "Title with 2 emojis max",
  "body": "Body message without emojis",
  "description": "Description with 1 emoji"
}`

    const userPrompt = `Generate a ${tone} hydration notification for: ${context}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const result = await response.json()
    const aiResponse = result.choices[0]?.message?.content?.trim()

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response from AI
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      // Fallback to simple message format
      parsedResponse = {
        title: 'HydrateAI 💧',
        body: aiResponse,
        description: 'Time to hydrate! 💪'
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        title: parsedResponse.title || 'HydrateAI 💧',
        body: parsedResponse.body || aiResponse,
        description: parsedResponse.description || 'Time to hydrate! 💪',
        tone,
        context
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in generate-ai-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 