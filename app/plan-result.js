import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, ActivityIndicator, ScrollView, Alert, TouchableOpacity, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { usePlacement } from 'expo-superwall';

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

export default function PlanResultScreen() {
  const params = useLocalSearchParams();
  const [plan, setPlan] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paywallError, setPaywallError] = useState(null);
  const [paywallMessage, setPaywallMessage] = useState(null);
  const isFromSettings = params.from === 'settings';

  const { registerPlacement, state } = usePlacement({
    onPresent: (info) => {
      console.log('Paywall presented:', info);
      setPaywallMessage('Paywall presented');
      setTimeout(() => setPaywallMessage(null), 2000);
    },
    onDismiss: (info, result) => {
      console.log('Paywall dismissed:', info, result);
      setPaywallMessage('Paywall dismissed');
      setTimeout(() => setPaywallMessage(null), 2000);
      
      // REVIEW MODE: Allow access to full app after paywall is dismissed
      const isReviewMode = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_MODE === 'true';
      if (isReviewMode) {
        console.log('Review mode: Paywall dismissed, navigating to home');
        setTimeout(() => router.replace('/tabs/home'), 1000);
      }
    },
    onError: (error) => {
      console.error('Paywall error:', error);
      setPaywallError(error || 'Could not show paywall.');
      setPaywallMessage('Paywall error');
      setTimeout(() => setPaywallMessage(null), 2000);
      
      // REVIEW MODE: Allow access even if paywall errors
      const isReviewMode = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_MODE === 'true';
      if (isReviewMode) {
        console.log('Review mode: Paywall error, navigating to home');
        setTimeout(() => router.replace('/tabs/home'), 1000);
      }
    },
    onSkip: (reason) => {
      console.log('Paywall skipped:', reason);
      setPaywallMessage('Paywall skipped');
      setTimeout(() => setPaywallMessage(null), 2000);
      
      // REVIEW MODE: Allow access when paywall is skipped
      const isReviewMode = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_MODE === 'true';
      if (isReviewMode) {
        console.log('Review mode: Paywall skipped, navigating to home');
        setTimeout(() => router.replace('/tabs/home'), 1000);
      }
    },
  });

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
          setParsed(null);
        } else {
          setPlan(data.plan_text);
          setParsed(parseHydrationPlan(data.plan_text));
        }
      } catch (error) {
        Alert.alert('Error', error.message || 'Could not load your plan.');
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);



  const showPaywall = () => {
    setPaywallError(null);
    registerPlacement({ placement: 'campaign_trigger' }); // Replace with your actual paywall ID
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="black" />
        <Text style={styles.loadingText}>Loading your plan...</Text>
      </View>
    );
  }

  if (!plan || !parsed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>No hydration plan found.</Text>
      </View>
    );
  }

  // UI for each section
  const SectionCard = ({ title, icon, children }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <View style={{ flex: 1 }}>
        {paywallMessage && (
          <View style={styles.paywallMessageBar}>
            <Text style={styles.paywallMessageText}>{paywallMessage}</Text>
          </View>
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>🎉 Your Personalized Hydration Plan</Text>
          <SectionCard title="Daily Goal" icon="🌊">
            <Text style={styles.goalText}>{parsed.daily_goal}</Text>
            <Text style={styles.reasoningText}>{parsed.reasoning}</Text>
          </SectionCard>
          <SectionCard title="Suggested Logging Times" icon="🕒">
            {parsed.suggested_logging_times && parsed.suggested_logging_times.map((entry, idx) => (
              <View key={idx} style={styles.loggingRow}>
                <Text style={styles.loggingTime}>{entry.time}</Text>
                <Text style={styles.loggingOz}>{entry.oz} oz</Text>
                {entry.note && <Text style={styles.loggingNote}>({entry.note})</Text>}
              </View>
            ))}
          </SectionCard>
          <SectionCard title="Lifestyle Adjustments" icon="🔥">
            <Text style={styles.sectionText}>{parsed.lifestyle_adjustments}</Text>
          </SectionCard>
          <SectionCard title="Pro Tip" icon="💡">
            <Text style={styles.sectionText}>{parsed.pro_tip}</Text>
          </SectionCard>
          <SectionCard title="Reminders" icon="🔔">
            <Text style={styles.sectionText}>{parsed.reminders}</Text>
          </SectionCard>
          {/* Add extra bottom padding so last card isn't hidden */}
          <View style={{ height: 100 }} />
        </ScrollView>
        {/* Sticky bottom bar with background and button */}
        <View style={styles.stickyBarBg} />
        <TouchableOpacity 
          style={styles.stickyButton} 
          onPress={isFromSettings ? () => router.back() : showPaywall}
        >
          <Text style={styles.bottomButtonText}>
            {isFromSettings ? 'Go Back' : "Let's go"}
          </Text>
        </TouchableOpacity>
        {paywallError && <Text style={styles.paywallError}>{paywallError}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFEB',
  },
  loadingText: {
    marginTop: 24,
    fontSize: 18,
    color: 'black',
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: 'black',
    textAlign: 'center',
    fontFamily: 'Nunito_700Bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: '100%',
    maxWidth: 420,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'Nunito_700Bold',
  },
  goalText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    fontFamily: 'Nunito_700Bold',
  },
  reasoningText: {
    fontSize: 16,
    color: '#444',
    fontFamily: 'Nunito_400Regular',
  },
  sectionText: {
    fontSize: 16,
    color: '#444',
    fontFamily: 'Nunito_400Regular',
  },
  loggingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  loggingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginRight: 8,
    fontFamily: 'Nunito_600SemiBold',
  },
  loggingOz: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    fontFamily: 'Nunito_600SemiBold',
  },
  loggingNote: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Nunito_400Regular',
  },
  stickyBarBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: '#F2EFEB',
    zIndex: 10,
  },
  stickyButton: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: -10,
    backgroundColor: 'black',
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 32,
    width: 'auto',
    alignSelf: 'center',
    zIndex: 20,
  },
  bottomButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
  },
  paywallError: {
    color: 'red',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
  },
  paywallMessageBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#222',
    paddingVertical: 10,
    zIndex: 100,
    alignItems: 'center',
  },
  paywallMessageText: {
    color: 'white',
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
}); 