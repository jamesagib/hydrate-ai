'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';

export default function OnboardingMetricsScreen() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const handleNext = () => {
    if (age && weight && height) {
      router.push('/onboarding/activity');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <OnboardingHeader progress={40} />
      
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, justifyContent: 'center', minHeight: 500 }}>
          <Text style={{ 
            fontFamily: 'NunitoSans-Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            Height & weight
          </Text>
          
          <Text style={{ 
            fontFamily: 'NunitoSans', 
            fontSize: 16, 
            color: '#666',
            marginBottom: 40,
            textAlign: 'center',
            lineHeight: 22
          }}>
            This will be used to calibrate your custom plan.
          </Text>
          
          <View style={{ gap: 24 }}>
            <View>
              <Text style={{ 
                fontFamily: 'NunitoSans-SemiBold', 
                fontSize: 18, 
                color: 'black',
                marginBottom: 12
              }}>
                Age
              </Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: '#E5E5E5', 
                  borderRadius: 12, 
                  padding: 16, 
                  fontSize: 18,
                  fontFamily: 'NunitoSans',
                  backgroundColor: 'white',
                  textAlign: 'center'
                }}
                value={age}
                onChangeText={setAge}
                placeholder="Enter your age"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>
            
            <View>
              <Text style={{ 
                fontFamily: 'NunitoSans-SemiBold', 
                fontSize: 18, 
                color: 'black',
                marginBottom: 12
              }}>
                Weight (lbs)
              </Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: '#E5E5E5', 
                  borderRadius: 12, 
                  padding: 16, 
                  fontSize: 18,
                  fontFamily: 'NunitoSans',
                  backgroundColor: 'white',
                  textAlign: 'center'
                }}
                value={weight}
                onChangeText={setWeight}
                placeholder="Enter your weight"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
            
            <View>
              <Text style={{ 
                fontFamily: 'NunitoSans-SemiBold', 
                fontSize: 18, 
                color: 'black',
                marginBottom: 12
              }}>
                Height (inches)
              </Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: '#E5E5E5', 
                  borderRadius: 12, 
                  padding: 16, 
                  fontSize: 18,
                  fontFamily: 'NunitoSans',
                  backgroundColor: 'white',
                  textAlign: 'center'
                }}
                value={height}
                onChangeText={setHeight}
                placeholder="Enter your height"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleNext}
          disabled={!age || !weight || !height}
          style={{ 
            padding: 16,
            backgroundColor: age && weight && height ? 'black' : '#E5E5E5',
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <Text style={{ 
            color: age && weight && height ? 'white' : '#999', 
            fontSize: 18,
            fontFamily: 'NunitoSans-Bold',
            textAlign: 'center'
          }}>
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
} 