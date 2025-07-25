'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, Keyboard } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

export default function OnboardingAgeScreen() {
  const [age, setAge] = useState('');

  const handleNext = () => {
    if (age.trim() && !isNaN(age) && parseInt(age) > 0) {
      router.push('/onboarding/height');
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
      <OnboardingHeader progress={30} />
      
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ 
            fontFamily: 'Nunito_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            How old are you?
          </Text>
          
          <Text style={{ 
            fontFamily: 'Nunito_400Regular', 
            fontSize: 16, 
            color: '#666',
            marginBottom: 40,
            textAlign: 'center',
            lineHeight: 22
          }}>
            This helps us calculate your optimal hydration needs.
          </Text>
          
          <View style={{ marginBottom: 16 }}>
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
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity
              onPress={Keyboard.dismiss}
              style={{
                marginTop: 12,
                alignSelf: 'center',
                paddingVertical: 8,
                paddingHorizontal: 20,
                backgroundColor: '#E5E5E5',
                borderRadius: 8,
              }}
            >
              <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: '#333' }}>Hide Keyboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleNext}
          disabled={!age.trim() || isNaN(age) || parseInt(age) <= 0}
          style={{ 
            padding: 16,
            backgroundColor: age.trim() && !isNaN(age) && parseInt(age) > 0 ? 'black' : '#E5E5E5',
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <Text style={{ 
            color: age.trim() && !isNaN(age) && parseInt(age) > 0 ? 'white' : '#999', 
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