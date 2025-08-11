import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing promo code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Extract user from Authorization header
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: userErr } = await serviceClient.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = userData.user.id
    const normalizedCode = code.trim().toUpperCase()

    // Fetch promo code details
    const { data: promo, error: promoErr } = await serviceClient
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('active', true)
      .maybeSingle()

    if (promoErr || !promo) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check expiry
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Code expired' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check max redemptions
    const { count: redemptionCount } = await serviceClient
      .from('promo_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('code', normalizedCode)

    if (promo.max_redemptions !== null && promo.max_redemptions !== undefined && redemptionCount !== null && redemptionCount >= promo.max_redemptions) {
      return new Response(JSON.stringify({ error: 'Redemption limit reached' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Ensure user hasn't redeemed this code already
    const { data: prior } = await serviceClient
      .from('promo_redemptions')
      .select('id')
      .eq('code', normalizedCode)
      .eq('user_id', userId)
      .maybeSingle()

    if (prior) {
      return new Response(JSON.stringify({ error: 'Code already redeemed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Record redemption
    const { error: insErr } = await serviceClient
      .from('promo_redemptions')
      .insert({ user_id: userId, code: normalizedCode })

    if (insErr) {
      return new Response(JSON.stringify({ error: 'Failed to record redemption' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Compute promo expiration for profile
    const durationDays = promo.duration_days ?? 3
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

    // Activate user in profiles with source and expiry
    const { error: updErr } = await serviceClient
      .from('profiles')
      .update({ subscription_status: 'active', subscription_source: 'promo', promo_expires_at: expiresAt.toISOString() })
      .eq('user_id', userId)

    if (updErr) {
      return new Response(JSON.stringify({ error: 'Failed to activate subscription' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, expiresAt, campaign: promo.campaign || null, durationDays }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('redeem-promo-code error', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}) 