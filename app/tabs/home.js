'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Image, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS,
  cancelAnimation
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const [hydrationLevel, setHydrationLevel] = useState(50); // 0-100
  const [dailyGoal] = useState(80); // oz
  const [currentIntake, setCurrentIntake] = useState(32); // oz
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  
  const translateY = useSharedValue(SCREEN_HEIGHT);

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

  const handleOpenModal = useCallback(() => {
    setIsModalVisible(true);
    translateY.value = withSpring(0, {
      damping: 65,
      mass: 0.7,
      stiffness: 65,
      overshootClamping: true,
    });
  }, [translateY]);

  const handleCloseModal = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 250,
    }, (finished) => {
      if (finished) {
        runOnJS(setIsModalVisible)(false);
        runOnJS(setModalStep)(1);
        runOnJS(setSelectedDrink)(null);
        runOnJS(setCustomAmount)('');
      }
    });
  }, [translateY, SCREEN_HEIGHT]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

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
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 28, color: 'black', letterSpacing: -1 }}>Water AI</Text>
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
        onPress={handleOpenModal}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={36} color="white" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={isModalVisible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.container}>
          <TouchableOpacity 
            style={styles.backdrop} 
            activeOpacity={1} 
            onPress={handleCloseModal}
          />
          <Animated.View 
            style={[
              styles.sheet,
              animatedStyle
            ]}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>Log Water</Text>
            
            {/* Step 1: Select Drink Source */}
            {modalStep === 1 && (
              <View>
                <Text style={styles.stepTitle}>What did you drink?</Text>
                
                <View style={styles.drinkGrid}>
                  {['Starbucks Tall', 'Bottled Water', 'Custom Amount'].map((drink) => (
                    <TouchableOpacity
                      key={drink}
                      style={[
                        styles.drinkButton,
                        selectedDrink === drink && styles.drinkButtonSelected
                      ]}
                      onPress={() => {
                        setSelectedDrink(drink);
                        if (drink === 'Custom Amount') {
                          setModalStep(3);
                        } else {
                          setModalStep(2);
                        }
                      }}
                    >
                      <Text style={[
                        styles.drinkButtonText,
                        selectedDrink === drink && styles.drinkButtonTextSelected
                      ]}>
                        {drink}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Step 2: Hydration Level */}
            {modalStep === 2 && (
              <View>
                <Text style={styles.stepTitle}>How are you feeling?</Text>
                
                <View style={styles.hydrationDisplay}>
                  <Text style={styles.hydrationEmoji}>
                    {getHydrationEmoji(hydrationLevel)}
                  </Text>
                  <Text style={styles.hydrationText}>
                    {hydrationLevel}% hydrated
                  </Text>
                </View>
                
                <Slider
                  style={{ width: '100%', height: 40, marginBottom: 32 }}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={hydrationLevel}
                  onValueChange={setHydrationLevel}
                  minimumTrackTintColor={getHydrationColor(hydrationLevel)}
                  maximumTrackTintColor={'#E5E5E5'}
                  thumbTintColor={'#fff'}
                />
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setModalStep(1)}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      setCurrentIntake(prev => prev + 16); // Assuming 16oz for selected drink
                      handleCloseModal();
                    }}
                  >
                    <Text style={styles.addButtonText}>Add Water</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: Custom Amount */}
            {modalStep === 3 && (
              <View>
                <Text style={styles.stepTitle}>Enter amount (oz)</Text>
                
                <TextInput
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="Enter ounces"
                  keyboardType="numeric"
                />
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setModalStep(1)}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      const amount = parseInt(customAmount) || 0;
                      if (amount > 0) {
                        setCurrentIntake(prev => prev + amount);
                        setCustomAmount('');
                      }
                      handleCloseModal();
                    }}
                  >
                    <Text style={styles.addButtonText}>Add Water</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    height: SCREEN_HEIGHT * 0.65,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CFCFCF',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000000',
  },
  stepTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: 'black',
    marginBottom: 16,
  },
  drinkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  drinkButton: {
    width: '30%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  drinkButtonSelected: {
    backgroundColor: '#4FC3F7',
    borderColor: '#4FC3F7',
  },
  drinkButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: 'black',
    textAlign: 'center',
  },
  drinkButtonTextSelected: {
    color: 'white',
  },
  hydrationDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hydrationEmoji: {
    fontSize: 96,
    marginBottom: 8,
  },
  hydrationText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'black',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  backButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
  addButton: {
    padding: 12,
    backgroundColor: '#4FC3F7',
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  addButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
}); 