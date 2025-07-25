// Test script for the generate-hydration-plan edge function
// Run this with: deno run --allow-net test.js

const testData = {
  onboarding: {
    age: 25,
    weight_kg: 70,
    sex: "male",
    activity_level: "moderate",
    climate: "temperate",
    wants_coaching: true
  }
};

async function testEdgeFunction() {
  try {
    const response = await fetch('http://localhost:54321/functions/v1/generate-hydration-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-anon-key-here'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEdgeFunction(); 