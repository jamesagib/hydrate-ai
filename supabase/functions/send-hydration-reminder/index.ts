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
        push_token,
        timezone
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
      
      // Validate timezone - if invalid, use UTC
      let validTimezone = 'UTC'
      try {
        new Date().toLocaleString("en-US", {timeZone: userTimezone})
        validTimezone = userTimezone
      } catch (error) {
        console.log(`Invalid timezone ${userTimezone} for user ${user.user_id}, using UTC`)
      }

      // Get current time in user's timezone using proper conversion
      // Create a date object in the user's timezone
      const utcTime = new Date()
      const userLocalTime = new Date(utcTime.toLocaleString("en-US", {timeZone: validTimezone}))
      const userLocalHour = userLocalTime.getHours()
      const userLocalMinute = userLocalTime.getMinutes()
      
      // Debug logging for timezone issues
      console.log(`User ${user.user_id} timezone: ${validTimezone}, current UTC: ${utcTime.toISOString()}, local time: ${userLocalTime.toLocaleString()}, local hour: ${userLocalHour}, local minute: ${userLocalMinute}`)

      // Check if it's time to send a notification for this user
      for (const timeSlot of suggested_logging_times) {
        const { time, oz, note } = timeSlot
        
        // Parse time (e.g., "7:00 AM" or "08:00")
        const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (!timeParts) continue

        let targetHour = parseInt(timeParts[1])
        const targetMinute = parseInt(timeParts[2])
        const period = timeParts[3]?.toUpperCase()

        // Convert to 24-hour format
        if (period === 'PM' && targetHour !== 12) targetHour += 12
        if (period === 'AM' && targetHour === 12) targetHour = 0

        // Check if it's time to send this notification (within a 2-minute window to avoid duplicates)
        const timeDiff = Math.abs((userLocalHour * 60 + userLocalMinute) - (targetHour * 60 + targetMinute))
        const shouldSend = timeDiff <= 2 // Send within 2 minutes of target time (reduced from 5)
        
        console.log(`User ${user.user_id} target: ${targetHour}:${targetMinute}, current: ${userLocalHour}:${userLocalMinute}, diff: ${timeDiff} minutes, shouldSend: ${shouldSend}`)
        
        if (shouldSend) {
          // Check if we already sent a notification for this time slot today
          const today = new Date().toDateString()
          const timeSlotKey = `${targetHour}:${targetMinute.toString().padStart(2, '0')}`
          
          console.log(`Checking for existing notifications for user ${user.user_id} at time slot ${timeSlotKey}`)
          
          // Check for existing notifications in the last 24 hours for this user and time slot
          const { data: existingNotifications, error: existingError } = await supabase
            .from('notifications')
            .select('id, metadata, created_at')
            .eq('user_id', user.user_id)
            .eq('status', 'sent')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

          if (existingError) {
            console.error(`Error checking existing notifications:`, existingError)
          }

          console.log(`Found ${existingNotifications?.length || 0} existing notifications for user ${user.user_id}`)

          // Check if any existing notification has the same scheduled time
          const hasExistingNotification = existingNotifications?.some(notification => {
            const metadata = notification.metadata;
            const matches = metadata && metadata.scheduledTime === timeSlotKey;
            if (matches) {
              console.log(`Found matching notification: ${notification.id} with scheduledTime: ${metadata.scheduledTime}`)
            }
            return matches;
          });

          if (hasExistingNotification) {
            console.log(`Notification already sent today for user ${user.user_id} at ${timeSlotKey} - SKIPPING`)
            continue
          }

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
          const hasLoggedToday = recentCheckins?.some(checkin => 
            new Date(checkin.created_at).toDateString() === today
          );

          // Calculate hours since last drink
          let hoursSinceLastDrink = 24;
          if (recentCheckins && recentCheckins.length > 0) {
            const lastDrink = new Date(Math.max(...recentCheckins.map(c => new Date(c.created_at).getTime())));
            hoursSinceLastDrink = Math.floor((Date.now() - lastDrink.getTime()) / (1000 * 60 * 60));
          }

          // Choose template based on user behavior and context (no hardcoded time ranges)
          if (!hasLoggedToday && recentCheckins.length === 0) {
            // User hasn't logged at all today - use specific roast based on hours
            if (hoursSinceLastDrink >= 24) {
              templateName = 'roast_mode_1'; // "You good dehydrated legend?"
            } else if (hoursSinceLastDrink >= 12) {
              templateName = 'roast_mode_2'; // "Is your faucet broken?"
            } else if (hoursSinceLastDrink >= 8) {
              templateName = 'roast_mode_3'; // "You're 70% water... or were"
            } else if (hoursSinceLastDrink >= 6) {
              templateName = 'roast_mode_4'; // "Dry spell much?"
            } else {
              templateName = 'roast_mode_5'; // "Liquid? Never heard of her"
            }
          } else if (!hasLoggedToday && recentCheckins.length < 2) {
            // User is behind schedule - use specific behind schedule template
            if (hoursSinceLastDrink >= 12) {
              templateName = 'behind_schedule_1'; // "Uh oh... dehydrated much?"
            } else if (hoursSinceLastDrink >= 8) {
              templateName = 'behind_schedule_2'; // "Falling behind friend"
            } else {
              templateName = 'behind_schedule_3'; // "SOS: Water levels low"
            }
          } else if (streak?.current_streak >= 7) {
            // User has a good streak - celebrate
            templateName = 'streak_celebration_1';
          } else if (streak?.current_streak >= 3) {
            // User has a decent streak - encourage
            templateName = 'streak_celebration_2';
          } else if (recentCheckins.length >= 5) {
            // User is doing well - use AI checkin
            if (hoursSinceLastDrink >= 4) {
              templateName = 'ai_checkin_1'; // "WaterAI check-in"
            } else {
              templateName = 'ai_checkin_2'; // "We're in this together"
            }
          } else if (hoursSinceLastDrink > 6) {
            // User hasn't drunk in a while - gentle reminder
            if (hoursSinceLastDrink >= 8) {
              templateName = 'daily_splash_1'; // "Time to sip"
            } else if (hoursSinceLastDrink >= 6) {
              templateName = 'daily_splash_2'; // "Hydration vibes only"
            } else {
              templateName = 'daily_splash_3'; // "Drink break alert"
            }
          } else {
            // Default - gentle daily splash
            templateName = 'daily_splash_1';
          }
          
          // Get notification template
          const { data: template, error: templateError } = await supabase
            .from('notification_templates')
            .select('title, body')
            .eq('name', templateName)
            .eq('is_active', true)
            .single()

          // Create notification content
          let title = 'Quick Sip Break 💧'
          let body = `Time to hydrate! `
          
          if (template && !templateError) {
            // Use template with variable substitution
            title = template.title || title
            body = template.body
              .replace('{{name}}', user.name || 'there')
              .replace('{{oz}}', oz || 'some water')
              .replace('{{time}}', `${targetHour}:${targetMinute.toString().padStart(2, '0')}`)
              .replace('{{hours_since_last_drink}}', hoursSinceLastDrink.toString())
              .replace('{{streak}}', streak?.current_streak?.toString() || '0')
            
            // Calculate goal percentage if we have recent checkins and daily goal
            if (recentCheckins && plan.daily_goal) {
              const goalMatch = plan.daily_goal.match(/(\d+)/);
              if (goalMatch) {
                const dailyGoalOz = parseInt(goalMatch[1]);
                const totalLoggedToday = recentCheckins.reduce((sum, checkin) => {
                  const checkinDate = new Date(checkin.created_at);
                  if (checkinDate.toDateString() === today) {
                    return sum + (checkin.oz || 0);
                  }
                  return sum;
                }, 0);
                const goalPercentage = Math.round((totalLoggedToday / dailyGoalOz) * 100);
                body = body.replace('{{goal_percentage}}', goalPercentage.toString());
              }
            }
          } else {
            // Fallback to default messages based on context
            if (oz) {
              body += `Try ${oz} oz now. Your body will thank you later! 💪`
            }
            
            if (note) {
              body += note
            } else {
              // Use context-aware fallback messages
              if (!hasLoggedToday && recentCheckins.length === 0) {
                body = 'You good dehydrated legend? 💧'
              } else if (!hasLoggedToday && recentCheckins.length < 2) {
                body = 'Falling behind friend - time to catch up! 💧'
              } else if (streak?.current_streak >= 7) {
                body = `🔥 ${streak.current_streak} day streak! Keep it going! 💧`
              } else if (hoursSinceLastDrink > 6) {
                body = 'Dry spell much? Time to hydrate! 💧'
              } else {
                body += 'Stay healthy and hydrated!'
              }
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
                      scheduledTime: `${targetHour}:${targetMinute.toString().padStart(2, '0')}`,
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