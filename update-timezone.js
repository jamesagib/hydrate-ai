const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateUserTimezone() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('No authenticated user found');
      return;
    }

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Detected timezone:', userTimezone);

    // Update user's profile with correct timezone
    const { data, error } = await supabase
      .from('profiles')
      .update({ timezone: userTimezone })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating timezone:', error);
    } else {
      console.log('Timezone updated successfully to:', userTimezone);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

updateUserTimezone(); 