'use client';

import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function OnboardingLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: '#F2EFEB' }
        }}
      >
        <Stack.Screen 
          name="welcome"
          options={{
            title: 'Welcome'
          }}
        />
        <Stack.Screen 
          name="name"
          options={{
            title: 'Welcome'
          }}
        />
        <Stack.Screen 
          name="age"
          options={{
            title: 'Your Age'
          }}
        />
        <Stack.Screen 
          name="height"
          options={{
            title: 'Height & Weight'
          }}
        />
        <Stack.Screen 
          name="activity"
          options={{
            title: 'Activity Level'
          }}
        />
        <Stack.Screen 
          name="preferences"
          options={{
            title: 'Preferences'
          }}
        />
      </Stack>
    </View>
  );
}
