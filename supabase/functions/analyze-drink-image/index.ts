import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client for caching
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Simple hash function for image content
function generateImageHash(base64Image: string): string {
  // Simple hash based on image content length and first/last characters
  const length = base64Image.length
  const start = base64Image.substring(0, 100)
  const end = base64Image.substring(length - 100)
  return btoa(`${length}-${start}-${end}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

interface DrinkAnalysisResult {
  name: string;
  estimatedOz: number;
  confidence: number;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image, userId } = await req.json()

    console.log('Received request with userId:', userId);

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Compute image hash first for cache lookup
    const imageHash = generateImageHash(image)
    console.log('Generated image hash:', imageHash);

    // Try lightweight cache check to avoid Vision+GPT cost
    try {
      const { data: cacheRow } = await supabase
        .from('drink_analysis_cache')
        .select('analysis_result, created_at')
        .eq('image_hash', imageHash)
        .single()

      if (cacheRow) {
        const createdAt = new Date(cacheRow.created_at)
        const ageMs = Date.now() - createdAt.getTime()
        const maxAgeMs = 7 * 24 * 60 * 60 * 1000 // 7 days
        if (ageMs <= maxAgeMs) {
          // Cache hit: call RPC to increment scan count and enforce limits, but skip Vision/GPT
          const { data: dbResult, error } = await supabase.rpc('process_drink_analysis', {
            p_image_hash: imageHash,
            p_analysis_result: cacheRow.analysis_result, // provide cached result for idempotency
            p_user_id: userId || null
          })
          if (error) {
            console.error('Database function error (cache path):', error)
            if ((error as any).code === 'LIMIT_EXCEEDED') {
              return new Response(
                JSON.stringify({ 
                  error: 'Daily scan limit exceeded',
                  errorType: 'LIMIT_EXCEEDED',
                  limitExceeded: true
                }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            throw error
          }

          return new Response(
            JSON.stringify({ ...dbResult.result, cached: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } catch (e) {
      console.log('Cache lookup failed or not found, proceeding to analyze. Error:', e)
    }

    // Cache miss path → run Vision + GPT
    // Step 1: Analyze image with Google Cloud Vision API
    const visionResult = await analyzeWithVisionAPI(image)
    
    // Step 2: Process with GPT-4 for volume estimation
    const drinkAnalysis = await analyzeWithGPT4(visionResult)
    
    // Step 3: Handle caching and scan counting in a single database call
    // imageHash already computed above
    
    try {
      // Get user's subscription status for limit checking
      let userSubscriptionStatus = null;
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('user_id', userId)
            .single();
          userSubscriptionStatus = profile?.subscription_status;
        } catch (error) {
          // If we can't get subscription status, assume trial
          userSubscriptionStatus = 'trial';
        }
      }

      const { data: dbResult, error } = await supabase.rpc('process_drink_analysis', {
        p_image_hash: imageHash,
        p_analysis_result: drinkAnalysis,
        p_user_id: userId || null
      })
      
      if (error) {
        console.error('Database function error:', error);
        if ((error as any).code === 'LIMIT_EXCEEDED') {
          // Get user's subscription status to show appropriate message
          let errorMessage = 'Bad connection. Please try again later.';
          let errorType = 'LIMIT_EXCEEDED';
          
          if (userId) {
            // Use the subscription status we retrieved earlier
            if (userSubscriptionStatus === 'trial' || 
                userSubscriptionStatus === 'TRIAL' ||
                userSubscriptionStatus === 'trialing' || 
                userSubscriptionStatus === 'TRIALING' ||
                !userSubscriptionStatus) {
              errorMessage = 'You\'ve reached your daily limit of 3 scans on the free trial.';
              errorType = 'TRIAL_LIMIT_EXCEEDED';
            } else {
              errorMessage = 'Due to high demand, we\'re experiencing temporary limits. We\'re working on expanding capacity.';
              errorType = 'PAID_LIMIT_EXCEEDED';
            }
          }
          
          return new Response(
            JSON.stringify({ 
              error: errorMessage,
              errorType: errorType,
              limitExceeded: true
            }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        throw error;
      }
      
      console.log('Database result:', dbResult);
      
      return new Response(
        JSON.stringify({ ...dbResult.result, cached: dbResult.cached }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
      
    } catch (error) {
      console.error('Error processing drink analysis:', error);
      throw error;
    }

    return new Response(
      JSON.stringify(drinkAnalysis),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in analyze-drink-image:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function analyzeWithVisionAPI(base64Image: string): Promise<any> {
  const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
  
  if (!visionApiKey) {
    throw new Error('Google Cloud Vision API key not configured')
  }

  const visionRequest = {
    requests: [
      {
        image: {
          content: base64Image
        },
        features: [
          {
            type: 'LABEL_DETECTION',
            maxResults: 15
          },
          {
            type: 'OBJECT_LOCALIZATION',
            maxResults: 10
          },
          {
            type: 'TEXT_DETECTION',
            maxResults: 10
          },
          {
            type: 'IMAGE_PROPERTIES'
          },
          {
            type: 'WEB_DETECTION',
            maxResults: 5
          }
        ]
      }
    ]
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(visionRequest)
    }
  )

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.statusText}`)
  }

  return await response.json()
}

async function analyzeWithGPT4(visionResult: any): Promise<DrinkAnalysisResult> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Extract relevant information from Vision API results
  const labels = visionResult.responses[0]?.labelAnnotations?.map((label: any) => label.description) || []
  const objects = visionResult.responses[0]?.localizedObjectAnnotations?.map((obj: any) => obj.name) || []
  const text = visionResult.responses[0]?.textAnnotations?.[0]?.description || ''
  
  // Extract web detection results for better brand identification
  const webEntities = visionResult.responses[0]?.webDetection?.webEntities?.map((entity: any) => entity.description) || []
  const webMatches = visionResult.responses[0]?.webDetection?.webDetection?.fullMatchingImages?.length || 0
  
  // Extract dominant colors
  const dominantColors = visionResult.responses[0]?.imagePropertiesAnnotation?.dominantColors?.colors || []
  const colorInfo = dominantColors.slice(0, 3).map((color: any) => {
    const rgb = color.color
    const score = color.score
    return `RGB(${rgb.red},${rgb.green},${rgb.blue}) - ${(score * 100).toFixed(1)}%`
  }).join(', ')

  const prompt = `
You are analyzing a drink image for hydration tracking. Based on the following information from Google Cloud Vision API:

Labels detected: ${labels.join(', ')}
Objects detected: ${objects.join(', ')}
Text detected: ${text}
Web entities detected: ${webEntities.join(', ')}
Web matches found: ${webMatches}
Dominant colors: ${colorInfo}

IMPORTANT: Pay special attention to popular water bottle brands and their standard sizes:

WATER BOTTLE BRANDS & SIZES:
- Stanley: 20oz, 30oz, 40oz, 64oz (Quencher), 128oz (Gallon)
- Hydro Flask: 18oz, 21oz, 24oz, 32oz, 40oz, 64oz
- Yeti: 18oz, 20oz, 26oz, 30oz, 36oz, 46oz, 64oz
- Nalgene: 16oz, 20oz, 32oz, 48oz, 64oz, 96oz
- CamelBak: 20oz, 25oz, 32oz, 50oz, 75oz
- Contigo: 20oz, 24oz, 32oz, 40oz
- Simple Modern: 20oz, 24oz, 32oz, 40oz, 64oz
- Owala: 24oz, 32oz, 40oz
- Brumate: 20oz, 25oz, 32oz, 40oz

Look for brand names in the text detection and visual cues like:
- Stanley: Often has a handle, wide mouth, metallic finish
- Hydro Flask: Cylindrical, often colorful, wide mouth
- Yeti: Similar to Stanley, often has a handle
- Nalgene: Clear plastic, wide mouth, often has measurement markings

Please analyze this drink and provide:
1. The most likely drink name (include brand if detected)
2. Estimated volume in ounces (oz) - use standard sizes for known brands
3. Confidence level (0-1)
4. Brief description of your reasoning

Consider common drink containers and their typical sizes. Use color information to help identify specific drink types (e.g., red for cherry drinks, blue for blue Gatorade, brown for coffee/cola, clear for water). Be conservative with estimates.

Respond in this exact JSON format:
{
  "name": "Drink Name",
  "estimatedOz": 12,
  "confidence": 0.85,
  "description": "Brief reasoning"
}
`

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
          content: 'You are a helpful assistant that analyzes drink images for hydration tracking. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const result = await response.json()
  const content = result.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from OpenAI')
  }

  try {
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const drinkAnalysis = JSON.parse(jsonMatch[0])
    
    // Validate and sanitize the response
    return {
      name: drinkAnalysis.name || 'Unknown Drink',
      estimatedOz: Math.max(1, Math.min(100, drinkAnalysis.estimatedOz || 8)),
      confidence: Math.max(0, Math.min(1, drinkAnalysis.confidence || 0.5)),
      description: drinkAnalysis.description || 'Analysis completed'
    }
  } catch (parseError) {
    console.error('Error parsing GPT response:', parseError)
    // Fallback response
    return {
      name: 'Water',
      estimatedOz: 8,
      confidence: 0.5,
      description: 'Default fallback response'
    }
  }
}

// Database functions are now handled by the process_drink_analysis RPC function
// This provides better performance and atomicity