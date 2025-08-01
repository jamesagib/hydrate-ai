import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, ActivityIndicator, ScrollView, Alert, TouchableOpacity, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { usePlacement, useUser } from 'expo-superwall';

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
  const [purchaseSuccessful, setPurchaseSuccessful] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const isFromSettings = params.from === 'settings';
  const { subscriptionStatus } = useUser();

  const { registerPlacement, state } = usePlacement({
    onPresent: (info) => {
      console.log('Paywall presented:', info);
      setPaywallMessage('Paywall presented');
      setTimeout(() => setPaywallMessage(null), 2000);
    },
    onDismiss: async (info, result) => {
      console.log('Paywall dismissed:', info, result);
      console.log('Result outcome:', result?.outcome);
      console.log('Result products:', result?.products);
      
      // Simplified purchase detection - check for actual purchase outcomes
      const isSuccessfulPurchase = result?.outcome === 'purchased' || 
                                  result?.outcome === 'restored' ||
                                  (result?.outcome === 'dismissed' && result?.products?.length > 0);
      
      console.log('Is successful purchase:', isSuccessfulPurchase);
      console.log('Result outcome:', result?.outcome);
      console.log('Result products:', result?.products);
      console.log('Full result object:', JSON.stringify(result, null, 2));
      
      if (isSuccessfulPurchase) {
        setPurchaseSuccessful(true);
        setIsProcessingPurchase(true);
        console.log('=== PURCHASE FLOW DEBUG ===');
        console.log('Successful purchase detected - restoring purchases and checking status...');
        console.log('Result object:', JSON.stringify(result, null, 2));
        
        // Immediately navigate to home for successful purchases
        console.log('✅ Purchase successful, navigating to home immediately');
        router.replace('/tabs/home');
        return;
        
        try {
          // Force-refresh the user's subscription state
          console.log('Calling Superwall.restorePurchases()...');
          const restoreResult = await Superwall.restorePurchases();
          console.log('Restore result:', restoreResult);
          console.log('Purchases restored successfully');
          
          // Create recursive function to check subscription status
          const checkSubscriptionStatus = async (attempts = 0) => {
            console.log(`=== STATUS CHECK ATTEMPT ${attempts + 1} ===`);
            
            if (attempts >= 5) {
              // After 5 attempts (10 seconds), subscription still not active
              console.log('Subscription status not updated after 5 attempts - purchase may have failed');
              setIsProcessingPurchase(false);
              setPaywallMessage('Purchase verification failed. Please try again or contact support.');
              setTimeout(() => setPaywallMessage(null), 5000);
              return;
            }
            
            try {
              // Get updated subscription status
              console.log('Calling Superwall.getUser()...');
              const user = await Superwall.getUser();
              console.log('Full user object:', JSON.stringify(user, null, 2));
              console.log('User subscription status:', user?.subscriptionStatus);
              console.log('User subscription status type:', typeof user?.subscriptionStatus);
              
              // Check if the status is active
              console.log('Checking if subscription status is "active"...');
              console.log('Current status:', user?.subscriptionStatus);
              console.log('Status comparison result:', user?.subscriptionStatus === 'active');
              console.log('Full user object:', JSON.stringify(user, null, 2));
              
              if (user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'ACTIVE') {
                console.log('✅ Subscription status is active, navigating to home');
                setIsProcessingPurchase(false);
                router.replace('/tabs/home');
                return;
              } else {
                console.log('❌ Subscription status is NOT active yet');
                console.log('User subscription status type:', typeof user?.subscriptionStatus);
                console.log('User subscription status value:', user?.subscriptionStatus);
              }
              
              // If not active, wait 2 seconds and try again
              console.log('Subscription not active yet, retrying in 2 seconds...');
              setTimeout(() => {
                checkSubscriptionStatus(attempts + 1);
              }, 2000);
              
            } catch (error) {
              console.error('Error checking subscription status:', error);
              // On error, wait and retry
              setTimeout(() => {
                checkSubscriptionStatus(attempts + 1);
              }, 2000);
            }
          };
          
          // Start checking subscription status
          await checkSubscriptionStatus();
          
                 } catch (error) {
           console.error('Error restoring purchases:', error);
           // If restore fails, show error message
           setIsProcessingPurchase(false);
           setPaywallMessage('Error verifying purchase. Please try again or contact support.');
           setTimeout(() => setPaywallMessage(null), 5000);
         }
       }
       
       // Fallback: If paywall was dismissed and user has products, navigate to home
       if (result?.products && result.products.length > 0) {
         console.log('✅ Fallback: Products detected, navigating to home');
         router.replace('/tabs/home');
       }
      },
    onError: (error) => {
      console.error('Paywall error:', error);
      setPaywallError(error || 'Could not show paywall.');
      setPaywallMessage('Paywall error');
      setTimeout(() => setPaywallMessage(null), 2000);
      
      // DEVELOPMENT MODE: Allow access even if paywall errors
      if (__DEV__) {
        console.log('Development mode: Paywall error, navigating to home');
        router.replace('/tabs/home');
      }
    },
    onSkip: (reason) => {
      console.log('Paywall skipped:', reason);
      // Don't show any message or navigate - just log it
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

  // Handle the "Let's go" button press
  const handleLetsGo = () => {
    console.log('=== LETS GO BUTTON PRESSED ===');
    console.log('isFromSettings:', isFromSettings);
    console.log('purchaseSuccessful:', purchaseSuccessful);
    console.log('subscriptionStatus:', subscriptionStatus);
    console.log('subscriptionStatus.status:', subscriptionStatus?.status);
    console.log('subscriptionStatus type:', typeof subscriptionStatus);
    console.log('Full subscriptionStatus object:', JSON.stringify(subscriptionStatus, null, 2));
    
    if (isFromSettings) {
      console.log('From settings, going back');
      router.back();
      return;
    }
    
    // If user just completed a purchase, go to home
    if (purchaseSuccessful) {
      console.log('✅ User just completed purchase, navigating to home');
      router.replace('/tabs/home');
      return;
    }
    
    // Check if user has active subscription (fallback check)
    if (subscriptionStatus?.status === 'active' || subscriptionStatus?.status === 'ACTIVE') {
      console.log('✅ User has active subscription, navigating to home');
      router.replace('/tabs/home');
      return;
    }
    
    // Show paywall for purchase (same behavior in dev and production)
    console.log('Showing paywall for purchase');
    showPaywall();
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
        
        {/* Loading overlay for purchase processing */}
        {isProcessingPurchase && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="black" />
              <Text style={styles.loadingText}>Processing your purchase...</Text>
              <Text style={styles.loadingSubtext}>Please wait while we set up your account</Text>
            </View>
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
                <View style={styles.loggingHeader}>
                  <Text style={styles.loggingTime}>{entry.time}</Text>
                  <Text style={styles.loggingOz}>{entry.oz} oz</Text>
                </View>
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
          onPress={handleLetsGo}
        >
          <Text style={styles.bottomButtonText}>
            {isFromSettings ? 'Go Back' : (purchaseSuccessful ? 'Continue to App' : "Let's go")}
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
    marginBottom: 8,
  },
  loggingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
    flex: 1,
    flexWrap: 'wrap',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(242, 239, 235, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    minWidth: 250,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Nunito_400Regular',
  },
}); 