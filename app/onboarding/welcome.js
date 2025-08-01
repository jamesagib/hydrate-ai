import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 32,
        paddingHorizontal: 24
      }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 100, height: 100, marginBottom: 32 }}
          resizeMode="contain"
        />
        <Text style={{ 
          fontSize: 32, 
          fontFamily: 'Nunito_700Bold', 
          color: 'black', 
          marginBottom: 16, 
          textAlign: 'center',
          lineHeight: 40,
          paddingHorizontal: 10
        }}>
          Welcome to Water AI
        </Text>
        <Text style={{ 
          fontSize: 18, 
          fontFamily: 'Nunito_400Regular', 
          color: '#666', 
          textAlign: 'center', 
          marginBottom: 32,
          lineHeight: 26,
          paddingHorizontal: 20
        }}>
          Your personal hydration coach. Get a personalized water plan, smart reminders, and more.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: 'black', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12, marginBottom: 16 }}
          onPress={() => router.push('/onboarding/name')}
        >
          <Text style={{ color: 'white', fontFamily: 'Nunito_600SemiBold', fontSize: 18 }}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{ 
            backgroundColor: 'transparent', 
            paddingVertical: 16, 
            paddingHorizontal: 40, 
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'black'
          }}
          onPress={() => router.push('/login')}
        >
          <Text style={{ color: 'black', fontFamily: 'Nunito_600SemiBold', fontSize: 18 }}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 