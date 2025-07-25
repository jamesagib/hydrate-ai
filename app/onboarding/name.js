'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

export default function OnboardingNameScreen() {
  const [name, setName] = useState('');

  const handleNext = () => {
    if (name.trim()) {
      router.push('/onboarding/age');
    }
  };

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <OnboardingHeader progress={20} />
      
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ 
            fontFamily: 'Nunito_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            What's your name?
          </Text>
          
          <Text style={{ 
            fontFamily: 'Nunito_400Regular', 
            fontSize: 16, 
            color: '#666',
            marginBottom: 40,
            textAlign: 'center',
            lineHeight: 22
          }}>
            This will be used to calibrate your custom plan.
          </Text>
          
          <View style={{ marginBottom: 40 }}>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: '#E5E5E5', 
                borderRadius: 12, 
                padding: 16, 
                fontSize: 18,
                fontFamily: 'Nunito_400Regular',
                backgroundColor: 'white',
                textAlign: 'center'
              }}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              autoFocus
              autoCapitalize="words"
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleNext}
          disabled={!name.trim()}
          style={{ 
            padding: 16,
            backgroundColor: name.trim() ? 'black' : '#E5E5E5',
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <Text style={{ 
            color: name.trim() ? 'white' : '#999', 
            fontSize: 18,
            fontFamily: 'Nunito_600SemiBold',
            textAlign: 'center'
          }}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 