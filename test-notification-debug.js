// Debug script to check notification system
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaXVjemVucHlkb2RzZWdpc3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODk1NjksImV4cCI6MjA2ODk2NTU2OX0.ZBEGYAtf7FzXWfQ4lIAouWQKCWAOGLajRSeSMwq71D8';

async function debugNotifications() {
  try {
    console.log('🔍 Debugging notification system...');
    
    // Test 1: Check if send-hydration-reminder function works
    console.log('\n1️⃣ Testing send-hydration-reminder function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-hydration-reminder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    console.log('Result:', result);
    
    // Test 2: Check if send-push-notification function works directly
    console.log('\n2️⃣ Testing send-push-notification function directly...');
    const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'ExponentPushToken[test]', // Test token
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { test: true }
      })
    });

    const pushResult = await pushResponse.json();
    console.log('Push result:', pushResult);
    
    // Test 3: Check users with push tokens
    console.log('\n3️⃣ Checking users with push tokens...');
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=user_id,push_token,wants_coaching&push_token=not.is.null`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const users = await usersResponse.json();
    console.log(`Found ${users.length} users with push tokens:`);
    users.forEach(user => {
      console.log(`- User: ${user.user_id}`);
      console.log(`  Push Token: ${user.push_token ? user.push_token.substring(0, 30) + '...' : 'None'}`);
      console.log(`  Wants Coaching: ${user.wants_coaching}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugNotifications(); 