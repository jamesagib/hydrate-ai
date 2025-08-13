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
      // Check user's recent activity (last 2 weeks)
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      // const today = new Date().toDateString(); // Not timezone-aware; avoid using for logic
      
      const { data: recentActivity, error: activityError } = await supabase
        .from('hydration_checkins')
        .select('created_at')
        .eq('user_id', user.user_id)
        .gte('created_at', twoWeeksAgo)
        .order('created_at', { ascending: false });

      if (activityError) {
        console.error(`Error checking activity for user ${user.user_id}:`, activityError);
        continue;
      }

      // Basic inactivity diagnostics (does not affect sending)
      const isInactive = (!recentActivity || recentActivity.length === 0);
      const lastActivity = recentActivity && recentActivity.length > 0 
        ? new Date(recentActivity[0].created_at) 
        : null;
      
      // Debug logging for inactivity check
      console.log(`User ${user.user_id} activity check:`, {
        recentActivityCount: recentActivity?.length || 0,
        isInactive,
        lastActivity: lastActivity?.toISOString(),
      });
      
      // Note: Do NOT skip scheduled reminders for inactive users.
      // We only limit roast-style nudges separately below.

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
      const todayLocalDate = userLocalTime.toDateString()
      
      // Debug logging for timezone issues
      console.log(`User ${user.user_id} timezone: ${validTimezone}, current UTC: ${utcTime.toISOString()}, local time: ${userLocalTime.toLocaleString()}, local hour: ${userLocalHour}, local minute: ${userLocalMinute}`)

      // Check if it's time to send a notification for this user
      for (const timeSlot of suggested_logging_times) {
        const { time, oz, note } = timeSlot
        
        // Parse time (e.g., "7:00 AM", "7 AM", "19:05", or "7")
        const trimmed = String(time).trim()
        const m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
        if (!m) {
          console.log(`Unrecognized time format for user ${user.user_id}: '${time}'`)
          continue
        }
        let targetHour = parseInt(m[1], 10)
        const targetMinute = m[2] ? parseInt(m[2], 10) : 0
        const period = m[3]?.toUpperCase()

        // Convert to 24-hour format
        if (period === 'PM' && targetHour !== 12) targetHour += 12
        if (period === 'AM' && targetHour === 12) targetHour = 0

        // Check if it's time to send this notification (within a 2-minute window to avoid duplicates)
        const currentTotalMinutes = userLocalHour * 60 + userLocalMinute
        const targetTotalMinutes = targetHour * 60 + targetMinute
        const timeDiff = Math.abs(currentTotalMinutes - targetTotalMinutes)
        const shouldSend = timeDiff <= 10 // Send within 10 minutes of target time
        
        console.log(`User ${user.user_id} target: ${targetHour}:${targetMinute}, current: ${userLocalHour}:${userLocalMinute}, diff: ${timeDiff} minutes, shouldSend: ${shouldSend}`)
        
        if (shouldSend) {
          const timeSlotKey = `${targetHour}:${targetMinute.toString().padStart(2, '0')}`
          
          console.log(`Checking for existing notifications for user ${user.user_id} at time slot ${timeSlotKey}`)
          
          // Check for existing notifications in the last 24 hours for this user (for roast limiting)
          const { data: existingNotifications, error: existingError } = await supabase
            .from('notifications')
            .select('id, metadata, created_at, body')
            .eq('user_id', user.user_id)
            .eq('status', 'sent')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

          if (existingError) {
            console.error(`Error checking existing notifications:`, existingError)
          }

          console.log(`Found ${existingNotifications?.length || 0} existing notifications for user ${user.user_id} in last 24 hours`)

          // Check if any existing notification has the same scheduled time (same local day)
          const hasExistingNotification = existingNotifications?.some(notification => {
            const metadata = notification.metadata
            const createdAt = new Date(notification.created_at)
            const createdAtLocal = new Date(createdAt.toLocaleString('en-US', { timeZone: validTimezone }))
            const sameLocalDay = createdAtLocal.toDateString() === todayLocalDate
            const sameTime = metadata && metadata.scheduledTime === timeSlotKey
            if (sameLocalDay && sameTime) {
              console.log(`Found matching notification today: ${notification.id} with scheduledTime: ${metadata?.scheduledTime}`)
            }
            return sameLocalDay && sameTime
          })

          if (hasExistingNotification) {
            console.log(`Notification already sent recently for user ${user.user_id} at ${timeSlotKey} - SKIPPING`)
            continue
          }

          // Check user's recent activity and streak
          const { data: recentCheckins } = await supabase
            .from('hydration_checkins')
            .select('created_at, value')
            .eq('user_id', user.user_id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          const { data: streak } = await supabase
            .from('streaks')
            .select('current_streak, longest_streak')
            .eq('user_id', user.user_id)
            .single();

          // Check if user has logged today (user local day)
          const hasLoggedToday = recentCheckins?.some(checkin => {
            const createdAt = new Date(checkin.created_at)
            const createdAtLocal = new Date(createdAt.toLocaleString('en-US', { timeZone: validTimezone }))
            return createdAtLocal.toDateString() === todayLocalDate
          });

          // Calculate hours since last drink
          let hoursSinceLastDrink = 24;
          if (recentCheckins && recentCheckins.length > 0) {
            const lastDrink = new Date(Math.max(...recentCheckins.map(c => new Date(c.created_at).getTime())));
            hoursSinceLastDrink = Math.floor((Date.now() - lastDrink.getTime()) / (1000 * 60 * 60));
          }

          // Apply roast limit ONLY if current message would be a roast (8+ hrs since last drink and not logged today)
          const wouldBeRoast = (hoursSinceLastDrink >= 8) && !hasLoggedToday
          if (wouldBeRoast) {
            const roastNotifications = existingNotifications?.filter(notification => {
              const metadata = notification.metadata
              return metadata?.templateName?.startsWith('roast_mode_')
            }) || []
            console.log(`User ${user.user_id} has ${roastNotifications.length} roast notifications today`)
            if (roastNotifications.length >= 2) {
              console.log(`Roast limit exceeded for user ${user.user_id} - SKIPPING`)
              continue
            }
          }
          
          // Calculate current daily consumption (user local day)
          let currentConsumption = 0;
          if (recentCheckins && plan.daily_goal) {
            const goalMatch = plan.daily_goal.match(/(\d+)/);
            if (goalMatch) {
              currentConsumption = recentCheckins.reduce((sum, checkin) => {
                const checkinDateLocal = new Date(new Date(checkin.created_at).toLocaleString('en-US', { timeZone: validTimezone }));
                if (checkinDateLocal.toDateString() === todayLocalDate) {
                  return sum + (checkin.value || 0);
                }
                return sum;
              }, 0);
            }
          }

          // Get time of day for context
          const timeOfDay = userLocalHour < 12 ? 'morning' : 
                           userLocalHour < 17 ? 'afternoon' : 'evening';

          // Generate AI-powered notification
          let title = 'HydrateAI 💧'
          let body = 'Time to hydrate!'
          
          try {
            // Create a new Supabase client with service role key for function-to-function calls
            const supabaseService = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            )
            
            const { data: aiResponse, error: aiError } = await supabaseService.functions.invoke('generate-ai-notification', {
              body: {
                userData: {
                  dailyGoal: plan.daily_goal ? parseInt(plan.daily_goal.match(/(\d+)/)?.[1] || '80') : 80,
                  currentConsumption,
                  streak: streak?.current_streak || 0,
                  hoursSinceLastDrink,
                  hasLoggedToday,
                  timeOfDay,
                  suggestedOz: oz || null,
                  timeSlot: time || null
                }
              }
            })

            if (!aiError && aiResponse?.success) {
              title = aiResponse.title || 'HydrateAI 💧';
              body = aiResponse.body || 'Time to hydrate!';
              console.log(`AI generated notification for user ${user.user_id}: ${title} - ${body}`);
            } else {
              console.error(`AI notification error for user ${user.user_id}:`, aiError);
              // Fallback to simple message
              if ((hoursSinceLastDrink >= 8) && !hasLoggedToday) {
                title = 'Bro, you good? 💧🌵';
                body = 'Your plants are more hydrated than you';
              } else if (hoursSinceLastDrink >= 4) {
                title = 'Time for a water break! 💧';
                body = 'Your body is waiting for hydration';
              } else {
                title = 'Stay hydrated! 💧';
                body = 'Time to sip some water';
              }
            }
          } catch (error) {
            console.error(`Error calling AI notification service for user ${user.user_id}:`, error);
            // Fallback to simple message
            title = 'HydrateAI 💧';
            body = 'Time to hydrate!';
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
                    template_id: null, // AI-generated, no template
                    title,
                    body,
                    status: 'sent',
                    metadata: {
                      timeSlot,
                      scheduledTime: `${targetHour}:${targetMinute.toString().padStart(2, '0')}`,
                      type: 'hydration_reminder',
                      templateName: 'ai_generated',
                      dateKey: todayLocalDate
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