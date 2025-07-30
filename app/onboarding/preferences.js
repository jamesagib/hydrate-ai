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
import * as SecureStore from 'expo-secure-store';
import { saveOnboardingData, loadOnboardingData, clearOnboardingData } from '../../lib/onboardingStorage';
import notificationService from '../../lib/notificationService';

const CLIMATE_OPTIONS = [
  { id: 'cold', title: 'Cold', icon: 'snow-outline' },
  { id: 'temperate', title: 'Temperate', icon: 'partly-sunny-outline' },
  { id: 'hot', title: 'Hot', icon: 'sunny-outline' },
];

const REMINDER_OPTIONS = [
  { id: 'yes', title: 'Yes, remind me', description: 'Get daily hydration coaching', icon: 'notifications' },
  { id: 'no', title: 'No, thanks', description: "I'll track on my own", icon: 'notifications-off' },
];

export default function OnboardingPreferencesScreen() {
  const [climate, setClimate] = useState(null);
  const [wantsReminders, setWantsReminders] = useState(null);

  const handleFinish = async () => {
    if (climate && wantsReminders !== null) {
      const prev = await loadOnboardingData() || {};
      await saveOnboardingData({ ...prev, climate, forgets_water: null, wants_coaching: wantsReminders });
      await SecureStore.setItemAsync('onboarding_complete', 'true');
      
      // Request notification permissions if user wants reminders
      if (wantsReminders) {
        console.log('User wants reminders, requesting notification permissions...');
        const permissionsGranted = await notificationService.requestPermissions();
        console.log('Notification permissions granted:', permissionsGranted);
      }
      
      router.replace('/auth');
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
      <OnboardingHeader progress={80} />
      
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, justifyContent: 'center', minHeight: 500 }}>
          <Text style={{ 
            fontFamily: 'Nunito_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            Almost Done!
          </Text>
          
          <Text style={{ 
            fontFamily: 'Nunito_400Regular', 
            fontSize: 16, 
            color: '#666',
            marginBottom: 40,
            textAlign: 'center',
            lineHeight: 22
          }}>
            Just a few more details to personalize your experience
          </Text>
          
          <View style={{ gap: 30 }}>
            <View>
              <Text style={{ 
                fontFamily: 'Nunito_600SemiBold', 
                fontSize: 18, 
                color: 'black',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                Your typical climate
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {CLIMATE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setClimate(option.id)}
                    style={{
                      flex: 1,
                      padding: 16,
                      borderRadius: 12,
                      backgroundColor: climate === option.id ? 'black' : 'white',
                      borderWidth: 1,
                      borderColor: climate === option.id ? 'black' : '#E5E5E5',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons 
                      name={option.icon} 
                      size={24} 
                      color={climate === option.id ? 'white' : '#666'} 
                      style={{ marginBottom: 8 }}
                    />
                    <Text style={{ 
                      fontSize: 16,
                      fontFamily: 'Nunito_600SemiBold',
                      color: climate === option.id ? 'white' : 'black'
                    }}>
                      {option.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={{ 
                fontFamily: 'Nunito_600SemiBold', 
                fontSize: 18, 
                color: 'black',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                Would you like reminders?
              </Text>
              <View style={{ gap: 16 }}>
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setWantsReminders(option.id === 'yes')}
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      backgroundColor: wantsReminders === (option.id === 'yes') ? 'black' : 'white',
                      borderWidth: 1,
                      borderColor: wantsReminders === (option.id === 'yes') ? 'black' : '#E5E5E5',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 20,
                      backgroundColor: wantsReminders === (option.id === 'yes') ? 'white' : '#F5F5F5',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 16
                    }}>
                      <Ionicons 
                        name={option.icon} 
                        size={20} 
                        color={wantsReminders === (option.id === 'yes') ? 'black' : '#666'} 
                      />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 18, 
                        fontFamily: 'Nunito_600SemiBold',
                        color: wantsReminders === (option.id === 'yes') ? 'white' : 'black',
                        marginBottom: 4
                      }}>
                        {option.title}
                      </Text>
                      <Text style={{ 
                        fontSize: 16,
                        fontFamily: 'Nunito_400Regular',
                        color: wantsReminders === (option.id === 'yes') ? 'white' : '#666'
                      }}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleFinish}
          disabled={!climate || wantsReminders === null}
          style={{ 
            padding: 16,
            backgroundColor: climate && wantsReminders !== null ? 'black' : '#E5E5E5',
            borderRadius: 12,
            marginBottom: 20,
            marginTop: 20
          }}
        >
          <Text style={{ 
            color: climate && wantsReminders !== null ? 'white' : '#999', 
            fontSize: 18,
            fontFamily: 'Nunito_600SemiBold',
            textAlign: 'center'
          }}>
            Get Started
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
} 