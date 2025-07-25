'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { useUser, useSuperwallEvents } from 'expo-superwall';

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

export default function SplashScreen() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Splash: Starting app initialization...');
        
        // Check onboarding state
        const onboarding = await SecureStore.getItemAsync('onboarding_complete');
        console.log('Splash: Onboarding complete:', onboarding === 'true');
        
        // Check authentication state
        let { data: { session } } = await supabase.auth.getSession();
        console.log('Splash: Initial session found:', !!session);
        
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
        
        // Navigate based on state
        console.log('Splash: Final decision - onboarding:', onboarding, 'session:', !!session);
        
        if (onboarding !== 'true') {
          console.log('Splash: Navigating to onboarding');
          try {
            await router.replace('/onboarding/name');
          } catch (error) {
            console.error('Splash: Error navigating to onboarding:', error);
            await router.replace('/auth');
          }
        } else if (session) {
          console.log('Splash: Navigating to main app');
          try {
            await router.replace('/tabs/home');
          } catch (error) {
            console.error('Splash: Error navigating to main app:', error);
            await router.replace('/auth');
          }
        } else {
          console.log('Splash: Navigating to auth');
          try {
            await router.replace('/auth');
          } catch (error) {
            console.error('Splash: Error navigating to auth:', error);
          }
        }
        
      } catch (error) {
        console.error('Splash: Error during initialization:', error);
        // Fallback to auth screen
        router.replace('/auth');
      } finally {
        setLoading(false);
      }
    };

    if (fontsLoaded) {
      initializeApp();
      
      // Fallback timeout to prevent getting stuck
      const timeout = setTimeout(() => {
        console.log('Splash: Fallback timeout triggered');
        router.replace('/auth');
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2EFEB' }}>
        <SubscriptionStatusBanner />
        <SuperwallEventLogger />
        <Text style={{ fontSize: 18, color: 'black', fontWeight: '600' }}>Loading...</Text>
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