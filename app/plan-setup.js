import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { loadOnboardingData, clearOnboardingData } from '../lib/onboardingStorage';
import notificationService from '../lib/notificationService';

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
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    'Verifying account',
    'Loading your details',
    'Generating your hydration plan',
    'Extracting plan insights',
    'Saving your plan',
    'Finalizing profile and notifications'
  ];

  useEffect(() => {
    const setup = async () => {
      try {
        // 1. Get user
        setCurrentStep(0);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // 2. Check if user already has a profile (existing account)
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error('Error checking profile:', profileCheckError);
        }

        // If user has a profile, they're an existing user - send to home
        if (existingProfile) {
          console.log('Existing user found, navigating to home');
          router.replace('/tabs/home');
          return;
        }

        // 3. Load onboarding data for new users
        setCurrentStep(1);
        const onboarding = await loadOnboardingData();
        console.log('🔍 DEBUG: Loaded onboarding data:', onboarding);
        
        if (!onboarding) {
          // No onboarding data and no profile = new user who needs to complete onboarding
          Alert.alert(
            'Welcome!',
            'Please complete the onboarding process to create your account.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/onboarding/welcome')
              }
            ]
          );
          return;
        }

        // Check if user is missing required onboarding data (excluding name since we get it from auth)
        console.log('🔍 DEBUG: Checking onboarding data fields:');
        console.log('  - age:', onboarding.age);
        console.log('  - height_cm:', onboarding.height_cm);
        console.log('  - weight_kg:', onboarding.weight_kg);
        console.log('  - activity_level:', onboarding.activity_level);
        console.log('  - climate:', onboarding.climate);
        
        if (!onboarding.height_cm || !onboarding.activity_level || !onboarding.climate) {
          console.log('❌ User missing onboarding data, redirecting to appropriate step');
          
          if (!onboarding.height_cm) {
            console.log('❌ Missing height_cm, redirecting to height screen');
            router.replace('/onboarding/height');
            return;
          } else if (!onboarding.activity_level) {
            console.log('❌ Missing activity_level, redirecting to activity screen');
            router.replace('/onboarding/activity');
            return;
          } else if (!onboarding.climate) {
            console.log('❌ Missing climate, redirecting to preferences screen');
            router.replace('/onboarding/preferences');
            return;
          }
        }

        // 4. Call Edge Function to get plan text
        setCurrentStep(2);
        const { data, error } = await supabase.functions.invoke('generate-hydration-plan', {
          body: { onboarding }
        });
        if (error) throw new Error(error.message);
        const planText = data.plan_text;

        // 4b. Parse plan
        setCurrentStep(3);
        const parsedPlan = parseHydrationPlan(planText);
        console.log('Parsed plan:', parsedPlan);

        // 5. Insert hydration plan
        setCurrentStep(4);
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

        // 6. Upsert profile + notifications
        setCurrentStep(5);
        console.log('Onboarding data for profile:', onboarding);
        
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('User timezone detected:', userTimezone);
        
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
          wants_coaching: Boolean(onboarding.wants_coaching),
          timezone: userTimezone
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

        // 7. Save pending push token if user wants coaching
        if (onboarding.wants_coaching) {
          console.log('User wants coaching, saving pending push token...');
          await notificationService.savePendingPushToken();
        }

        // 8. Navigate to plan result screen
        router.replace('/plan-result');
      } catch (error) {
        console.error('Setup error:', error);
        Alert.alert('Setup Error', error.message || 'Failed to create your plan.');
        setLoading(false);
      }
    };
    setup();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2EFEB', paddingHorizontal: 24 }}>
      <ActivityIndicator size="large" color="black" />
      <Text style={{ marginTop: 16, fontSize: 18, color: 'black', fontWeight: '700' }}>
        Setting up your personalized plan
      </Text>
      <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
        {steps.map((label, idx) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 16 }}>
              {idx < currentStep ? '✅' : idx === currentStep ? '⏳' : '•'}
            </Text>
            <Text style={{ marginLeft: 8, fontSize: 16, color: idx <= currentStep ? 'black' : '#999', fontWeight: idx === currentStep ? '600' : '400' }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
} 