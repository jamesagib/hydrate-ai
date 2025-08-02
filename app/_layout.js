'use client';

import { SuperwallProvider } from 'expo-superwall';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import SplashScreen from './splash';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import notificationService from '../lib/notificationService';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useUser } from 'expo-superwall';
import { LoadingProvider, GlobalLoadingOverlay } from '../lib/loadingContext';
import superwallDelegate, { setLoadingContext } from '../lib/superwallDelegate';
import SuperwallDeepLinkHandler from './components/SuperwallDeepLinkHandler';
import SuperwallDelegateSetup from './components/SuperwallDelegateSetup';

// Component to handle quick actions inside SuperwallProvider
function QuickActionHandler() {
  // Handle quick action routing with subscription check
  useEffect(() => {
    const handleQuickAction = async (event) => {
      console.log('Quick action received:', event);
      
      // Check if this is the log-water action that requires subscription
      if (event.id === 'log-water') {
        try {
          // Get subscription status dynamically when needed
          const { useUser } = await import('expo-superwall');
          const user = useUser();
          const subscriptionStatus = user?.subscriptionStatus;
          
          // Check if user has active subscription
          const isActive = subscriptionStatus && 
            (subscriptionStatus.status === 'active' || 
             subscriptionStatus.status === 'ACTIVE' ||
             subscriptionStatus === 'active' ||
             subscriptionStatus === 'ACTIVE');
          
          if (isActive) {
            console.log('User has active subscription, allowing access to log water');
            // The router will handle the navigation automatically
          } else {
            console.log('User does not have active subscription, showing alert');
            Alert.alert(
              'Premium Feature',
              'Quick water logging is available for premium users. Upgrade to unlock this feature!',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade', onPress: () => router.push('/tabs/settings') }
              ]
            );
            // Prevent the default navigation
            return false;
          }
        } catch (error) {
          console.error('Error checking subscription status:', error);
          // On error, allow access (fail open)
          return true;
        }
      }
    };

    // Set up a simple listener for quick action events
    const setupListener = () => {
      // For now, we'll rely on the static configuration in app.json
      // and handle subscription checks in the individual screens
      console.log('Quick actions configured via app.json plugin');
      return () => {};
    };

    setupListener();
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const [appInitialized, setAppInitialized] = useState(false);

  // Set up Supabase auth listener for session persistence
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          // Save session tokens to SecureStore for persistence
          await SecureStore.setItemAsync('supabase_session', session.access_token);
          await SecureStore.setItemAsync('supabase_refresh_token', session.refresh_token);
          console.log('Session tokens saved to SecureStore');
        } else if (event === 'SIGNED_OUT') {
          // Clear session tokens
          await SecureStore.deleteItemAsync('supabase_session');
          await SecureStore.deleteItemAsync('supabase_refresh_token');
          console.log('Session tokens cleared from SecureStore');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Set up notification response listener
  useEffect(() => {
    const notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      const { data } = notification.request.content;
      
      console.log('Notification response received:', data);
      
      // Handle the notification response
      if (data && data.userId) {
        notificationService.handleNotificationResponse(response.actionIdentifier, data);
      }
    });

    return () => notificationListener?.remove();
  }, []);





  // Show splash screen until fonts are loaded AND app is initialized
  const showSplash = !fontsLoaded || !appInitialized;

  // Debug: Check if Superwall API key is available
  const superwallApiKey = process.env.EXPO_PUBLIC_SUPERWALL_API_KEY;
  console.log('🔑 Superwall API Key available:', !!superwallApiKey);
  if (!superwallApiKey) {
    console.warn('⚠️ EXPO_PUBLIC_SUPERWALL_API_KEY is not defined!');
  }

  // Debug: Log the API key configuration
  console.log('🔧 SuperwallProvider config:', { 
    ios: superwallApiKey ? `${superwallApiKey.substring(0, 10)}...` : 'undefined' 
  });

  return (
    /// watch out for 'apiKeys' and 'ios' this took 3 HOURS TO DEBUG!!!!!
    <SuperwallProvider apiKeys={{ ios: superwallApiKey }}>
      <LoadingProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <QuickActionHandler />
            <SuperwallDelegateSetup />
            <SuperwallDeepLinkHandler />
            <Slot />
            <GlobalLoadingOverlay />
            {showSplash && (
              <View style={styles.splashOverlay} pointerEvents="box-none">
                <SplashScreen 
                  fontsLoaded={fontsLoaded} 
                  onAppInitialized={() => setAppInitialized(true)}
                />
              </View>
            )}
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </LoadingProvider>
    </SuperwallProvider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
}); 