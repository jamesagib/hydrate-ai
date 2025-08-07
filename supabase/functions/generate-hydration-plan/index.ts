import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface OnboardingData {
  age: number;
  weight_kg: number;
  sex: string;
  activity_level: string;
  climate: string;
  wants_coaching: boolean;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

serve(async (req) => {
  try {
    const { onboarding } = await req.json();
    if (!onboarding) {
      return new Response(JSON.stringify({ error: 'Missing onboarding data' }), { status: 400 });
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { status: 500 });
    }

    // Format the GPT-4o mini prompt
    const prompt = `You are a hydration expert creating a personalized hydration plan for the Water AI app.

Input (JSON):
{
  "Age": ${onboarding.age ? onboarding.age : '"not provided"'},
  "Weight": ${onboarding.weight_kg ? Math.round(onboarding.weight_kg * 2.20462) : '"not provided"'},
  "Sex": "${onboarding.sex || 'not provided'}",
  "Activity Level": "${onboarding.activity_level}",
  "Climate": "${onboarding.climate}",
  "Health Notes": "None",
  "Preference for reminders": "${onboarding.wants_coaching ? 'Yes' : 'No'}",
}

Instructions:
- Calculate daily water intake goal based on all inputs.
- If Age or Sex are marked as "not provided", infer conservatively based on other inputs and avoid over-personalization.
- Use reasoning to explain recommendations (e.g., impacts of climate, activity, beverages).
- Suggest logging times and hydration amounts.
- Include lifestyle adjustments and pro tips.
- If reminders preferred, mention app nudges.
- Use the following output format exactly:

HydrateAI Plan for You 🫗  
🌊 Daily Goal: {{total_oz}} oz ({{total_liters}} L)  
_{{reasoning about needs}}_

🕒 Suggested Logging Times:  
- {{time}} – {{oz}} oz ({{note}})  
...  

🔥 Adjustments for Lifestyle:  
_{{text}}_

💡 Pro Tip:  
_{{text}}_

🔔 Reminders:  
_{{text}}_

---

Create the hydration plan now.`;

    // Call OpenAI GPT-4o mini API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a hydration expert. Provide accurate, personalized hydration advice based on user data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate hydration plan' }), { status: 500 });
    }

    const data: OpenAIResponse = await response.json();
    const planText = data.choices[0]?.message?.content || 'Failed to generate plan';

    return new Response(JSON.stringify({ plan_text: planText }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}); 