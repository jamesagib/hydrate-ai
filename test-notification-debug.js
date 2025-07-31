// Debug script to check notification system
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // Replace with your actual anon key

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
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugNotifications(); 