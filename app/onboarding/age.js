'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { loadOnboardingData, saveOnboardingData } from '../../lib/onboardingStorage';
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
  const [sex, setSex] = useState('');
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  if (!fontsLoaded) return null;

  const handleNext = async () => {
    const prev = await loadOnboardingData() || {};
    await saveOnboardingData({ ...prev, age, sex });
    router.push('/onboarding/height');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <OnboardingHeader progress={25} />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 28, color: 'black', marginBottom: 8 }}>
          Age
        </Text>
        <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: 16, color: '#666', marginBottom: 32 }}>
          This will be used to calibrate your custom plan.
        </Text>
        <TextInput
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            fontSize: 18,
            fontFamily: 'Nunito_400Regular',
            marginBottom: 32,
            borderWidth: 1,
            borderColor: '#E5E5E5',
          }}
          placeholder="Enter your age"
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
          maxLength={3}
        />
        <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 18, color: 'black', marginBottom: 16 }}>
          Sex
        </Text>
        <View style={{ flexDirection: 'row', marginBottom: 40 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: sex === 'male' ? 'black' : 'white',
              borderRadius: 12,
              padding: 16,
              marginRight: 8,
              borderWidth: 1,
              borderColor: sex === 'male' ? 'black' : '#E5E5E5',
              alignItems: 'center',
            }}
            onPress={() => setSex('male')}
          >
            <Text style={{
              color: sex === 'male' ? 'white' : 'black',
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 18,
            }}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: sex === 'female' ? 'black' : 'white',
              borderRadius: 12,
              padding: 16,
              marginLeft: 8,
              borderWidth: 1,
              borderColor: sex === 'female' ? 'black' : '#E5E5E5',
              alignItems: 'center',
            }}
            onPress={() => setSex('female')}
          >
            <Text style={{
              color: sex === 'female' ? 'white' : 'black',
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 18,
            }}>Female</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!age || !sex}
          style={{
            backgroundColor: age && sex ? 'black' : '#E5E5E5',
            borderRadius: 20,
            paddingVertical: 18,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{
            color: age && sex ? 'white' : '#999',
            fontFamily: 'Nunito_700Bold',
            fontSize: 18,
          }}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 