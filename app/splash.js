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
  const { subscriptionStatus } = useUser();

  useEffect(() => {
    if (!fontsLoaded) return;
    
    const initializeApp = async () => {
      try {
        // Initialize Supabase auth session
        await supabase.auth.getSession();
        
        // Check onboarding state
        const onboarding = await SecureStore.getItemAsync('onboarding_complete');
        const onboardingData = await loadOnboardingData();
        
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
          if (onboarding !== 'true') {
            // No onboarding data or incomplete - go to welcome
            router.replace('/onboarding/welcome');
          } else {
            // Onboarding complete but no account - go to create account
            router.replace('/auth');
          }
        } else {
          // HAS ACCOUNT - Check subscription
          const hasActiveSubscription = subscriptionStatus?.status === 'active' || 
                                      subscriptionStatus?.status === 'ACTIVE' ||
                                      subscriptionStatus?.status === 'trialing' || 
                                      subscriptionStatus?.status === 'TRIALING' ||
                                      subscriptionStatus?.status === 'trial' || 
                                      subscriptionStatus?.status === 'TRIAL';
          
          // If subscription status is not available yet (fresh install), 
          // go to home screen and let Superwall sync in background
          if (!subscriptionStatus?.status) {
            router.replace('/tabs/home');
          } else if (hasActiveSubscription) {
            // PAID - go to home
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