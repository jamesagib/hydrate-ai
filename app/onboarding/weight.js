'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';

export default function OnboardingWeightScreen() {
  const [weight, setWeight] = useState('');

  const handleNext = () => {
    if (weight.trim() && !isNaN(weight) && parseFloat(weight) > 0) {
      router.push('/onboarding/activity');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <OnboardingHeader progress={50} />
      
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ 
            fontFamily: 'NunitoSans_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            What's your weight?
          </Text>
          
          <Text style={{ 
            fontFamily: 'NunitoSans_400Regular', 
            fontSize: 16, 
            color: '#666',
            marginBottom: 40,
            textAlign: 'center',
            lineHeight: 22
          }}>
            Enter your weight in pounds (lbs).
          </Text>
          
          <View style={{ marginBottom: 40 }}>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: '#E5E5E5', 
                borderRadius: 12, 
                padding: 16, 
                fontSize: 18,
                fontFamily: 'NunitoSans_400Regular',
                backgroundColor: 'white',
                textAlign: 'center'
              }}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g., 150"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleNext}
          disabled={!weight.trim() || isNaN(weight) || parseFloat(weight) <= 0}
          style={{ 
            padding: 16,
            backgroundColor: weight.trim() && !isNaN(weight) && parseFloat(weight) > 0 ? 'black' : '#E5E5E5',
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <Text style={{ 
            color: weight.trim() && !isNaN(weight) && parseFloat(weight) > 0 ? 'white' : '#999', 
            fontSize: 18,
            fontFamily: 'NunitoSans_600SemiBold',
            textAlign: 'center'
          }}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 