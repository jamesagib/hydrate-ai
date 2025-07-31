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

    // Get current time in UTC
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()

    // Get all users who want coaching and have hydration plans
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        name,
        wants_coaching,
        climate,
        activity_level,
        push_token
      `)
      .eq('wants_coaching', true)

    if (usersError) throw usersError

    const notificationsSent = []

    for (const user of users) {
      // Get user's hydration plan
      const { data: plan, error: planError } = await supabase
        .from('hydration_plans')
        .select('suggested_logging_times, daily_goal')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (planError || !plan) continue

      const { suggested_logging_times } = plan
      if (!suggested_logging_times || !Array.isArray(suggested_logging_times)) continue

      // Get user's timezone (default to UTC if not set)
      const userTimezone = user.timezone || 'UTC'

      // Check if it's time to send a notification for this user
      for (const timeSlot of suggested_logging_times) {
        const { time, oz, note } = timeSlot
        
        // Parse time (e.g., "7:00 AM" or "08:00")
        const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (!timeParts) continue

        let hour = parseInt(timeParts[1])
        const minute = parseInt(timeParts[2])
        const period = timeParts[3]?.toUpperCase()

        // Convert to 24-hour format
        if (period === 'PM' && hour !== 12) hour += 12
        if (period === 'AM' && hour === 12) hour = 0

        // Convert user's local time to UTC for comparison
        const userLocalTime = new Date().toLocaleString("en-US", {timeZone: userTimezone})
        const userLocalDate = new Date(userLocalTime)
        const userLocalHour = userLocalDate.getHours()
        const userLocalMinute = userLocalDate.getMinutes()
        
        // Check if it's time to send this notification in user's timezone (exact minute match)
        if (userLocalHour === hour && userLocalMinute === minute) {
          // Determine which template to use based on context
          let templateName = 'daily_splash_1'; // default
          
          // Check user's recent activity and streak
          const { data: recentCheckins } = await supabase
            .from('hydration_checkins')
            .select('created_at')
            .eq('user_id', user.user_id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          const { data: streak } = await supabase
            .from('streaks')
            .select('current_streak, longest_streak')
            .eq('user_id', user.user_id)
            .single();

          // Check if user has logged today
          const today = new Date().toDateString();
          const hasLoggedToday = recentCheckins?.some(checkin => 
            new Date(checkin.created_at).toDateString() === today
          );

          // Choose template based on user behavior and context
          if (!hasLoggedToday && recentCheckins.length === 0) {
            // User hasn't logged at all today - use roast mode
            templateName = 'roast_mode_3';
          } else if (!hasLoggedToday && recentCheckins.length < 2) {
            // User is behind schedule
            templateName = 'behind_schedule_2';
          } else if (streak?.current_streak >= 7) {
            // User has a good streak - celebrate
            templateName = 'streak_celebration_1';
          } else if (streak?.current_streak >= 3) {
            // User has a decent streak - encourage
            templateName = 'streak_celebration_2';
          } else if (recentCheckins.length >= 5) {
            // User is doing well - use AI checkin
            templateName = 'ai_checkin_1';
          } else {
            // Default based on time of day
            if (userLocalHour >= 5 && userLocalHour < 12) {
              templateName = 'daily_splash_1';
            } else if (userLocalHour >= 12 && userLocalHour < 17) {
              templateName = 'daily_splash_3';
            } else if (userLocalHour >= 17 && userLocalHour < 22) {
              templateName = 'daily_splash_3';
            }
          }
          
          // Get notification template
          const { data: template, error: templateError } = await supabase
            .from('notification_templates')
            .select('title, body')
            .eq('name', templateName)
            .eq('is_active', true)
            .single()

          // Create notification content
          let title = 'Time to Hydrate! 💧'
          let body = `Time to hydrate! `
          
          if (oz) {
            body += `Aim for ${oz} oz. `
          }
          
          if (note) {
            body += note
          } else if (template && !templateError) {
            // Use template with variable substitution
            body = template.body
              .replace('{{name}}', user.name || 'there')
              .replace('{{oz}}', oz || 'some water')
              .replace('{{time}}', `${hour}:${minute.toString().padStart(2, '0')}`)
          } else {
            // Fallback to default messages based on climate and activity
            if (user.climate === 'hot') {
              body += 'Stay cool and hydrated!'
            } else if (user.activity_level === 'high') {
              body += 'Keep your energy up!'
            } else {
              body += 'Stay healthy and hydrated!'
            }
          }

          // Send push notification if user has a push token
          if (user.push_token) {
            try {
              console.log(`Attempting to send push notification to user ${user.user_id} with token: ${user.push_token.substring(0, 20)}...`)
              
              const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
                body: {
                  token: user.push_token,
                  title,
                  body,
                  data: {
                    userId: user.user_id,
                    type: 'hydration_reminder',
                    timeSlot,
                    oz: oz || null,
                    note: note || null,
                  }
                }
              })

              if (pushError) {
                console.error(`Push notification error for user ${user.user_id}:`, pushError)
              } else {
                console.log(`Push notification sent successfully to user ${user.user_id}:`, pushData)
                
                // Save notification to database
                await supabase
                  .from('notifications')
                  .insert({
                    user_id: user.user_id,
                    template_id: template?.id || null,
                    title,
                    body,
                    status: 'sent',
                    metadata: {
                      timeSlot,
                      scheduledTime: `${hour}:${minute.toString().padStart(2, '0')}`,
                      type: 'hydration_reminder'
                    }
                  })

                notificationsSent.push({
                  userId: user.user_id,
                  title,
                  body
                })
              }
            } catch (error) {
              console.error(`Error sending push notification to user ${user.user_id}:`, error)
            }
          } else {
            console.log(`No push token found for user ${user.user_id}`)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notificationsSent.length,
        details: notificationsSent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-hydration-reminder:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 