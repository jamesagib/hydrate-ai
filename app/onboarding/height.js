'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';

export default function OnboardingHeightScreen() {
  const [height, setHeight] = useState('');

  const handleNext = () => {
    if (height.trim() && !isNaN(height) && parseFloat(height) > 0) {
      router.push('/onboarding/weight');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <OnboardingHeader progress={40} />
      
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ 
            fontFamily: 'NunitoSans_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            What's your height?
          </Text>
          
          <Text style={{ 
            fontFamily: 'NunitoSans_400Regular', 
            fontSize: 16, 
            color: '#666',
            marginBottom: 40,
            textAlign: 'center',
            lineHeight: 22
          }}>
            Enter your height in inches (1 foot = 12 inches).
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
              value={height}
              onChangeText={setHeight}
              placeholder="e.g., 70 inches"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleNext}
          disabled={!height.trim() || isNaN(height) || parseFloat(height) <= 0}
          style={{ 
            padding: 16,
            backgroundColor: height.trim() && !isNaN(height) && parseFloat(height) > 0 ? 'black' : '#E5E5E5',
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <Text style={{ 
            color: height.trim() && !isNaN(height) && parseFloat(height) > 0 ? 'white' : '#999', 
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