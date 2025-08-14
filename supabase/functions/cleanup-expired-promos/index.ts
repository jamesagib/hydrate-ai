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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting cleanup of expired promos and notification locks...')

    // Clean up expired promo codes
    const { data: expiredPromos, error: promoError } = await supabase
      .from('promo_codes')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select()

    if (promoError) {
      console.error('Error cleaning up expired promos:', promoError)
    } else {
      console.log(`Cleaned up ${expiredPromos?.length || 0} expired promo codes`)
    }

    // Clean up expired notification locks
    const { data: expiredLocks, error: lockError } = await supabase
      .from('notification_locks')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select()

    if (lockError) {
      console.error('Error cleaning up expired notification locks:', lockError)
    } else {
      console.log(`Cleaned up ${expiredLocks?.length || 0} expired notification locks`)
    }

    // Clean up old notifications (older than 30 days) to keep database size manageable
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: oldNotifications, error: notificationError } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo)
      .select()

    if (notificationError) {
      console.error('Error cleaning up old notifications:', notificationError)
    } else {
      console.log(`Cleaned up ${oldNotifications?.length || 0} old notifications`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiredPromos: expiredPromos?.length || 0,
        expiredLocks: expiredLocks?.length || 0,
        oldNotifications: oldNotifications?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 