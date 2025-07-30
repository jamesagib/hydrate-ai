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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Delete all user data in the correct order (respecting foreign key constraints)
    console.log(`Starting deletion for user: ${userId}`)

    // 1. Delete notifications
    const { error: notificationsError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
    
    if (notificationsError) {
      console.error('Error deleting notifications:', notificationsError)
    }

    // 2. Delete achievements
    const { error: achievementsError } = await supabase
      .from('achievements')
      .delete()
      .eq('user_id', userId)
    
    if (achievementsError) {
      console.error('Error deleting achievements:', achievementsError)
    }

    // 3. Delete hydration checkins
    const { error: checkinsError } = await supabase
      .from('hydration_checkins')
      .delete()
      .eq('user_id', userId)
    
    if (checkinsError) {
      console.error('Error deleting hydration checkins:', checkinsError)
    }

    // 4. Delete hydration plans
    const { error: plansError } = await supabase
      .from('hydration_plans')
      .delete()
      .eq('user_id', userId)
    
    if (plansError) {
      console.error('Error deleting hydration plans:', plansError)
    }

    // 5. Delete streaks
    const { error: streaksError } = await supabase
      .from('streaks')
      .delete()
      .eq('user_id', userId)
    
    if (streaksError) {
      console.error('Error deleting streaks:', streaksError)
    }

    // 6. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // 7. Finally, delete the user account
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully deleted user: ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-account function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 