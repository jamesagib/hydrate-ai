import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const client = createClient(supabaseUrl, serviceRoleKey)

    // Find users whose promo has expired and are still marked active from promo
    const { data: profiles, error } = await client
      .from('profiles')
      .select('user_id')
      .eq('subscription_status', 'active')
      .eq('subscription_source', 'promo')
      .lt('promo_expires_at', new Date().toISOString())

    if (error) throw error

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map(p => p.user_id)
      const { error: updErr } = await client
        .from('profiles')
        .update({ subscription_status: 'inactive' })
        .in('user_id', userIds)
      if (updErr) throw updErr
    }

    return new Response(JSON.stringify({ ok: true, processed: profiles?.length || 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('cleanup-expired-promos error', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}) 