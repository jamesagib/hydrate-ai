'use client';

import { SuperwallProvider } from 'expo-superwall';
import { Slot, useRouter } from 'expo-router';
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
import * as Updates from 'expo-updates';

// Component to handle quick actions inside SuperwallProvider
function QuickActionHandler() {
  const router = useRouter();
  
  // Handle quick action routing with subscription check
  useEffect(() => {
    const handleQuickAction = async (event) => {
      console.log('Quick action received:', event);
      
      // Check if this is the log-water action that requires subscription
      if (event.id === 'log-water') {
        try {
          // Get subscription status from database instead of Superwall hook
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_status')
              .eq('user_id', user.id)
              .single();
            
            const hasActiveSubscription = profile?.subscription_status === 'active';
            
            if (hasActiveSubscription) {
              console.log('User has active subscription, allowing access to log water');
              // Navigate to home screen
              router.push('/tabs/home');
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
            }
          }
        } catch (error) {
          console.error('Error checking subscription status:', error);
          // On error, allow access (fail open)
          router.push('/tabs/home');
        }
      } else {
        // For other actions, just navigate
        if (event.params?.href) {
          router.push(event.params.href);
        }
      }
    };

    // Set up listener for quick action events
    const setupListener = async () => {
      try {
        const QuickActions = await import('expo-quick-actions');
        
        // Check if QuickActions is available
        if (!QuickActions || !QuickActions.default) {
          console.log('⚠️ QuickActions not available, skipping setup');
          return () => {};
        }
        
        // Set up the listener for quick actions
        const subscription = QuickActions.default.addListener(handleQuickAction);
        
        console.log('✅ Quick actions listener set up successfully');
        
        return () => {
          subscription?.remove();
        };
      } catch (error) {
        console.error('❌ Error setting up quick actions listener:', error);
        return () => {};
      }
    };

    setupListener();
  }, [router]);

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

          // Ensure we have push permissions and a stored Expo token for this user
          try {
            const granted = await notificationService.requestPermissions();
            if (granted) {
              await notificationService.savePendingPushToken();
            }
          } catch (e) {
            console.warn('Push token registration after sign-in failed:', e);
          }
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

  // Handle OTA updates
  useEffect(() => {
    async function checkForUpdates() {
      try {
        if (Updates.isEnabled) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('📱 Update available, downloading...');
            await Updates.fetchUpdateAsync();
            console.log('✅ Update downloaded, will apply on next app restart');
            
            // Optionally show a notification to the user
            Alert.alert(
              'Update Available',
              'A new version is ready! The app will restart to apply the update.',
              [
                { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
                { text: 'Later', style: 'cancel' }
              ]
            );
          } else {
            console.log('📱 App is up to date');
          }
        } else {
          console.log('📱 Updates are disabled (development mode)');
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }

    // Check for updates when app starts
    checkForUpdates();
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