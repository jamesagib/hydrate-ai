import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { loadOnboardingData, clearOnboardingData } from '../lib/onboardingStorage';

function formatGrokPrompt(onboarding) {
  const prompt = `You are a hydration expert creating a personalized hydration plan for the Water AI app.\n\nInput (JSON):\n{\n  "Age": ${onboarding.age},\n  "Weight": ${onboarding.weight_kg ? Math.round(onboarding.weight_kg * 2.20462) : ''},\n  "Sex": "${onboarding.sex}",\n  "Activity Level": "${onboarding.activity_level}",\n  "Climate": "${onboarding.climate}",\n  "Health Notes": "None",\n  "Preference for reminders": "${onboarding.wants_coaching ? 'Yes' : 'No'}",\n  "Beverage Habits": ""\n}\n\nInstructions:\n- Calculate daily water intake goal based on all inputs.\n- Use reasoning to explain recommendations (e.g., impacts of climate, activity, beverages).\n- Suggest logging times and hydration amounts.\n- Include lifestyle adjustments and pro tips.\n- If reminders preferred, mention app nudges.\n- Use the following output format exactly:\n\nHydrateAI Plan for You 🫗  \n🌊 Daily Goal: {{total_oz}} oz ({{total_liters}} L)  \n_{{reasoning about needs}}_\n\n🕒 Suggested Logging Times:  \n- {{time}} – {{oz}} oz ({{note}})  \n...  \n\n🔥 Adjustments for Lifestyle:  \n_{{text}}_\n\n💡 Pro Tip:  \n_{{text}}_\n\n🔔 Reminders:  \n_{{text}}_\n\n---\n\nCreate the hydration plan now.`;
  return prompt;
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
        const prompt = formatGrokPrompt(onboarding);

        // 4. Call Edge Function to get plan text
        const { data, error } = await supabase.functions.invoke('generate-hydration-plan', {
          body: { onboarding }
        });
        if (error) throw new Error(error.message);
        const planText = data.plan_text;
        console.log('Plan from edge function:', planText);

        // 5. Insert hydration plan
        await supabase.from('hydration_plans').insert([{
          user_id: user.id,
          daily_goal: null, // Optionally parse from planText
          suggested_logging_times: null, // Optionally parse from planText
          lifestyle_adjustments: null, // Optionally parse from planText
          plan_text: planText,
          plan_generated_by: 'ai'
        }]);

        // 6. Upsert profile
        await supabase.from('profiles').upsert([{ user_id: user.id, ...onboarding }]);
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