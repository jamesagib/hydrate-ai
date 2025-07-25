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
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SplashScreen from './splash';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  return (
    /// watch out for 'apiKeys' and 'ios' this took 3 HOURS TO DEBUG!!!!!
    <SuperwallProvider apiKeys={{ ios:  process.env.EXPO_PUBLIC_SUPERWALL_API_KEY }}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Slot />
          {!fontsLoaded && (
            <View style={styles.splashOverlay} pointerEvents="box-none">
              <SplashScreen fontsLoaded={false} />
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