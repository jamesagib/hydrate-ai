'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRef, useMemo } from 'react';

export default function HomeScreen() {
  const [hydrationLevel, setHydrationLevel] = useState(50); // 0-100
  const [dailyGoal] = useState(80); // oz
  const [currentIntake, setCurrentIntake] = useState(32); // oz
  const [showQuickInput, setShowQuickInput] = useState(false);
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);
  const [quickInput, setQuickInput] = useState('');
  const [modalStep, setModalStep] = useState(1);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  const getHydrationEmoji = (level) => {
    if (level <= 20) return '🐫';
    if (level <= 40) return '😐';
    if (level <= 60) return '😊';
    if (level <= 80) return '💧';
    return '🌊';
  };

  const getHydrationColor = (level) => {
    if (level <= 20) return '#FF6B6B';
    if (level <= 40) return '#FFA726';
    if (level <= 60) return '#FFD54F';
    if (level <= 80) return '#4FC3F7';
    return '#4CAF50';
  };

  const handleQuickAdd = () => {
    if (quickInput.trim()) {
      // Simple parsing - could be enhanced with AI
      const input = quickInput.toLowerCase();
      let amount = 0;
      
      if (input.includes('glass') || input.includes('cup')) amount = 8;
      else if (input.includes('bottle')) amount = 16;
      else if (input.includes('large')) amount = 20;
      else if (input.includes('small')) amount = 4;
      else amount = 8; // default
      
      setCurrentIntake(prev => Math.min(prev + amount, dailyGoal));
      setQuickInput('');
      setShowQuickInput(false);
    }
  };

  const bottleFillPercentage = (currentIntake / dailyGoal) * 100;

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
      {/* Logo Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, marginBottom: 40 }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 45, height: 45, marginRight: 5 }} />
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 28, color: 'black', letterSpacing: -1 }}>HydrateAI</Text>
      </View>
      {/* Water Intake Info Above Container */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 36, color: 'black' }}>{currentIntake} oz</Text>
        <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: 16, color: '#666', marginTop: 2 }}>
          {Math.round((currentIntake / dailyGoal) * 100)}% of daily goal – {dailyGoal - currentIntake} oz left
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center' }}>
        {/* Water Container (centerpiece) */}
        <View
          style={{
            width: 260,
            height: 400,
            borderWidth: 4,
            borderColor: '#4FC3F7',
            borderRadius: 32,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Water Fill */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: `${Math.max(Math.min((currentIntake / dailyGoal) * 100, 100), 0)}%`,
              backgroundColor: '#4FC3F7',
              zIndex: 1,
              transition: 'height 0.3s',
            }}
          />
          {/* Current Intake Marker (white) */}
          <View
            style={{
              position: 'absolute',
              right: 0,
              width: 56,
              height: 0,
              zIndex: 4,
              top: 24 + (400 - 24) * (1 - Math.max(Math.min(currentIntake / dailyGoal, 1), 0)),
              // 24 is the top offset for the scale, 400 is the container height
            }}
          >
            <View style={{ height: 0, borderTopWidth: 3, borderTopColor: 'white', width: 28, borderRadius: 2, marginLeft: 28 }} />
          </View>
          {/* Oz Scale */}
          <View
            style={{
              position: 'absolute',
              top: 24,
              bottom: 0,
              right: 0,
              width: 56,
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            {(() => {
              const markerCount = 10;
              const step = dailyGoal / markerCount;
              return Array.from({ length: markerCount + 1 }).map((_, i) => {
                const value = Math.round(dailyGoal - step * i);
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#4FC3F7', marginRight: 4, width: 32, textAlign: 'right' }}>{value}</Text>
                    <View style={{ width: 20, height: 2, backgroundColor: '#4FC3F7' }} />
                  </View>
                );
              });
            })()}
          </View>
        </View>
      </View>
      {/* Floating Action Button for logging water */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          right: 24,
          bottom: 36,
          width: 64,
          height: 64,
          backgroundColor: 'black',
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 6,
          zIndex: 100,
        }}
        onPress={() => setShowQuickInput(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={36} color="white" />
      </TouchableOpacity>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ borderRadius: 24, backgroundColor: 'white' }}
        handleIndicatorStyle={{ backgroundColor: '#E5E5E5', width: 60, height: 6, borderRadius: 3, marginTop: 8 }}
      >
        <View style={{ height: 200, backgroundColor: 'red', width: '100%' }} />
      </BottomSheet>
    </SafeAreaView>
  );
} 