import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <View style={{ flex: 1, paddingTop: 40, paddingHorizontal: 24, justifyContent: 'space-between' }}>
        {/* Top area: GIF takes the majority of space */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Image
            source={require('../../assets/welcomedemo.gif')}
            style={{
              width: SCREEN_WIDTH * 0.94,
              height: Math.min(SCREEN_WIDTH * 1.2, SCREEN_HEIGHT * 0.55),
              borderRadius: 12,
            }}
            resizeMode="cover"
          />
        </View>

        {/* Bottom area: Title, subtitle, buttons pinned to bottom */}
        <View style={{ alignItems: 'center', paddingBottom: 24 }}>
          <Text style={{
            fontSize: 32,
            fontFamily: 'Nunito_700Bold',
            color: 'black',
            marginBottom: 12,
            textAlign: 'center',
            lineHeight: 40,
            width: SCREEN_WIDTH * 0.9,
            letterSpacing: -0.3,
          }}>
            Welcome to Water AI
          </Text>
          <Text style={{
            fontSize: 18,
            fontFamily: 'Nunito_400Regular',
            color: '#666',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 26,
            width: SCREEN_WIDTH * 0.9,
          }}>
            Your personal hydration coach. Get a personalized water plan, scan your drinks and more.
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: 'black',
              paddingVertical: 20,
              paddingHorizontal: 20,
              borderRadius: 12,
              marginBottom: 12,
              width: SCREEN_WIDTH * 0.9,
              alignItems: 'center',
            }}
            onPress={() => router.push('/onboarding/age')}
          >
            <Text style={{ color: 'white', fontFamily: 'Nunito_600SemiBold', fontSize: 18 }}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 12,
              paddingHorizontal: 8,
              alignItems: 'center',
            }}
            onPress={() => router.push('/login')}
          >
            <Text style={{ color: '#666', fontFamily: 'Nunito_600SemiBold', fontSize: 16, textDecorationLine: 'underline' }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 