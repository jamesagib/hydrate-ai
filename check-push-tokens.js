// Script to check push tokens in database
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = ''; // Replace with your actual anon key

async function checkPushTokens() {
  try {
    console.log('🔍 Checking push tokens in database...');
    
    // Query the profiles table to see if users have push tokens
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=user_id,name,push_token,wants_coaching&push_token=not.is.null`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const users = await response.json();
    console.log(`Found ${users.length} users with push tokens:`);
    
    users.forEach(user => {
      console.log(`- User: ${user.name || user.user_id}`);
      console.log(`  Push Token: ${user.push_token ? user.push_token.substring(0, 30) + '...' : 'None'}`);
      console.log(`  Wants Coaching: ${user.wants_coaching}`);
      console.log('');
    });
    
    if (users.length === 0) {
      console.log('❌ No users have push tokens stored!');
      console.log('This means users need to:');
      console.log('1. Complete onboarding');
      console.log('2. Grant notification permissions');
      console.log('3. Have the app save their push token');
    }
    
  } catch (error) {
    console.error('❌ Error checking push tokens:', error);
  }
}

checkPushTokens(); 