// Test script for AI notification generation
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwaXVjemVucHlkb2RzZWdpc3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODk1NjksImV4cCI6MjA2ODk2NTU2OX0.ZBEGYAtf7FzXWfQ4lIAouWQKCWAOGLajRSeSMwq71D8';

async function testAINotification(userData) {
  try {
    console.log('🤖 Testing AI notification generation...');
    console.log('📊 User data:', userData);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-ai-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userData })
    });

    const result = await response.json();
    console.log('AI notification result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ AI notification generated successfully!`);
      console.log(`🎯 Tone: ${result.tone}`);
      console.log(`📱 Title: "${result.title}"`);
      console.log(`💬 Body: "${result.body}"`);
      console.log(`📝 Description: "${result.description}"`);
      console.log(`📋 Context: ${result.context}`);
    } else {
      console.log('❌ AI notification failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing AI notification:', error);
  }
}

// Test different scenarios
async function runTests() {
  console.log('🧪 Testing AI Notification Scenarios\n');
  
  // Scenario 1: User hasn't drunk water all day (should get roasted)
  console.log('🔥 Scenario 1: Dehydrated user (roast mode)');
  await testAINotification({
    dailyGoal: 80,
    currentConsumption: 0,
    streak: 3,
    hoursSinceLastDrink: 12,
    hasLoggedToday: false,
    timeOfDay: 'afternoon',
    suggestedOz: 12,
    timeSlot: '3:00 PM'
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Scenario 2: User is doing well
  console.log('🌟 Scenario 2: Hydrated user (celebratory)');
  await testAINotification({
    dailyGoal: 80,
    currentConsumption: 70,
    streak: 7,
    hoursSinceLastDrink: 1,
    hasLoggedToday: true,
    timeOfDay: 'afternoon',
    suggestedOz: 8,
    timeSlot: '3:00 PM'
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Scenario 3: User needs gentle reminder
  console.log('💧 Scenario 3: Behind schedule (gentle reminder)');
  await testAINotification({
    dailyGoal: 80,
    currentConsumption: 30,
    streak: 2,
    hoursSinceLastDrink: 5,
    hasLoggedToday: true,
    timeOfDay: 'evening',
    suggestedOz: 16,
    timeSlot: '7:00 PM'
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Scenario 4: Morning motivation
  console.log('🌅 Scenario 4: Morning motivation');
  await testAINotification({
    dailyGoal: 80,
    currentConsumption: 0,
    streak: 5,
    hoursSinceLastDrink: 8,
    hasLoggedToday: false,
    timeOfDay: 'morning',
    suggestedOz: 20,
    timeSlot: '7:00 AM'
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testAINotification }; 