import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, title, body, data } = await req.json()

    if (!token || !title || !body) {
      throw new Error('Missing required fields: token, title, body')
    }

    // Send push notification via Expo
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Expo push notification failed: ${JSON.stringify(result)}`)
    }

    // Handle Expo response and prune invalid tokens
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const handleError = async (err: any) => {
      const code = err?.details?.error || err?.errors?.[0]?.code || err?.error
      if (code === 'DeviceNotRegistered' || code === 'InvalidCredentials' || code === 'MessageTooBig' || code === 'ExpoTokenInvalid') {
        // Null the bad token so we stop trying
        await supabase.from('profiles').update({ push_token: null }).eq('push_token', token)
      }
    }

    // v2 API can return { data: { status: 'ok'|'error', ... } } or { data: [{...}] }
    const dataField = (result && result.data) || null
    if (Array.isArray(dataField)) {
      for (const item of dataField) {
        if (item?.status === 'error') {
          await handleError(item)
        }
      }
    } else if (dataField && typeof dataField === 'object') {
      if (dataField.status === 'error') {
        await handleError(dataField)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending push notification:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 