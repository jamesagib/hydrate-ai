'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OnboardingHeader from '../components/OnboardingHeader';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { saveOnboardingData, loadOnboardingData } from '../../lib/onboardingStorage';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', title: '0-2', description: 'Workouts now and then', icon: 'fitness-outline' },
  { id: 'light', title: '3-5', description: 'A few workouts per week', icon: 'fitness' },
  { id: 'moderate', title: '6+', description: 'Dedicated athlete', icon: 'trophy-outline' },
];

export default function OnboardingActivityScreen() {
  const [selectedActivity, setSelectedActivity] = useState(null);

  const handleNext = async () => {
    const prev = await loadOnboardingData() || {};
    await saveOnboardingData({ ...prev, activity_level: selectedActivity });
    router.push('/onboarding/preferences');
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
      <OnboardingHeader progress={75} />
      
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, justifyContent: 'center', minHeight: 500 }}>
          <Text style={{ 
            fontFamily: 'Nunito_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            How many workouts do you do per week?
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
          
          <View style={{ gap: 16 }}>
            {ACTIVITY_LEVELS.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                onPress={() => setSelectedActivity(activity.id)}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  backgroundColor: selectedActivity === activity.id ? 'black' : 'white',
                  borderWidth: 1,
                  borderColor: selectedActivity === activity.id ? 'black' : '#E5E5E5',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 20,
                  backgroundColor: selectedActivity === activity.id ? 'white' : '#F5F5F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16
                }}>
                  <Ionicons 
                    name={activity.icon} 
                    size={20} 
                    color={selectedActivity === activity.id ? 'black' : '#666'} 
                  />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontFamily: 'Nunito_600SemiBold',
                    color: selectedActivity === activity.id ? 'white' : 'black',
                    marginBottom: 4
                  }}>
                    {activity.title}
                  </Text>
                  <Text style={{ 
                    fontSize: 16,
                    fontFamily: 'Nunito_400Regular',
                    color: selectedActivity === activity.id ? 'white' : '#666'
                  }}>
                    {activity.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleNext}
          disabled={!selectedActivity}
          style={{ 
            padding: 16,
            backgroundColor: selectedActivity ? 'black' : '#E5E5E5',
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <Text style={{ 
            color: selectedActivity ? 'white' : '#999', 
            fontSize: 18,
            fontFamily: 'Nunito_600SemiBold',
            textAlign: 'center'
          }}>
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
} 