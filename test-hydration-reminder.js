// Test script for hydration reminder function
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = ''; // Replace with your actual anon key

async function testHydrationReminder() {
  try {
    console.log('🚰 Testing hydration reminder function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-hydration-reminder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    console.log('Hydration reminder result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Hydration reminder processed successfully!`);
      console.log(`📊 Sent ${result.notificationsSent} notifications`);
      
      if (result.details && result.details.length > 0) {
        console.log('📋 Notification details:');
        result.details.forEach((detail, index) => {
          console.log(`  ${index + 1}. User: ${detail.userId}`);
          console.log(`     Title: ${detail.title}`);
          console.log(`     Body: ${detail.body}`);
        });
      }
    } else {
      console.log('❌ Hydration reminder failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing hydration reminder:', error);
  }
}

testHydrationReminder(); 