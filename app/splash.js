'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useUser, useSuperwallEvents, usePlacement } from 'expo-superwall';
import notificationService from '../lib/notificationService';
import { loadOnboardingData } from '../lib/onboardingStorage';

function SubscriptionStatusBanner() {
  const { subscriptionStatus, user } = useUser();
  if (!subscriptionStatus) return null;
  return (
    <View style={{ padding: 10, backgroundColor: '#e0f7fa' }}>
      <Text>
        {subscriptionStatus.status === 'ACTIVE'
          ? 'You are a premium user! 🎉'
          : 'Upgrade to premium for full access.'}
      </Text>
      <Text>User ID: {user?.appUserId}</Text>
    </View>
  );
}

function SuperwallEventLogger() {
  useSuperwallEvents({
    onSuperwallEvent: (eventInfo) => {
      console.log('Superwall Event:', eventInfo.event, eventInfo.params);
    },
    onSubscriptionStatusChange: (newStatus) => {
      console.log('Subscription Status Changed:', newStatus.status);
    },
    onPaywallPresent: (info) => {
      console.log('Paywall Presented:', info.name);
    },
    onPaywallDismiss: (info, result) => {
      console.log('Paywall Dismissed:', info.name, result);
    },
    onPaywallError: (error) => {
      console.error('Paywall Error:', error);
    },
  });
  return null;
}

export default function SplashScreen({ fontsLoaded, onAppInitialized }) {
  const [loading, setLoading] = useState(true);
  const { subscriptionStatus } = useUser();
  const { registerPlacement, state } = usePlacement({
    onPresent: (info) => {
      console.log('Splash: Paywall presented:', info);
    },
    onDismiss: (info, result) => {
      console.log('Splash: Paywall dismissed:', info, result);
      // Only allow dismissal in review mode or after successful purchase
      const isReviewMode = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_MODE === 'true';
      const isSuccessfulPurchase = result?.outcome === 'purchased';
      
      if (isReviewMode || isSuccessfulPurchase) {
        console.log('Splash: Review mode or successful purchase - allowing app access');
        setLoading(false);
      } else {
        console.log('Splash: Paywall dismissed without purchase - staying on paywall');
        // In production, this shouldn't happen if paywall is non-dismissible
      }
    },
    onError: (error) => {
      console.error('Splash: Paywall error:', error);
      // REVIEW MODE: Allow access even if paywall errors
      const isReviewMode = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_MODE === 'true';
      if (isReviewMode) {
        console.log('Splash: Review mode - paywall error, allowing app access');
        setLoading(false);
      }
    },
    onSkip: (reason) => {
      console.log('Splash: Paywall skipped:', reason);
      // Only allow skip in review mode
      const isReviewMode = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_MODE === 'true';
      if (isReviewMode) {
        console.log('Splash: Review mode - paywall skipped, allowing app access');
        setLoading(false);
      } else {
        console.log('Splash: Paywall skipped in production - this should not happen');
        // In production, this shouldn't happen if paywall is non-dismissible
      }
    },
  });

  // App initialization (paywall only shows after plan creation)
  useEffect(() => {
    if (!fontsLoaded) return;
    if (!subscriptionStatus) return;
    
    // Don't show paywall here - let users complete onboarding and plan creation first
    let didNavigate = false;
    const initializeApp = async () => {
      try {
        console.log('Splash: Starting app initialization...');
        
        // Initialize Supabase auth session
        await supabase.auth.getSession();
        
        // Check onboarding state
        const onboarding = await SecureStore.getItemAsync('onboarding_complete');
        const onboardingData = await loadOnboardingData();
        console.log('Splash: Onboarding complete:', onboarding === 'true');
        console.log('Splash: Onboarding data:', onboardingData);
        
        // Check authentication state
        let { data: { session } } = await supabase.auth.getSession();
        console.log('Splash: Initial session found:', !!session);
        console.log('Splash: Session user:', session?.user?.email);
        console.log('Splash: Session expires:', session?.expires_at);
        
        // If no session, try to restore from stored tokens
        if (!session) {
          const accessToken = await SecureStore.getItemAsync('supabase_session');
          const refreshToken = await SecureStore.getItemAsync('supabase_refresh_token');
          console.log('Splash: Stored tokens found - access:', !!accessToken, 'refresh:', !!refreshToken);
          
          if (accessToken && refreshToken) {
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (data.session && !error) {
                session = data.session;
                console.log('Splash: Session restored from tokens');
                await SecureStore.setItemAsync('supabase_session', data.session.access_token);
                await SecureStore.setItemAsync('supabase_refresh_token', data.session.refresh_token);
              } else {
                console.log('Splash: Failed to restore session, error:', error?.message);
                await SecureStore.deleteItemAsync('supabase_session');
                await SecureStore.deleteItemAsync('supabase_refresh_token');
              }
            } catch (error) {
              console.error('Splash: Error restoring session:', error.message);
              await SecureStore.deleteItemAsync('supabase_session');
              await SecureStore.deleteItemAsync('supabase_refresh_token');
            }
          }
        }
        
        // Wait a bit for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get final session state
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        
        // Check if user has a profile in database
        let userProfile = null;
        let isReviewMode = false;
        if (finalSession?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', finalSession.user.id)
            .single();
          
          if (!error && profile) {
            userProfile = profile;
            isReviewMode = profile.review_mode || false;
            console.log('Splash: User profile found:', profile.name);
            console.log('Splash: Review mode from profile:', isReviewMode);
          } else {
            console.log('Splash: No user profile found, error:', error?.message);
          }
        }
        
        // Navigate based on state
        console.log('Splash: Final decision - onboarding:', onboarding, 'session:', !!finalSession, 'profile:', !!userProfile);
        
        // Development mode or review mode: Skip auth for easier testing
        if (__DEV__ || isReviewMode) {
          console.log('Splash: Development mode or review mode - checking for dev bypass');
          const devBypass = await SecureStore.getItemAsync('dev_auth_bypass');
          if (devBypass === 'true' || isReviewMode) {
            console.log('Splash: Dev bypass or review mode enabled, going to main app');
            router.replace('/tabs/home');
            return;
          }
        }
        
        setTimeout(async () => {
          if (onboarding !== 'true') {
            console.log('Splash: Navigating to welcome screen');
            router.replace('/onboarding/welcome');
          } else if (finalSession && userProfile) {
            console.log('Splash: Navigating to main app');
            
            // Push notifications are already initialized during onboarding
            // No need to re-initialize here
            
            router.replace('/tabs/home');
          } else if (finalSession && !userProfile) {
            console.log('Splash: User logged in but no profile found, going to plan setup');
            router.replace('/plan-setup');
          } else if (onboarding === 'true' && !finalSession) {
            console.log('Splash: Onboarding complete but no session, going to login');
            router.replace('/login');
          } else {
            console.log('Splash: Navigating to welcome screen');
            router.replace('/onboarding/welcome');
          }
        }, 0);
        didNavigate = true;
        
        // Notify parent that app initialization is complete
        if (onAppInitialized) {
          onAppInitialized();
        }
      } catch (error) {
        setTimeout(() => {
          console.error('Splash: Error during initialization:', error);
          router.replace('/onboarding/welcome');
        }, 0);
      } finally {
        setLoading(false);
        // Notify parent that app initialization is complete (even on error)
        if (onAppInitialized) {
          onAppInitialized();
        }
      }
    };
    initializeApp();
    return () => {
      if (!didNavigate) setLoading(false);
    };
  }, [fontsLoaded, subscriptionStatus]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 32, color: 'black' }}>Hydrate AI</Text>
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
      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 32 }}>Hydrate AI</Text>
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