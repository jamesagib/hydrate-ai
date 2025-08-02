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

    // Check daily scan limit
    if (userId) {
      console.log('Checking daily scan limit for user:', userId);
      const scanCount = await getDailyScanCount(userId)
      console.log('Current scan count:', scanCount);
      if (scanCount >= 5) {
        console.log('Daily scan limit reached');
        return new Response(
          JSON.stringify({ error: 'Bad connection. Please try again later.' }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else {
      console.log('No userId provided, skipping scan limit check');
    }

    // Step 1: Check cache first
    const imageHash = generateImageHash(image)
    console.log('Generated image hash:', imageHash);
    const cachedResult = await checkCache(imageHash)
    
    if (cachedResult) {
      console.log('Cache hit for image hash:', imageHash)
      return new Response(
        JSON.stringify({ ...cachedResult, cached: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.log('Cache miss for image hash:', imageHash);
    }

    // Step 2: Analyze image with Google Cloud Vision API
    const visionResult = await analyzeWithVisionAPI(image)
    
    // Step 3: Process with GPT-4 for volume estimation
    const drinkAnalysis = await analyzeWithGPT4(visionResult)
    
    // Step 4: Cache the result
    console.log('Caching result for image hash:', imageHash);
    await cacheResult(imageHash, drinkAnalysis)
    
    // Step 5: Increment daily scan count
    if (userId) {
      console.log('Incrementing daily scan count for user:', userId);
      await incrementDailyScanCount(userId)
    } else {
      console.log('No userId provided, skipping scan count increment');
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
            maxResults: 10
          },
          {
            type: 'OBJECT_LOCALIZATION',
            maxResults: 5
          },
          {
            type: 'TEXT_DETECTION',
            maxResults: 5
          },
          {
            type: 'IMAGE_PROPERTIES'
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
Dominant colors: ${colorInfo}

Please analyze this drink and provide:
1. The most likely drink name
2. Estimated volume in ounces (oz)
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

// Cache functions
async function checkCache(imageHash: string): Promise<DrinkAnalysisResult | null> {
  try {
    const { data, error } = await supabase
      .from('drink_analysis_cache')
      .select('*')
      .eq('image_hash', imageHash)
      .single()
    
    if (error || !data) {
      return null
    }
    
    // Check if cache is still valid (7 days)
    const cacheAge = Date.now() - new Date(data.created_at).getTime()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    
    if (cacheAge > maxAge) {
      // Delete expired cache entry
      await supabase
        .from('drink_analysis_cache')
        .delete()
        .eq('image_hash', imageHash)
      return null
    }
    
    return {
      name: data.name,
      estimatedOz: data.estimated_oz,
      confidence: data.confidence,
      description: data.description
    }
  } catch (error) {
    console.error('Cache check error:', error)
    return null
  }
}

async function cacheResult(imageHash: string, result: DrinkAnalysisResult): Promise<void> {
  try {
    await supabase
      .from('drink_analysis_cache')
      .insert({
        image_hash: imageHash,
        name: result.name,
        estimated_oz: result.estimatedOz,
        confidence: result.confidence,
        description: result.description,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Cache save error:', error)
    // Don't fail the request if caching fails
  }
}

// Scan limit functions
async function getDailyScanCount(userId: string): Promise<number> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data, error } = await supabase
      .from('daily_scan_counts')
      .select('scan_count')
      .eq('user_id', userId)
      .eq('date', today.toISOString().split('T')[0])
      .single()
    
    if (error || !data) {
      return 0
    }
    
    return data.scan_count || 0
  } catch (error) {
    console.error('Error getting daily scan count:', error)
    return 0
  }
}

async function incrementDailyScanCount(userId: string): Promise<void> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateStr = today.toISOString().split('T')[0]
    
    // Try to update existing record
    const { error: updateError } = await supabase
      .from('daily_scan_counts')
      .update({ 
        scan_count: supabase.rpc('increment_scan_count'),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('date', dateStr)
    
    // If no record exists, create one
    if (updateError) {
      await supabase
        .from('daily_scan_counts')
        .insert({
          user_id: userId,
          date: dateStr,
          scan_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error incrementing daily scan count:', error)
    // Don't fail the request if scan counting fails
  }
}