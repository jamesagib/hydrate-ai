// Script to check all users and their notification preferences
const SUPABASE_URL = 'https://spiuczenpydodsegisvb.supabase.co';
const SUPABASE_ANON_KEY = '';

async function checkUsers() {
  try {
    console.log('👥 Checking all users in database...');
    
    // Query all users
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=user_id,name,wants_coaching,push_token,created_at`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const users = await response.json();
    console.log('Raw response:', users);
    console.log(`Found ${Array.isArray(users) ? users.length : 'unknown'} total users:`);
    
    if (!Array.isArray(users)) {
      console.log('❌ Response is not an array:', typeof users);
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User: ${user.name || 'No name'}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Wants Coaching: ${user.wants_coaching}`);
      console.log(`   Push Token: ${user.push_token ? '✅ Has token' : '❌ No token'}`);
      console.log(`   Created: ${user.created_at}`);
    });
    
    // Summary
    const usersWithTokens = users.filter(u => u.push_token);
    const usersWantingCoaching = users.filter(u => u.wants_coaching);
    
    console.log('\n📊 Summary:');
    console.log(`- Total users: ${users.length}`);
    console.log(`- Users with push tokens: ${usersWithTokens.length}`);
    console.log(`- Users wanting coaching: ${usersWantingCoaching.length}`);
    
    if (users.length === 0) {
      console.log('\n❌ No users found in database!');
    } else if (usersWithTokens.length === 0) {
      console.log('\n❌ No users have push tokens!');
      console.log('This is why notifications aren\'t working.');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

checkUsers(); 