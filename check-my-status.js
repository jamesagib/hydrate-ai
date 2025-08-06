// Simple script to check user status
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://spiuczenpydodsegisvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaXVjemVucHlkb2RzZWdpc3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODk1NjksImV4cCI6MjA2ODk2NTU2OX0.ZBEGYAtf7FzXWfQ4lIAouWQKCWAOGLajRSeSMwq71D8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMyStatus() {
  try {
    console.log('🔍 Checking your status...\n');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user found');
      console.log('Please make sure you\'re logged in to the app');
      return;
    }

    console.log(`👤 User ID: ${user.id}`);

    // Get subscription status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('❌ Error fetching profile:', profileError.message);
      return;
    }

    const subscriptionStatus = profile?.subscription_status || 'trial';
    const isTrial = !subscriptionStatus || 
                   subscriptionStatus === 'trial' || 
                   subscriptionStatus === 'TRIAL' ||
                   subscriptionStatus === 'trialing' || 
                   subscriptionStatus === 'TRIALING';

    console.log(`📊 Subscription Status: ${subscriptionStatus}`);
    console.log(`🎫 Is Trial User: ${isTrial}`);

    // Get today's scan count
    const { data: scanCount, error: scanError } = await supabase
      .rpc('get_daily_scan_count', { user_uuid: user.id });

    if (scanError) {
      console.log('❌ Error fetching scan count:', scanError.message);
      return;
    }

    const currentScans = scanCount || 0;
    const maxScans = isTrial ? 3 : 8;
    const remainingScans = Math.max(0, maxScans - currentScans);

    console.log(`📸 Current Scans Today: ${currentScans}`);
    console.log(`🎯 Max Scans Allowed: ${maxScans}`);
    console.log(`✅ Remaining Scans: ${remainingScans}`);
    console.log(`🚫 Limit Reached: ${currentScans >= maxScans ? 'YES' : 'NO'}`);

    if (currentScans >= maxScans) {
      console.log('\n💡 You\'ve reached your daily limit!');
      if (isTrial) {
        console.log('   Consider upgrading to get 8 scans per day instead of 3.');
      }
    }

    console.log('\n✅ Status check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMyStatus(); 