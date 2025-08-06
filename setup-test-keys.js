#!/usr/bin/env node

// Helper script to set up API keys for testing
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔑 Setting up API keys for AI notification testing...\n');

console.log('📋 To get your Supabase API keys:');
console.log('1. Go to: https://supabase.com/dashboard/project/spiuczenpydodsegisvb/settings/api');
console.log('2. Copy the "anon public" key (starts with "eyJ...")');
console.log('3. Paste it below\n');

rl.question('Enter your Supabase anon key: ', (anonKey) => {
  if (!anonKey.trim()) {
    console.log('❌ No key provided. Exiting...');
    rl.close();
    return;
  }

  // Update test-ai-notification.js
  const testFile = 'test-ai-notification.js';
  let testContent = fs.readFileSync(testFile, 'utf8');
  testContent = testContent.replace(
    "const SUPABASE_ANON_KEY = ''; // Replace with your actual anon key",
    `const SUPABASE_ANON_KEY = '${anonKey}';`
  );
  fs.writeFileSync(testFile, testContent);

  // Update test-hydration-reminder.js
  const reminderFile = 'test-hydration-reminder.js';
  let reminderContent = fs.readFileSync(reminderFile, 'utf8');
  reminderContent = reminderContent.replace(
    "const SUPABASE_ANON_KEY = ''; // Replace with your actual anon key",
    `const SUPABASE_ANON_KEY = '${anonKey}';`
  );
  fs.writeFileSync(reminderFile, reminderContent);

  console.log('\n✅ API keys updated successfully!');
  console.log('\n🚀 You can now test the AI notifications:');
  console.log('   node test-ai-notification.js');
  console.log('\n📝 Note: You\'ll also need to set up the OpenAI API key in your Supabase dashboard:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/spiuczenpydodsegisvb/settings/api');
  console.log('   2. Add environment variable: OPENAI_API_KEY');
  console.log('   3. Set it to your OpenAI API key');

  rl.close();
}); 