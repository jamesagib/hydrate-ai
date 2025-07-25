'use client';

import { SuperwallProvider } from 'expo-superwall';
import { Slot, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import React from 'react';
import SplashScreen from './splash';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const pathname = usePathname();

  if (!fontsLoaded) return null;

  return (
    <SuperwallProvider apiKey={process.env.EXPO_PUBLIC_SUPERWALL_API_KEY}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {pathname === '/' ? <SplashScreen /> : <Slot />}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </SuperwallProvider>
  );
} 