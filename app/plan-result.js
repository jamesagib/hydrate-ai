import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSuperwall } from 'expo-superwall';

export default function PlanResultScreen() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const { presentPaywall } = useSuperwall();

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');
        const { data, error } = await supabase
          .from('hydration_plans')
          .select('plan_text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data || !data.plan_text) {
          setPlan(null);
        } else {
          setPlan(data.plan_text);
        }
      } catch (error) {
        Alert.alert('Error', error.message || 'Could not load your plan.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  const showPaywall = async () => {
    try {
      await presentPaywall('your_paywall_id'); // Replace with your actual paywall ID
    } catch (error) {
      Alert.alert('Error', 'Could not show paywall. Please try again.');
    }
  };

  const getVisiblePlan = (fullPlan) => {
    // Show everything up to the first emoji section (🕒, 🔥, 💡, 🔔)
    const sections = fullPlan.split(/(🕒|🔥|💡|🔔)/);
    return sections[0] + (sections[1] || '');
  };

  const getBlurredPlan = (fullPlan) => {
    const sections = fullPlan.split(/(🕒|🔥|💡|🔔)/);
    return sections.slice(1).join('');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2EFEB' }}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{ marginTop: 24, fontSize: 18, color: 'black', fontWeight: '600' }}>
          Loading your plan...
        </Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2EFEB' }}>
        <Text style={{ fontSize: 18, color: 'black', fontWeight: '600' }}>
          No hydration plan found.
        </Text>
      </View>
    );
  }

  // Log the full hydration plan for debugging
  console.log('Full Hydration Plan:', plan);

  const visiblePlan = getVisiblePlan(plan);
  const blurredPlan = getBlurredPlan(plan);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F2EFEB' }} contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: 'black' }}>
        Your Personalized Hydration Plan
      </Text>
      {/* Visible part of the plan */}
      <Text style={{ fontSize: 16, color: '#222', lineHeight: 24, fontFamily: 'Menlo', marginBottom: 16 }}>
        {visiblePlan}
      </Text>
      {/* Blurred part with overlay */}
      {blurredPlan && (
        <View style={{ position: 'relative', marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 16, 
            color: '#222', 
            lineHeight: 24, 
            fontFamily: 'Menlo',
            opacity: 0.3,
            filter: 'blur(4px)'
          }}>
            {blurredPlan}
          </Text>
          {/* Overlay */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(242, 239, 235, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 8
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: 'black', 
              textAlign: 'center',
              marginBottom: 16
            }}>
              Unlock the full plan by signing up for premium
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: 'black',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8
              }}
              onPress={showPaywall}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                Unlock Full Plan
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
} 