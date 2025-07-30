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
import { View, StyleSheet } from 'react-native';
import SplashScreen from './splash';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import notificationService from '../lib/notificationService';

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

    return () => Notifications.removeNotificationSubscription(notificationListener);
  }, []);

  // Show splash screen until fonts are loaded AND app is initialized
  const showSplash = !fontsLoaded || !appInitialized;

  return (
    /// watch out for 'apiKeys' and 'ios' this took 3 HOURS TO DEBUG!!!!!
    <SuperwallProvider apiKeys={{ ios:  process.env.EXPO_PUBLIC_SUPERWALL_API_KEY }}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Slot />
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