'use client';

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function OnboardingHeader({ 
  showBack = true, 
  progress = 0, 
  onBackPress 
}) {
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
      backgroundColor: '#F2EFEB'
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {showBack && (
          <TouchableOpacity 
            onPress={handleBackPress}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        )}
        
        <View style={{ flex: 1 }}>
          <View style={{ 
            height: 2, 
            backgroundColor: '#E5E5E5', 
            borderRadius: 1,
            overflow: 'hidden'
          }}>
            <View style={{ 
              height: '100%', 
              backgroundColor: 'black', 
              width: `${progress}%`,
              borderRadius: 1
            }} />
          </View>
        </View>
      </View>
      
      <Text style={{ 
        fontFamily: 'NunitoSans_400Regular', 
        fontSize: 14, 
        color: '#666',
        marginLeft: 15
      }}>
        EN
      </Text>
    </View>
  );
} 