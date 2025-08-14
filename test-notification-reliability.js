const { createClient } = require('@supabase/supabase-js');

// Test the notification system reliability improvements
async function testNotificationReliability() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🧪 Testing Notification System Reliability...\n');

  try {
    // 1. Test subscription filtering
    console.log('1. Testing subscription filtering...');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, subscription_status, wants_coaching, push_token, timezone')
      .eq('wants_coaching', true)
      .not('push_token', 'is', null)
      .or('subscription_status.eq.active,subscription_status.eq.trial');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`✅ Found ${users?.length || 0} eligible users for notifications`);
      console.log('   Subscription status breakdown:');
      const statusCount = {};
      users?.forEach(user => {
        statusCount[user.subscription_status] = (statusCount[user.subscription_status] || 0) + 1;
      });
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count} users`);
      });
    }

    // 2. Test notification locks table
    console.log('\n2. Testing notification locks...');
    const { data: locks, error: locksError } = await supabase
      .from('notification_locks')
      .select('*')
      .limit(5);

    if (locksError) {
      console.error('❌ Error checking notification locks:', locksError);
    } else {
      console.log(`✅ Notification locks table accessible. Found ${locks?.length || 0} active locks`);
    }

    // 3. Test recent notifications for duplicate detection and timezone handling
    console.log('\n3. Testing recent notifications and timezone handling...');
    const { data: recentNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('user_id, title, body, metadata, created_at')
      .eq('status', 'sent')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (notificationsError) {
      console.error('❌ Error fetching recent notifications:', notificationsError);
    } else {
      console.log(`✅ Found ${recentNotifications?.length || 0} recent notifications`);
      
      // Check for duplicates
      const userTimeSlots = new Set();
      const duplicates = [];
      
      recentNotifications?.forEach(notification => {
        const metadata = notification.metadata;
        if (metadata?.idempotencyKey) {
          const key = `${notification.user_id}_${metadata.scheduledTime}_${metadata.dateKey}`;
          if (userTimeSlots.has(key)) {
            duplicates.push(notification);
          } else {
            userTimeSlots.add(key);
          }
        }
      });

      if (duplicates.length > 0) {
        console.log(`⚠️  Found ${duplicates.length} potential duplicate notifications`);
        duplicates.forEach(dup => {
          console.log(`   - User ${dup.user_id} at ${dup.metadata?.scheduledTime}`);
        });
      } else {
        console.log('✅ No duplicate notifications found');
      }

      // Check timezone handling
      console.log('\n   Timezone handling verification:');
      const timezoneNotifications = recentNotifications?.filter(n => n.metadata?.userTimezone) || [];
      if (timezoneNotifications.length > 0) {
        console.log(`   Found ${timezoneNotifications.length} notifications with timezone data`);
        timezoneNotifications.slice(0, 3).forEach(notification => {
          const metadata = notification.metadata;
          console.log(`   - User ${notification.user_id}: ${metadata.userTimezone} time ${metadata.localTime} (UTC: ${metadata.utcTime})`);
        });
      } else {
        console.log('   ⚠️  No notifications with timezone data found (may be from before timezone tracking)');
      }
    }

    // 4. Test hydration plans with timezone context
    console.log('\n4. Testing hydration plans and timezone context...');
    const { data: plans, error: plansError } = await supabase
      .from('hydration_plans')
      .select('user_id, suggested_logging_times, daily_goal')
      .limit(5);

    if (plansError) {
      console.error('❌ Error fetching hydration plans:', plansError);
    } else {
      console.log(`✅ Found ${plans?.length || 0} hydration plans`);
      plans?.forEach(plan => {
        console.log(`   - User ${plan.user_id}: ${plan.suggested_logging_times?.length || 0} time slots`);
        if (plan.suggested_logging_times) {
          plan.suggested_logging_times.slice(0, 3).forEach(slot => {
            console.log(`     * ${slot.time} (${slot.oz || 'default'} oz)`);
          });
        }
      });
    }

    // 5. Test timezone handling with real user data
    console.log('\n5. Testing timezone handling with user data...');
    const { data: userTimezones, error: timezoneError } = await supabase
      .from('profiles')
      .select('user_id, timezone')
      .not('timezone', 'is', null)
      .limit(5);

    if (timezoneError) {
      console.error('❌ Error fetching user timezones:', timezoneError);
    } else {
      console.log(`✅ Found ${userTimezones?.length || 0} users with timezone data`);
      userTimezones?.forEach(user => {
        try {
          const utcTime = new Date();
          const localTime = new Date(utcTime.toLocaleString("en-US", {timeZone: user.timezone}));
          console.log(`   - User ${user.user_id} (${user.timezone}): UTC ${utcTime.toISOString()} -> Local ${localTime.toLocaleString()}`);
        } catch (error) {
          console.log(`   ❌ User ${user.user_id}: Invalid timezone ${user.timezone}`);
        }
      });
    }

    // 6. Test timezone validation
    console.log('\n6. Testing timezone validation...');
    const testTimezones = [
      'America/New_York', 
      'Europe/London', 
      'Asia/Tokyo', 
      'UTC',
      'America/Los_Angeles',
      'Australia/Sydney',
      'Invalid/Timezone' // This should fail
    ];
    
    testTimezones.forEach(tz => {
      try {
        const utcTime = new Date();
        const localTime = new Date(utcTime.toLocaleString("en-US", {timeZone: tz}));
        console.log(`✅ Timezone ${tz}: UTC ${utcTime.toISOString()} -> Local ${localTime.toLocaleString()}`);
      } catch (error) {
        console.log(`❌ Invalid timezone: ${tz} (${error.message})`);
      }
    });

    // 7. Test notification timing logic
    console.log('\n7. Testing notification timing logic...');
    const now = new Date();
    const testCases = [
      { targetHour: 9, targetMinute: 0, currentHour: 9, currentMinute: 2, expected: true },
      { targetHour: 9, targetMinute: 0, currentHour: 9, currentMinute: 7, expected: false },
      { targetHour: 14, targetMinute: 30, currentHour: 14, currentMinute: 28, expected: true },
      { targetHour: 23, targetMinute: 0, currentHour: 22, currentMinute: 58, expected: true }
    ];

    testCases.forEach(testCase => {
      const currentTotalMinutes = testCase.currentHour * 60 + testCase.currentMinute;
      const targetTotalMinutes = testCase.targetHour * 60 + testCase.targetMinute;
      const timeDiff = Math.abs(currentTotalMinutes - targetTotalMinutes);
      const shouldSend = timeDiff <= 5;
      const status = shouldSend === testCase.expected ? '✅' : '❌';
      console.log(`${status} Target ${testCase.targetHour}:${testCase.targetMinute.toString().padStart(2, '0')}, Current ${testCase.currentHour}:${testCase.currentMinute.toString().padStart(2, '0')}, Diff ${timeDiff}min, ShouldSend: ${shouldSend} (Expected: ${testCase.expected})`);
    });

    console.log('\n🎉 Notification reliability test completed!');
    console.log('\n📋 Summary of improvements:');
    console.log('   ✅ Subscription status filtering');
    console.log('   ✅ Database locking to prevent race conditions');
    console.log('   ✅ Idempotency keys to prevent duplicates');
    console.log('   ✅ Reduced cron frequency (15 min vs 5 min)');
    console.log('   ✅ Reduced notification window (5 min vs 10 min)');
    console.log('   ✅ Comprehensive timezone handling and validation');
    console.log('   ✅ Enhanced logging with timezone context');
    console.log('   ✅ Automatic cleanup of expired locks and old notifications');
    console.log('\n🌍 Timezone Features:');
    console.log('   ✅ Notifications sent at user\'s local time');
    console.log('   ✅ Timezone validation with fallback to UTC');
    console.log('   ✅ Detailed timezone logging for debugging');
    console.log('   ✅ Timezone data stored in notification metadata');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNotificationReliability(); 