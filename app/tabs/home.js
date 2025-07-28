'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Image, Modal, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';

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
  cancelAnimation,
  withSequence,
  withDelay
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const [hydrationLevel, setHydrationLevel] = useState(50); // 0-100
  const [dailyGoal, setDailyGoal] = useState(80); // oz - will be fetched from DB
  const [currentIntake, setCurrentIntake] = useState(0); // oz - will be calculated from DB
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedDrinkObject, setSelectedDrinkObject] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasReachedGoal, setHasReachedGoal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());

  // Drink options with hydration values
  const drinkOptions = [
    { name: "Water", water_oz: 8 },
    { name: "Sparkling Water", water_oz: 8 },
    { name: "Coconut Water", water_oz: 7.5 },
    { name: "Unsweetened Tea", water_oz: 7.5 },
    { name: "Green Tea", water_oz: 7.2 },
    { name: "Black Coffee (8 oz)", water_oz: 7 },
    { name: "Iced Coffee with Cream (12 oz)", water_oz: 6 },
    { name: "Latte (12 oz)", water_oz: 6.2 },
    { name: "Herbal Tea", water_oz: 7.8 },
    { name: "Orange Juice", water_oz: 7 },
    { name: "Apple Juice", water_oz: 6.8 },
    { name: "Lemonade", water_oz: 6.5 },
    { name: "Sports Drink (e.g., Gatorade)", water_oz: 7 },
    { name: "Milk (Whole)", water_oz: 6.5 },
    { name: "Milk (Skim)", water_oz: 6.8 },
    { name: "Almond Milk (Unsweetened)", water_oz: 7.5 },
    { name: "Protein Shake (Whey with Water)", water_oz: 7.5 },
    { name: "Smoothie", water_oz: 5.5 },
    { name: "Soda (Cola)", water_oz: 6 },
    { name: "Energy Drink", water_oz: 5.5 },
    { name: "Beer", water_oz: 6.5 }
  ];
  
  const translateY = useSharedValue(SCREEN_HEIGHT);
  
  // Confetti animation values
  const confetti1 = useSharedValue(0);
  const confetti2 = useSharedValue(0);
  const confetti3 = useSharedValue(0);
  const confetti4 = useSharedValue(0);
  const confetti5 = useSharedValue(0);
  const celebrationScale = useSharedValue(0);

  // Fetch user data and daily goal on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found');
          setLoading(false);
          return;
        }
        setUser(user);

        // Fetch user's hydration plan to get daily goal
        const { data: planData, error: planError } = await supabase
          .from('hydration_plans')
          .select('daily_goal')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (planError && planError.code !== 'PGRST116') {
          console.error('Error fetching hydration plan:', planError);
        }

        if (planData && planData.daily_goal) {
          // Extract numeric value from daily goal (e.g., "80oz/day" -> 80)
          const goalMatch = planData.daily_goal.match(/(\d+)/);
          if (goalMatch) {
            setDailyGoal(parseInt(goalMatch[1]));
          }
        }

        // Fetch today's check-ins to calculate current intake
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: checkins, error: checkinsError } = await supabase
          .from('hydration_checkins')
          .select('value')
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString());

        if (checkinsError) {
          console.error('Error fetching check-ins:', checkinsError);
        } else if (checkins) {
          const totalIntake = checkins.reduce((sum, checkin) => sum + (checkin.value || 0), 0);
          setCurrentIntake(totalIntake);
        }

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Update hydration level when currentIntake or dailyGoal changes
  useEffect(() => {
    if (dailyGoal > 0) {
      const percentage = (currentIntake / dailyGoal) * 100;
      setHydrationLevel(Math.min(percentage, 100));
      
      // Reset hasReachedGoal if current intake drops below goal (new day)
      if (currentIntake < dailyGoal && hasReachedGoal) {
        setHasReachedGoal(false);
      }
    }
  }, [currentIntake, dailyGoal, hasReachedGoal]);

  // Check for date change and reset celebration state
  useEffect(() => {
    const today = new Date().toDateString();
    if (today !== currentDate) {
      setCurrentDate(today);
      setHasReachedGoal(false);
      setShowCelebration(false);
      
      // Update streaks for the previous day
      updateStreaksForPreviousDay();
    }
  }, [currentDate]);

  // Function to update streaks when date changes
  const updateStreaksForPreviousDay = async () => {
    if (!user) return;
    
    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get yesterday's check-ins
      const { data: yesterdayCheckins } = await supabase
        .from('hydration_checkins')
        .select('value')
        .eq('user_id', user.id)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());
      
      // Calculate yesterday's total intake
      const yesterdayTotal = yesterdayCheckins?.reduce((sum, checkin) => sum + (checkin.value || 0), 0) || 0;
      
      // Check if user met their goal yesterday
      const metGoalYesterday = yesterdayTotal >= dailyGoal;
      
      // Get current streak data
      const { data: currentStreakData } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_checkin_date, goal_days, total_days')
        .eq('user_id', user.id)
        .single();
      
      let newCurrentStreak = currentStreakData?.current_streak || 0;
      let newLongestStreak = currentStreakData?.longest_streak || 0;
      let newGoalDays = currentStreakData?.goal_days || 0;
      let newTotalDays = currentStreakData?.total_days || 0;
      
      // Update streak based on yesterday's performance
      if (metGoalYesterday) {
        // User met goal yesterday, continue streak
        newCurrentStreak += 1;
        newGoalDays += 1;
        newTotalDays += 1;
      } else if (yesterdayCheckins && yesterdayCheckins.length > 0) {
        // User logged something but didn't meet goal, break streak
        newCurrentStreak = 0;
        newTotalDays += 1;
      }
      // If no checkins yesterday, don't update anything (user didn't use app)
      
      // Update longest streak if current streak is longer
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
      
      // Update streak in database
      const { error } = await supabase
        .from('streaks')
        .upsert([{
          user_id: user.id,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_checkin_date: yesterday.toISOString().split('T')[0],
          goal_days: newGoalDays,
          total_days: newTotalDays,
          updated_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('Error updating streak:', error);
      } else {
        console.log('Streak updated for previous day:', {
          metGoal: metGoalYesterday,
          newStreak: newCurrentStreak,
          yesterdayTotal
        });
      }
    } catch (error) {
      console.error('Error updating streaks:', error);
    }
  };

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

  const triggerCelebration = () => {
    setShowCelebration(true);
    setHasReachedGoal(true);
    
    // Animate confetti
    confetti1.value = withSequence(
      withDelay(0, withSpring(1, { damping: 8, stiffness: 100 })),
      withDelay(2000, withSpring(0))
    );
    confetti2.value = withSequence(
      withDelay(200, withSpring(1, { damping: 8, stiffness: 100 })),
      withDelay(2200, withSpring(0))
    );
    confetti3.value = withSequence(
      withDelay(400, withSpring(1, { damping: 8, stiffness: 100 })),
      withDelay(2400, withSpring(0))
    );
    confetti4.value = withSequence(
      withDelay(600, withSpring(1, { damping: 8, stiffness: 100 })),
      withDelay(2600, withSpring(0))
    );
    confetti5.value = withSequence(
      withDelay(800, withSpring(1, { damping: 8, stiffness: 100 })),
      withDelay(2800, withSpring(0))
    );
    
    // Animate celebration scale
    celebrationScale.value = withSequence(
      withSpring(1, { damping: 8, stiffness: 100 }),
      withDelay(3000, withSpring(0))
    );
    
    // Hide celebration after animation but keep hasReachedGoal true
    setTimeout(() => {
      setShowCelebration(false);
      // Don't reset hasReachedGoal to prevent repeated celebrations
    }, 3000);
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
        runOnJS(setSelectedDrinkObject)(null);
        runOnJS(setCustomAmount)('');
      }
    });
  }, [translateY, SCREEN_HEIGHT]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Confetti animated styles
  const confetti1Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: confetti1.value * -200 },
      { translateX: confetti1.value * 50 },
      { rotate: `${confetti1.value * 360}deg` }
    ],
    opacity: confetti1.value
  }));

  const confetti2Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: confetti2.value * -180 },
      { translateX: confetti2.value * -30 },
      { rotate: `${confetti2.value * -360}deg` }
    ],
    opacity: confetti2.value
  }));

  const confetti3Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: confetti3.value * -220 },
      { translateX: confetti3.value * 80 },
      { rotate: `${confetti3.value * 720}deg` }
    ],
    opacity: confetti3.value
  }));

  const confetti4Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: confetti4.value * -160 },
      { translateX: confetti4.value * -60 },
      { rotate: `${confetti4.value * -180}deg` }
    ],
    opacity: confetti4.value
  }));

  const confetti5Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: confetti5.value * -240 },
      { translateX: confetti5.value * 40 },
      { rotate: `${confetti5.value * 540}deg` }
    ],
    opacity: confetti5.value
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationScale.value
  }));

  const bottleFillPercentage = (currentIntake / dailyGoal) * 100;

  // Function to add hydration check-in to database
  const addHydrationCheckin = async (amount, checkinType = 'slider') => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('hydration_checkins')
        .insert([{
          user_id: user.id,
          checkin_type: checkinType,
          value: amount,
          raw_input: `${amount}oz`
        }]);

      if (error) {
        console.error('Error adding check-in:', error);
        return false;
      }

      // Update local state
      const newTotal = currentIntake + amount;
      setCurrentIntake(newTotal);
      
      // Update hydration level
      const newPercentage = (newTotal / dailyGoal) * 100;
      setHydrationLevel(Math.min(newPercentage, 100));
      
      // Check if goal is reached and trigger celebration
      if (newTotal >= dailyGoal && !hasReachedGoal) {
        triggerCelebration();
        
        // Check and award achievements
        try {
          const { error } = await supabase.rpc('check_and_award_achievements', {
            user_uuid: user.id
          });
          if (error) {
            console.error('Error checking achievements:', error);
          }
        } catch (error) {
          console.error('Error checking achievements:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error adding check-in:', error);
      return false;
    }
  };

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  
  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{ marginTop: 16, fontSize: 16, color: 'black', fontFamily: 'Nunito_400Regular' }}>
          Loading your hydration data...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      {/* Confetti Animation */}
      {showCelebration && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: 'none' }}>
          <Animated.View style={[confetti1Style, { position: 'absolute', top: '50%', left: '20%' }]}>
            <Text style={{ fontSize: 24 }}>🎉</Text>
          </Animated.View>
          <Animated.View style={[confetti2Style, { position: 'absolute', top: '40%', left: '80%' }]}>
            <Text style={{ fontSize: 20 }}>✨</Text>
          </Animated.View>
          <Animated.View style={[confetti3Style, { position: 'absolute', top: '60%', left: '10%' }]}>
            <Text style={{ fontSize: 22 }}>🎊</Text>
          </Animated.View>
          <Animated.View style={[confetti4Style, { position: 'absolute', top: '30%', left: '70%' }]}>
            <Text style={{ fontSize: 18 }}>🌟</Text>
          </Animated.View>
          <Animated.View style={[confetti5Style, { position: 'absolute', top: '70%', left: '90%' }]}>
            <Text style={{ fontSize: 26 }}>🎈</Text>
          </Animated.View>
          
          {/* Celebration Message */}
          <Animated.View style={[celebrationStyle, { 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: [{ translateX: -100 }, { translateY: -25 }],
            backgroundColor: '#4CAF50',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5
          }]}>
            <Text style={{ 
              color: 'white', 
              fontFamily: 'Nunito_700Bold', 
              fontSize: 18,
              textAlign: 'center'
            }}>
              🎉 Goal Reached! 🎉
            </Text>
          </Animated.View>
        </View>
      )}
      
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
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.stepTitle}>What did you drink?</Text>
                  <TouchableOpacity
                    onPress={() => setModalStep(3)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                  >
                    <Text style={{ 
                      fontFamily: 'Nunito_600SemiBold', 
                      fontSize: 14, 
                      color: '#4FC3F7',
                      textDecorationLine: 'underline'
                    }}>
                      Custom Amount
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  style={{ flex: 1 }} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.drinkGrid}>
                    {drinkOptions.filter(drink => drink.name !== 'Custom Amount').map((drink) => (
                      <TouchableOpacity
                        key={drink.name}
                        style={[
                          styles.drinkButton,
                          selectedDrinkObject?.name === drink.name && styles.drinkButtonSelected
                        ]}
                        onPress={() => {
                          setSelectedDrinkObject(drink);
                          setModalStep(2);
                        }}
                      >
                        <Text style={[
                          styles.drinkButtonText,
                          selectedDrinkObject?.name === drink.name && styles.drinkButtonTextSelected
                        ]}>
                          {drink.name}
                        </Text>
                        {drink.water_oz > 0 && (
                          <Text style={[
                            styles.drinkOunces,
                            selectedDrinkObject?.name === drink.name && styles.drinkOuncesSelected
                          ]}>
                            {drink.water_oz} oz
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
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
                    onPress={async () => {
                      const amount = selectedDrinkObject?.water_oz || 0;
                      const success = await addHydrationCheckin(amount, 'slider');
                      if (success) {
                        handleCloseModal();
                      }
                    }}
                  >
                    <Text style={styles.addButtonText}>Add {selectedDrinkObject?.name || 'Drink'}</Text>
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
                    onPress={async () => {
                      const amount = parseInt(customAmount) || 0;
                      if (amount > 0) {
                        const success = await addHydrationCheckin(amount, 'freeform');
                        if (success) {
                          setCustomAmount('');
                          handleCloseModal();
                        }
                      }
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
    height: SCREEN_HEIGHT * 0.75,
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
    gap: 8,
    justifyContent: 'space-between',
  },
  drinkButton: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
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
  drinkOunces: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  drinkOuncesSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
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