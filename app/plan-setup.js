import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { loadOnboardingData, clearOnboardingData } from '../lib/onboardingStorage';

function parseHydrationPlan(planText) {
  const dailyGoalMatch = planText.match(/🌊 Daily Goal: (.+?)\s+_(.+?)_\s+🕒/s);
  const loggingTimesMatch = planText.match(/🕒 Suggested Logging Times:\s+([\s\S]+?)\s+🔥/);
  const adjustmentsMatch = planText.match(/🔥 Adjustments for Lifestyle:\s+_(.+?)_\s+💡/s);
  const proTipMatch = planText.match(/💡 Pro Tip:\s+_(.+?)_\s+🔔/s);
  const remindersMatch = planText.match(/🔔 Reminders:\s+_(.+?)_\s+---/s) || planText.match(/🔔 Reminders:\s+_(.+?)_$/s);

  // Parse suggested logging times as array of objects
  let suggestedLoggingTimes = [];
  if (loggingTimesMatch) {
    const lines = loggingTimesMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Example: - 7:00 AM – 16 oz (Kickstart your day)
      const match = line.match(/-\s*(.+?)\s*[–-]\s*(\d+) oz(?: \((.+)\))?/);
      if (match) {
        suggestedLoggingTimes.push({
          time: match[1],
          oz: Number(match[2]),
          note: match[3] || null,
        });
      }
    }
  }

  return {
    daily_goal: dailyGoalMatch ? dailyGoalMatch[1].trim() : null,
    reasoning: dailyGoalMatch ? dailyGoalMatch[2].trim() : null,
    suggested_logging_times: suggestedLoggingTimes.length > 0 ? suggestedLoggingTimes : null,
    lifestyle_adjustments: adjustmentsMatch ? adjustmentsMatch[1].trim() : null,
    pro_tip: proTipMatch ? proTipMatch[1].trim() : null,
    reminders: remindersMatch ? remindersMatch[1].trim() : null,
    plan_text: planText,
  };
}

export default function PlanSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setup = async () => {
      try {
        // 1. Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // 2. Load onboarding data
        const onboarding = await loadOnboardingData();
        if (!onboarding) throw new Error('No onboarding data');

        // 3. Format Grok 3 Mini prompt
        // (kept for reference, not used directly)
        // const prompt = formatGrokPrompt(onboarding);

        // 4. Call Edge Function to get plan text
        const { data, error } = await supabase.functions.invoke('generate-hydration-plan', {
          body: { onboarding }
        });
        if (error) throw new Error(error.message);
        const planText = data.plan_text;
        const parsedPlan = parseHydrationPlan(planText);
        console.log('Parsed plan:', parsedPlan);

        // 5. Insert hydration plan
        const { error: insertError, data: insertData } = await supabase.from('hydration_plans').insert([{
          user_id: user.id,
          daily_goal: parsedPlan.daily_goal,
          suggested_logging_times: parsedPlan.suggested_logging_times,
          lifestyle_adjustments: parsedPlan.lifestyle_adjustments,
          pro_tip: parsedPlan.pro_tip,
          reminders: parsedPlan.reminders,
          plan_text: planText,
          plan_generated_by: 'ai'
        }]);
        console.log('Insert result:', insertData, insertError);
        if (insertError) throw new Error(insertError.message);

        // 6. Upsert profile
        console.log('Onboarding data for profile:', onboarding);
        const profileData = {
          user_id: user.id, 
          name: onboarding.name,
          sex: onboarding.sex,
          age: onboarding.age,
          weight_kg: onboarding.weight_kg,
          height_cm: onboarding.height_cm,
          activity_level: onboarding.activity_level,
          climate: onboarding.climate,
          forgets_water: onboarding.forgets_water || false,
          wants_coaching: onboarding.wants_coaching || false
        };
        console.log('Profile data to insert:', profileData);
        
        // Debug: Check if user exists
        const { data: userCheck, error: userCheckError } = await supabase.auth.getUser();
        console.log('User check:', userCheck, userCheckError);
        
        // Debug: Try to insert profile with more detailed error handling
        const { error: profileError, data: profileResult } = await supabase.from('profiles').upsert([profileData]);
        console.log('Profile upsert result:', profileResult, profileError);
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          console.error('Error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          // Don't throw error here, just log it
        } else {
          console.log('Profile created successfully:', profileResult);
        }
        await clearOnboardingData();

        // 7. Navigate to plan result screen
        router.replace('/plan-result');
      } catch (error) {
        Alert.alert('Setup Error', error.message || 'Failed to create your plan.');
        setLoading(false);
      }
    };
    setup();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2EFEB' }}>
      <ActivityIndicator size="large" color="black" />
      <Text style={{ marginTop: 24, fontSize: 18, color: 'black', fontWeight: '600' }}>
        Creating your personalized plan...
      </Text>
    </View>
  );
} 