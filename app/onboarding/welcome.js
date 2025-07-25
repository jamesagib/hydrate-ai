import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 100, height: 100, marginBottom: 32 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'black', marginBottom: 16, textAlign: 'center' }}>
          Welcome to Water AI
        </Text>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 32 }}>
          Your personal hydration coach. Get a personalized water plan, smart reminders, and more—no manual logging required.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: 'black', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12 }}
          onPress={() => router.push('/onboarding/name')}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 