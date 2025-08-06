// Test script to check scan limits and subscription status
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaXVjemVucHlkb2RzZWdpc3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODk1NjksImV4cCI6MjA2ODk2NTU2OX0.ZBEGYAtf7FzXWfQ4lIAouWQKCWAOGLajRSeSMwq71D8';

async function checkScanLimits() {
  try {
    console.log('🔍 Checking scan limits and subscription status...\n');
    
    // First, get the current user
    const { data: { user }, error: userError } = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    }).then(res => res.json());

    if (userError || !user) {
      console.log('❌ No authenticated user found');
      return;
    }

    console.log(`👤 User ID: ${user.id}`);

    // Get user's subscription status
    const { data: profile, error: profileError } = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=subscription_status`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    }).then(res => res.json());

    if (profileError) {
      console.log('❌ Error fetching profile:', profileError);
      return;
    }

    const subscriptionStatus = profile?.[0]?.subscription_status || 'trial';
    const isTrial = !subscriptionStatus || 
                   subscriptionStatus === 'trial' || 
                   subscriptionStatus === 'TRIAL' ||
                   subscriptionStatus === 'trialing' || 
                   subscriptionStatus === 'TRIALING';

    console.log(`📊 Subscription Status: ${subscriptionStatus}`);
    console.log(`🎫 Is Trial User: ${isTrial}`);

    // Get today's scan count using the database function
    const { data: scanCount, error: scanError } = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_daily_scan_count`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_uuid: user.id })
    }).then(res => res.json());

    if (scanError) {
      console.log('❌ Error fetching scan count:', scanError);
      return;
    }

    const currentScans = scanCount || 0;
    const maxScans = isTrial ? 3 : 8;
    const remainingScans = Math.max(0, maxScans - currentScans);

    console.log(`📸 Current Scans Today: ${currentScans}`);
    console.log(`🎯 Max Scans Allowed: ${maxScans}`);
    console.log(`✅ Remaining Scans: ${remainingScans}`);
    console.log(`🚫 Limit Reached: ${currentScans >= maxScans ? 'YES' : 'NO'}`);

    // Also check the daily_scan_counts table directly
    const today = new Date().toISOString().split('T')[0];
    const { data: scanRecords, error: recordsError } = await fetch(`${SUPABASE_URL}/rest/v1/daily_scan_counts?user_id=eq.${user.id}&scan_date=eq.${today}&select=scan_count,created_at,updated_at`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    }).then(res => res.json());

    if (!recordsError && scanRecords?.length > 0) {
      console.log(`\n📋 Database Record Details:`);
      console.log(`   Scan Count: ${scanRecords[0].scan_count}`);
      console.log(`   Created: ${scanRecords[0].created_at}`);
      console.log(`   Updated: ${scanRecords[0].updated_at}`);
    }

    console.log('\n✅ Scan limit check complete!');

  } catch (error) {
    console.error('❌ Error checking scan limits:', error);
  }
}

// Run the check
checkScanLimits(); 