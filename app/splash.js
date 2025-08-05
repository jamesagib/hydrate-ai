'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useUser } from 'expo-superwall';
import notificationService from '../lib/notificationService';
import { loadOnboardingData } from '../lib/onboardingStorage';

export default function SplashScreen({ fontsLoaded, onAppInitialized }) {
  const [loading, setLoading] = useState(true);
  
  // Add error handling for Superwall hook
  let subscriptionStatus = null;
  try {
    const { subscriptionStatus: status } = useUser();
    subscriptionStatus = status;
  } catch (error) {
    console.error('Error getting Superwall subscription status:', error);
    // Continue with null subscription status
  }

  useEffect(() => {
    if (!fontsLoaded) return;
    
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Initialize Supabase auth session
        await supabase.auth.getSession();
        
        // Check onboarding state with error handling
        let onboarding = null;
        let onboardingData = null;
        
        try {
          onboarding = await SecureStore.getItemAsync('onboarding_complete');
          onboardingData = await loadOnboardingData();
        } catch (error) {
          console.error('Error loading onboarding data:', error);
          // Continue with null values
        }
        
        // If onboarding_complete flag exists but no actual onboarding data, 
        // this might be a corrupted state from an update - reset it
        if (onboarding === 'true' && !onboardingData) {
          console.log('Detected corrupted onboarding state, resetting...');
          try {
            await SecureStore.deleteItemAsync('onboarding_complete');
          } catch (error) {
            console.error('Error resetting onboarding state:', error);
          }
        }
        
        // Check authentication state and restore session if needed
        let { data: { session } } = await supabase.auth.getSession();
        
        // If no session, try to restore from stored tokens
        if (!session) {
          const accessToken = await SecureStore.getItemAsync('supabase_session');
          const refreshToken = await SecureStore.getItemAsync('supabase_refresh_token');
          
          if (accessToken && refreshToken) {
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (data.session && !error) {
                session = data.session;
                // Update stored tokens
                await SecureStore.setItemAsync('supabase_session', data.session.access_token);
                await SecureStore.setItemAsync('supabase_refresh_token', data.session.refresh_token);
              } else {
                // Clear invalid tokens
                await SecureStore.deleteItemAsync('supabase_session');
                await SecureStore.deleteItemAsync('supabase_refresh_token');
              }
            } catch (error) {
              // Clear invalid tokens
              await SecureStore.deleteItemAsync('supabase_session');
              await SecureStore.deleteItemAsync('supabase_refresh_token');
            }
          }
        }
        
        // Check if user has a profile in database
        let userProfile = null;
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          userProfile = profile;
        }
        
        // NEW FAST LOGIC FLOW
        if (!session?.user) {
          // NO ACCOUNT - Check onboarding state
          // Re-check onboarding state after potential reset
          const finalOnboardingState = await SecureStore.getItemAsync('onboarding_complete');
          
          if (!finalOnboardingState || finalOnboardingState !== 'true') {
            // No onboarding data or incomplete - go to welcome
            router.replace('/onboarding/welcome');
          } else {
            // Onboarding complete but no account - go to create account
            router.replace('/auth');
          }
        } else {
          // HAS ACCOUNT - Check subscription with error handling
          let hasActiveSubscription = false;
          let hasDatabaseSubscription = false;
          
          try {
            hasActiveSubscription = subscriptionStatus?.status === 'active' || 
                                  subscriptionStatus?.status === 'ACTIVE' ||
                                  subscriptionStatus?.status === 'trialing' || 
                                  subscriptionStatus?.status === 'TRIALING' ||
                                  subscriptionStatus?.status === 'trial' || 
                                  subscriptionStatus?.status === 'TRIAL';
          } catch (error) {
            console.error('Error checking Superwall subscription status:', error);
          }
          
          try {
            // Also check database subscription status as fallback (for TestFlight sandbox issues)
            hasDatabaseSubscription = userProfile?.subscription_status === 'active' || 
                                    userProfile?.subscription_status === 'ACTIVE' ||
                                    userProfile?.subscription_status === 'trialing' || 
                                    userProfile?.subscription_status === 'TRIALING' ||
                                    userProfile?.subscription_status === 'trial' || 
                                    userProfile?.subscription_status === 'TRIAL';
          } catch (error) {
            console.error('Error checking database subscription status:', error);
          }
          
          // If subscription status is not available yet (fresh install), 
          // go to home screen and let Superwall sync in background
          if (!subscriptionStatus?.status && !hasDatabaseSubscription) {
            router.replace('/tabs/home');
          } else if (hasActiveSubscription || hasDatabaseSubscription) {
            // PAID - go to home (either Superwall or database shows active)
            router.replace('/tabs/home');
          } else {
            // NO SUBSCRIPTION - go to paywall
            router.replace('/plan-result?showPaywall=true');
          }
        }
        
      } catch (error) {
        // On error, go to welcome screen
        router.replace('/onboarding/welcome');
      } finally {
        setLoading(false);
        if (onAppInitialized) {
          onAppInitialized();
        }
      }
    };

    // Start immediately when fonts are loaded
    initializeApp();
    
  }, [fontsLoaded, subscriptionStatus]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 30, color: 'black' }}>Water AI</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 30 }}>Water AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFEB',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
}); 