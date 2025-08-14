import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Reliability: Generate unique idempotency key for each notification attempt
function generateIdempotencyKey(userId: string, timeSlot: string, dateKey: string): string {
  return `hydration_${userId}_${timeSlot}_${dateKey}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

// Reliability: Check if notification was already sent using idempotency key
async function checkIdempotency(supabase: any, idempotencyKey: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('metadata->>idempotencyKey', idempotencyKey)
      .eq('status', 'sent')
      .limit(1)
    
    if (error) {
      console.error('Error checking idempotency:', error)
      return false // Allow sending if we can't check
    }
    
    return data && data.length > 0
  } catch (error) {
    console.error('Exception checking idempotency:', error)
    return false
  }
}

// Reliability: Acquire user lock to prevent race conditions
async function acquireUserLock(supabase: any, userId: string): Promise<boolean> {
  try {
    const lockKey = `notification_lock_${userId}`
    const { data, error } = await supabase
      .from('notification_locks')
      .upsert({
        user_id: userId,
        lock_key: lockKey,
        acquired_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minute lock
      }, {
        onConflict: 'user_id'
      })
    
    if (error) {
      console.error(`Failed to acquire lock for user ${userId}:`, error)
      return false
    }
    
    return true
  } catch (error) {
    console.error(`Exception acquiring lock for user ${userId}:`, error)
    return false
  }
}

// Reliability: Release user lock
async function releaseUserLock(supabase: any, userId: string): Promise<void> {
  try {
    await supabase
      .from('notification_locks')
      .delete()
      .eq('user_id', userId)
  } catch (error) {
    console.error(`Error releasing lock for user ${userId}:`, error)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const functionId = Math.random().toString(36).substring(7)
  
  console.log(`[${functionId}] Starting hydration reminder function at ${new Date().toISOString()}`)

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time in UTC
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()

    console.log(`[${functionId}] Current UTC time: ${currentHour}:${currentMinute}`)

    // Get all users who want coaching, have hydration plans, and have active subscriptions
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        name,
        wants_coaching,
        climate,
        activity_level,
        push_token,
        timezone,
        subscription_status
      `)
      .eq('wants_coaching', true)
      .not('push_token', 'is', null) // Only users with push tokens
      .or('subscription_status.eq.active,subscription_status.eq.trial') // Only active/trial users

    if (usersError) {
      console.error(`[${functionId}] Error fetching users:`, usersError)
      throw usersError
    }

    console.log(`[${functionId}] Found ${users?.length || 0} eligible users for notifications`)

    const notificationsSent = []
    const errors = []

    for (const user of users) {
      const userStartTime = Date.now()
      
      // Reliability: Check subscription status
      if (!user.subscription_status || (user.subscription_status !== 'active' && user.subscription_status !== 'trial')) {
        console.log(`[${functionId}] Skipping user ${user.user_id} - subscription status: ${user.subscription_status}`)
        continue
      }

      // Reliability: Acquire user lock to prevent race conditions
      const lockAcquired = await acquireUserLock(supabase, user.user_id)
      if (!lockAcquired) {
        console.log(`[${functionId}] Could not acquire lock for user ${user.user_id}, skipping`)
        continue
      }

      try {
        // Get user's timezone (default to UTC if not set)
        const userTimezone = user.timezone || 'UTC'
        
        // Validate timezone - if invalid, use UTC
        let validTimezone = 'UTC'
        try {
          // Test if timezone is valid by trying to format a date
          const testDate = new Date()
          testDate.toLocaleString("en-US", {timeZone: userTimezone})
          validTimezone = userTimezone
        } catch (error) {
          console.log(`[${functionId}] Invalid timezone ${userTimezone} for user ${user.user_id}, using UTC`)
        }

        // Get current time in user's timezone using proper conversion
        const utcTime = new Date()
        const userLocalTime = new Date(utcTime.toLocaleString("en-US", {timeZone: validTimezone}))
        const userLocalHour = userLocalTime.getHours()
        const userLocalMinute = userLocalTime.getMinutes()
        const todayLocalDate = userLocalTime.toDateString()
        
        // Enhanced timezone logging for debugging
        console.log(`[${functionId}] User ${user.user_id} timezone: ${validTimezone}`)
        console.log(`[${functionId}] UTC time: ${utcTime.toISOString()}`)
        console.log(`[${functionId}] User local time: ${userLocalTime.toLocaleString('en-US', {timeZone: validTimezone})}`)
        console.log(`[${functionId}] User local hour: ${userLocalHour}, minute: ${userLocalMinute}`)
        console.log(`[${functionId}] User local date: ${todayLocalDate}`)

        // Get user's hydration plan
        const { data: plan, error: planError } = await supabase
          .from('hydration_plans')
          .select('suggested_logging_times, daily_goal')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (planError || !plan) {
          console.log(`[${functionId}] No hydration plan found for user ${user.user_id}`)
          continue
        }

        const { suggested_logging_times } = plan
        if (!suggested_logging_times || !Array.isArray(suggested_logging_times)) {
          console.log(`[${functionId}] No suggested logging times for user ${user.user_id}`)
          continue
        }

        console.log(`[${functionId}] User ${user.user_id} has ${suggested_logging_times.length} scheduled time slots`)

        // Check if it's time to send a notification for this user
        for (const timeSlot of suggested_logging_times) {
          const { time, oz, note } = timeSlot
          
          // Parse time (e.g., "7:00 AM", "7 AM", "19:05", or "7")
          const trimmed = String(time).trim()
          const m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
          if (!m) {
            console.log(`[${functionId}] Unrecognized time format for user ${user.user_id}: '${time}'`)
            continue
          }
          let targetHour = parseInt(m[1], 10)
          const targetMinute = m[2] ? parseInt(m[2], 10) : 0
          const period = m[3]?.toUpperCase()

          // Convert to 24-hour format
          if (period === 'PM' && targetHour !== 12) targetHour += 12
          if (period === 'AM' && targetHour === 12) targetHour = 0

          // Reliability: Reduced window from 10 to 5 minutes to prevent overlap with 15-min cron
          const currentTotalMinutes = userLocalHour * 60 + userLocalMinute
          const targetTotalMinutes = targetHour * 60 + targetMinute
          const timeDiff = Math.abs(currentTotalMinutes - targetTotalMinutes)
          const shouldSend = timeDiff <= 5 // Send within 5 minutes of target time
          
          // Enhanced time slot logging
          console.log(`[${functionId}] Time slot "${time}" -> ${targetHour}:${targetMinute.toString().padStart(2, '0')} (24h)`)
          console.log(`[${functionId}] User ${user.user_id} target: ${targetHour}:${targetMinute}, current: ${userLocalHour}:${userLocalMinute}, diff: ${timeDiff} minutes, shouldSend: ${shouldSend}`)
          
          if (shouldSend) {
            const timeSlotKey = `${targetHour}:${targetMinute.toString().padStart(2, '0')}`
            const idempotencyKey = generateIdempotencyKey(user.user_id, timeSlotKey, todayLocalDate)
            
            console.log(`[${functionId}] 🎯 SENDING NOTIFICATION for user ${user.user_id} at time slot ${timeSlotKey} (${validTimezone})`)
            console.log(`[${functionId}] Checking idempotency for user ${user.user_id} at time slot ${timeSlotKey}`)
            
            // Reliability: Check idempotency to prevent duplicates
            const alreadySent = await checkIdempotency(supabase, idempotencyKey)
            if (alreadySent) {
              console.log(`[${functionId}] Notification already sent for user ${user.user_id} at ${timeSlotKey} - SKIPPING`)
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
              const { data: roastNotifications } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', user.user_id)
                .eq('status', 'sent')
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .like('metadata->>templateName', 'roast_mode_%')
              
              console.log(`[${functionId}] User ${user.user_id} has ${roastNotifications?.length || 0} roast notifications today`)
              if ((roastNotifications?.length || 0) >= 2) {
                console.log(`[${functionId}] Roast limit exceeded for user ${user.user_id} - SKIPPING`)
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

            console.log(`[${functionId}] User ${user.user_id} context: ${timeOfDay}, logged today: ${hasLoggedToday}, hours since last drink: ${hoursSinceLastDrink}, current consumption: ${currentConsumption}oz`)

            // Generate AI-powered notification with reliability improvements
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
                console.log(`[${functionId}] AI generated notification for user ${user.user_id}: ${title} - ${body}`);
              } else {
                console.error(`[${functionId}] AI notification error for user ${user.user_id}:`, aiError);
                // Reliability: Better fallback messages
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
              console.error(`[${functionId}] Error calling AI notification service for user ${user.user_id}:`, error);
              // Reliability: Fallback to simple message
              title = 'HydrateAI 💧';
              body = 'Time to hydrate!';
            }

            // Send push notification if user has a push token
            if (user.push_token) {
              try {
                console.log(`[${functionId}] 📱 Sending push notification to user ${user.user_id} at ${validTimezone} time ${userLocalHour}:${userLocalMinute}`)
                
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
                  console.error(`[${functionId}] Push notification error for user ${user.user_id}:`, pushError)
                  errors.push({ userId: user.user_id, error: pushError })
                } else {
                  console.log(`[${functionId}] ✅ Push notification sent successfully to user ${user.user_id}`)
                  
                  // Reliability: Save notification with idempotency key
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
                        dateKey: todayLocalDate,
                        idempotencyKey: idempotencyKey, // Reliability: Add idempotency key
                        functionId: functionId, // Reliability: Track which function instance sent it
                        userTimezone: validTimezone,
                        localTime: `${userLocalHour}:${userLocalMinute}`,
                        timeDiff: timeDiff,
                        utcTime: utcTime.toISOString(),
                        userLocalTime: userLocalTime.toLocaleString('en-US', {timeZone: validTimezone})
                      }
                    })

                  notificationsSent.push({
                    userId: user.user_id,
                    title,
                    body,
                    timeSlot: timeSlotKey,
                    userTimezone: validTimezone,
                    localTime: `${userLocalHour}:${userLocalMinute}`,
                    processingTime: Date.now() - userStartTime
                  })
                }
              } catch (error) {
                console.error(`[${functionId}] Error sending push notification to user ${user.user_id}:`, error)
                errors.push({ userId: user.user_id, error: error.message })
              }
            } else {
              console.log(`[${functionId}] No push token found for user ${user.user_id}`)
            }
          } else {
            console.log(`[${functionId}] Not time to send notification for user ${user.user_id} at ${targetHour}:${targetMinute} (current: ${userLocalHour}:${userLocalMinute}, diff: ${timeDiff}min)`)
          }
        }
      } finally {
        // Reliability: Always release the user lock
        await releaseUserLock(supabase, user.user_id)
      }
    }

    const totalProcessingTime = Date.now() - startTime
    console.log(`[${functionId}] Function completed in ${totalProcessingTime}ms. Sent ${notificationsSent.length} notifications, ${errors.length} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        functionId,
        processingTime: totalProcessingTime,
        notificationsSent: notificationsSent.length,
        errors: errors.length,
        details: notificationsSent,
        errorDetails: errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error(`[${functionId}] Error in send-hydration-reminder:`, error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        functionId,
        processingTime: Date.now() - startTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 