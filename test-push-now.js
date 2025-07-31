// Test script to send a push notification immediately
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = ''; // Replace with your actual anon key

async function testPushNow() {
  try {
    console.log('🚀 Testing immediate push notification...');
    
    // Test the push notification function directly
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'ExponentPushToken[test]', // This will fail, but we'll see the error
        title: 'Test Notification 🧪',
        body: 'This is a test notification from the server!',
        data: { 
          test: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    const result = await response.json();
    console.log('Push notification result:', result);
    
    if (result.success) {
      console.log('✅ Push notification sent successfully!');
    } else {
      console.log('❌ Push notification failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing push notification:', error);
  }
}

testPushNow(); 