'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Image, Modal, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, NativeModules, Linking } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';
import PullToRefreshWithHaptics from '../../modules/haptic-engine/PullToRefreshWithHaptics';
import drinkNotificationService from '../../lib/drinkNotificationService';
import * as Haptics from 'expo-haptics';
import CameraModal from '../components/CameraModal';
import DrinkConfirmationModal from '../components/DrinkConfirmationModal';
import InAppNotification from '../components/InAppNotification';
import superwallDelegate from '../../lib/superwallDelegate';

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
const { SharedHydrationModule } = NativeModules;

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const quickHandledRef = useRef(false);
  const scanHandledRef = useRef(false);
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
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [detectedDrink, setDetectedDrink] = useState(null);
  const [showInAppNotification, setShowInAppNotification] = useState(false);
  const [inAppNotification, setInAppNotification] = useState(null);

  // Drink options with hydration values and emojis
  const drinkOptions = [
    { name: "Water", water_oz: 8, emoji: "💧" },
    { name: "Sparkling Water", water_oz: 8, emoji: "🌊" },
    { name: "Coconut Water", water_oz: 7.5, emoji: "🥥" },
    { name: "Unsweetened Tea", water_oz: 7.5, emoji: "🫖" },
    { name: "Green Tea", water_oz: 7.2, emoji: "🍵" },
    { name: "Black Coffee (8 oz)", water_oz: 7, emoji: "☕" },
    { name: "Iced Coffee with Cream (12 oz)", water_oz: 6, emoji: "🧊" },
    { name: "Latte (12 oz)", water_oz: 6.2, emoji: "🥛" },
    { name: "Herbal Tea", water_oz: 7.8, emoji: "🌿" },
    { name: "Orange Juice", water_oz: 7, emoji: "🍊" },
    { name: "Apple Juice", water_oz: 6.8, emoji: "🍎" },
    { name: "Lemonade", water_oz: 6.5, emoji: "🍋" },
    { name: "Sports Drink (e.g., Gatorade)", water_oz: 7, emoji: "🏃" },
    { name: "Milk (Whole)", water_oz: 6.5, emoji: "🥛" },
    { name: "Milk (Skim)", water_oz: 6.8, emoji: "🥛" },
    { name: "Almond Milk (Unsweetened)", water_oz: 7.5, emoji: "🥜" },
    { name: "Protein Shake (Whey with Water)", water_oz: 7.5, emoji: "💪" },
    { name: "Smoothie", water_oz: 5.5, emoji: "🥤" },
    { name: "Soda (Cola)", water_oz: 6, emoji: "🥤" },
    { name: "Energy Drink", water_oz: 5.5, emoji: "⚡" },
    { name: "Beer", water_oz: 6.5, emoji: "🍺" },
    { name: "Boba Tea", water_oz: 4.5, emoji: "🧋" }
  ];
  
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const modalHeight = useSharedValue(SCREEN_HEIGHT * 0.75);
  
  // Confetti animation values
  const confetti1 = useSharedValue(0);
  const confetti2 = useSharedValue(0);
  const confetti3 = useSharedValue(0);
  const confetti4 = useSharedValue(0);
  const confetti5 = useSharedValue(0);
  const celebrationScale = useSharedValue(0);

    // Function to fetch user data
  const fetchUserData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }
      setUser(user);

      // Fetch all home screen data in a single call
      const { data: homeData, error: homeError } = await supabase.rpc('get_home_screen_data', {
        user_uuid: user.id
      });

      console.log('Full home data:', homeData); // Debug log

      if (homeError) {
        console.error('Error fetching home screen data:', homeError);
      } else if (homeData) {
        // Debug: Log timezone info
        console.log('Current time in user timezone:', new Date().toLocaleString());
        console.log('Current time in UTC:', new Date().toISOString());
        // Set hydration plan data
        if (homeData.hydration_plan && homeData.hydration_plan.daily_goal) {
          const goalMatch = homeData.hydration_plan.daily_goal.match(/(\d+)/);
          if (goalMatch) {
            setDailyGoal(parseInt(goalMatch[1]));
          }
        }

        // Set check-ins data
        if (homeData.today_checkins) {
          const totalIntake = homeData.today_checkins.reduce((sum, checkin) => sum + (checkin.value || 0), 0);
          setCurrentIntake(totalIntake);
          console.log('Today checkins:', homeData.today_checkins); // Debug log
          setRecentCheckins(homeData.today_checkins.slice(0, 5)); // Show last 5 entries
        } else {
          console.log('No today_checkins found in homeData');
        }
        
        // Debug: Check what date we're looking for
        const today = new Date();
        console.log('Looking for checkins on date:', today.toISOString().split('T')[0]);
        console.log('Current date in JS:', today.toDateString());

        // Set streak data
        if (homeData.streak) {
          setCurrentStreak(homeData.streak.current_streak || 0);
        }
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (params?.quick === '1') {
      handleOpenModal();
    }
  }, [params?.quick]);

  // Open Quick Log or Scan modal when coming from widget deep link
  useFocusEffect(
    useCallback(() => {
      if (params?.quick === '1' && !quickHandledRef.current) {
        quickHandledRef.current = true;
        handleOpenModal();
      }
      if (params?.scan === '1' && !scanHandledRef.current) {
        scanHandledRef.current = true;
        handleOpenCamera();
      }
      return () => {};
    }, [params?.quick, params?.scan])
  );

  // Function to handle modal step transitions with height animation
  const handleStepTransition = useCallback((newStep) => {
    setModalStep(newStep);
    
    // Animate height based on step
    if (newStep === 1) {
      // Step 1: Full height for drink selection
      modalHeight.value = withSpring(SCREEN_HEIGHT * 0.75, {
        damping: 65,
        mass: 0.7,
        stiffness: 65,
      });
    } else if (newStep === 2) {
      // Step 2: Compact height for hydration level
      modalHeight.value = withSpring(SCREEN_HEIGHT * 0.59, {
        damping: 65,
        mass: 0.7,
        stiffness: 65,
      });
    } else if (newStep === 3) {
      // Step 3: Compact height for custom amount
      modalHeight.value = withSpring(SCREEN_HEIGHT * 0.38, {
        damping: 65,
        mass: 0.7,
        stiffness: 65,
      });
    }
  }, [modalHeight]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchUserData(true);
  }, []);

  // Update hydration level when currentIntake or dailyGoal changes
  useEffect(() => {
    if (dailyGoal > 0) {
      const percentage = (currentIntake / dailyGoal) * 100;
      setHydrationLevel(Math.round(Math.min(percentage, 100)));
      
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

  // Set up Superwall delegate refresh callback
  useEffect(() => {
    // Override the refreshUserData method in the Superwall delegate
    // to call our fetchUserData function
    const originalRefreshUserData = superwallDelegate.refreshUserData;
    superwallDelegate.refreshUserData = async () => {
      console.log('🔄 Superwall delegate: Refreshing user data after successful redemption');
      await fetchUserData(true); // Refresh user data
      originalRefreshUserData.call(superwallDelegate); // Call original method
    };

    return () => {
      // Restore original method on cleanup
      superwallDelegate.refreshUserData = originalRefreshUserData;
    };
  }, []);

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
    modalHeight.value = withSpring(SCREEN_HEIGHT * 0.75, {
      damping: 65,
      mass: 0.7,
      stiffness: 65,
    });
  }, [translateY, modalHeight]);

  const handleOpenCamera = useCallback(() => {
    console.log('FAB pressed - opening camera');
    setIsCameraVisible(true);
  }, []);

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
        runOnJS(setHydrationLevel)(50); // Reset hydration level to default
      }
    });
    modalHeight.value = withTiming(SCREEN_HEIGHT * 0.75, {
      duration: 250,
    });
  }, [translateY, modalHeight, SCREEN_HEIGHT]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      height: modalHeight.value,
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

  // Helper function to format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Helper function to get drink emoji and color
  const getDrinkInfo = (drinkName) => {
    const name = drinkName?.toLowerCase() || '';
    if (name.includes('coconut')) return { emoji: '🥥', color: '#8B4513' }; // Brown
    if (name.includes('tea')) return { emoji: '🫖', color: '#228B22' }; // Green
    if (name.includes('coffee')) return { emoji: '☕', color: '#654321' }; // Dark brown
    if (name.includes('frappuccino')) return { emoji: '🥤', color: '#8B4513' }; // Brown for coffee drinks
    if (name.includes('starbucks')) return { emoji: '☕', color: '#654321' }; // Dark brown for Starbucks
    if (name.includes('mocha')) return { emoji: '☕', color: '#654321' }; // Dark brown for mocha
    if (name.includes('juice')) return { emoji: '🧃', color: '#FF8C00' }; // Orange
    if (name.includes('milk')) return { emoji: '🥛', color: '#F5F5DC' }; // Cream
    if (name.includes('smoothie')) return { emoji: '🥤', color: '#FF69B4' }; // Pink
    if (name.includes('soda')) return { emoji: '🥤', color: '#DC143C' }; // Crimson
    if (name.includes('beer')) return { emoji: '🍺', color: '#FFD700' }; // Gold
    if (name.includes('energy')) return { emoji: '⚡', color: '#FF4500' }; // Orange red
    if (name.includes('sports')) return { emoji: '🏃', color: '#00CED1' }; // Dark turquoise
    if (name.includes('sparkling')) return { emoji: '💧', color: '#87CEEB' }; // Sky blue
    return { emoji: '💧', color: '#4FC3F7' }; // Default blue for water
  };

  // Calculate actual water content based on drink type
  const calculateWaterContent = (drinkName, totalVolume) => {
    const lowerName = drinkName.toLowerCase();
    
    // Water-based drinks (mostly water)
    if (lowerName.includes('water') || lowerName.includes('bottled') || lowerName.includes('purified') ||
        lowerName.includes('mineral') || lowerName.includes('sparkling')) {
      return totalVolume; // 100% water content
    }
    
    // Coffee and tea (mostly water)
    if (lowerName.includes('coffee') || lowerName.includes('latte') || lowerName.includes('cappuccino') || 
        lowerName.includes('espresso') || lowerName.includes('americano') || lowerName.includes('mocha') ||
        lowerName.includes('tea') || lowerName.includes('chai')) {
      return Math.round(totalVolume * 0.95); // 95% water content
    }
    
    // Soda and carbonated drinks (mostly water)
    if (lowerName.includes('soda') || lowerName.includes('pop') || lowerName.includes('cola') || 
        lowerName.includes('coke') || lowerName.includes('pepsi') || lowerName.includes('sprite') ||
        lowerName.includes('fanta') || lowerName.includes('dr pepper')) {
      return Math.round(totalVolume * 0.9); // 90% water content
    }
    
    // Juice (mostly water)
    if (lowerName.includes('juice') || lowerName.includes('orange') || lowerName.includes('apple') ||
        lowerName.includes('cranberry') || lowerName.includes('grape')) {
      return Math.round(totalVolume * 0.85); // 85% water content
    }
    
    // Milk (mostly water)
    if (lowerName.includes('milk') || lowerName.includes('dairy')) {
      return Math.round(totalVolume * 0.87); // 87% water content
    }
    
    // Energy drinks (mostly water)
    if (lowerName.includes('energy') || lowerName.includes('red bull') || lowerName.includes('monster') ||
        lowerName.includes('rockstar')) {
      return Math.round(totalVolume * 0.9); // 90% water content
    }
    
    // Sports drinks (mostly water)
    if (lowerName.includes('gatorade') || lowerName.includes('powerade') || lowerName.includes('sports')) {
      return Math.round(totalVolume * 0.95); // 95% water content
    }
    
    // Beer/alcohol (mostly water)
    if (lowerName.includes('beer') || lowerName.includes('wine') || lowerName.includes('alcohol') ||
        lowerName.includes('cocktail') || lowerName.includes('drink')) {
      return Math.round(totalVolume * 0.9); // 90% water content
    }
    
    // Default: assume mostly water
    return Math.round(totalVolume * 0.9); // 90% water content
  };

  const writeSharedForWidgets = useCallback((total, goal) => {
    const consumed = Math.round(total);
    const goalRounded = Math.round(goal);
    const nextMins = 15;
    try {
      SharedHydrationModule?.write?.(consumed, goalRounded, nextMins);
    } catch {}
    try {
      const url = `water-ai://sync?consumed=${consumed}&goal=${goalRounded}&next=${nextMins}`;
      Linking.openURL(url).catch(() => {});
    } catch {}
  }, []);

  // after fetch set state
  useEffect(() => {
    if (dailyGoal > 0) {
      const percentage = (currentIntake / dailyGoal) * 100;
      setHydrationLevel(Math.round(Math.min(percentage, 100)));
      if (currentIntake < dailyGoal && hasReachedGoal) {
        setHasReachedGoal(false);
      }
      writeSharedForWidgets(currentIntake, dailyGoal);
    }
  }, [currentIntake, dailyGoal, hasReachedGoal, writeSharedForWidgets]);

  // Function to add hydration check-in to database
  const addHydrationCheckin = async (amount, checkinType = 'slider', drinkName = null) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('hydration_checkins')
        .insert([{
          user_id: user.id,
          checkin_type: checkinType,
          value: amount,
          raw_input: drinkName || selectedDrinkObject?.name || `${amount}oz`,
          ai_estimate_oz: Math.round(hydrationLevel) // Round the hydration level to avoid decimals
        }])
        .select()
        .single();

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
      
      // Update recent checkins list
      const newCheckin = {
        value: amount,
        ai_estimate_oz: Math.round(hydrationLevel),
        raw_input: drinkName || selectedDrinkObject?.name || `${amount}oz`,
        created_at: new Date().toISOString()
      };
      console.log('New checkin being added:', newCheckin); // Debug log
      setRecentCheckins(prev => [newCheckin, ...prev.slice(0, 4)]);
      
      // Show in-app notification for drink logging
      try {
        const notification = await drinkNotificationService.getRandomCongratulation();
        setInAppNotification(notification);
        setShowInAppNotification(true);
      } catch (error) {
        console.error('Error showing in-app notification:', error);
      }
      
      // Check if goal is reached and trigger celebration
      if (newTotal >= dailyGoal && !hasReachedGoal) {
        triggerCelebration();
        
        // Check and award achievements (only if user has been using the app for a while)
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
      
      // Note: Streaks are updated automatically when the date changes via updateStreaksForPreviousDay()
      // No need to update streaks here on every drink log
      writeSharedForWidgets(newTotal, dailyGoal);
      
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
      <PullToRefreshWithHaptics 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        onRefresh={onRefresh}
        refreshing={refreshing}
      >
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, marginBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 45, height: 45, marginRight: 5 }} />
          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 28, color: 'black', letterSpacing: -1 }}>Water AI</Text>
        </View>
        
        {/* Streak Display */}
        <TouchableOpacity
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: 'white', 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 16 
          }}
          onPress={() => router.push('/tabs/stats')}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, marginRight: 4 }}>🔥</Text>
          <Text style={{ 
            fontFamily: 'Nunito_600SemiBold', 
            fontSize: 14, 
            color: 'black' 
          }}>
            {currentStreak}
          </Text>
        </TouchableOpacity>
      </View>
      {/* Water Intake Info Above Container */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 36, color: 'black' }}>{Math.round(currentIntake)} oz</Text>
        <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: 16, color: '#666', marginTop: 2 }}>
          {Math.round((currentIntake / dailyGoal) * 100)}% of daily goal – {Math.round(Math.max(0, dailyGoal - currentIntake))} oz left
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
      
      {/* Recently Logged Section */}
      <View style={{ paddingHorizontal: 20, marginTop: 50, marginBottom: 120 }}>
        <Text style={{ 
          fontFamily: 'Nunito_700Bold', 
          fontSize: 20, 
          color: 'black', 
          marginBottom: 16 
        }}>
          Recently logged
        </Text>
        
        {recentCheckins.length > 0 ? (
          <View style={{ gap: 12 }}>
            {recentCheckins.map((checkin, index) => {
              const hydrationEmoji = getHydrationEmoji(checkin.ai_estimate_oz || 50);
              const drinkInfo = getDrinkInfo(checkin.raw_input);
              // Extract just the drink name without the amount
              let drinkName = checkin.raw_input || 'Water';
              
              // If raw_input is just an amount (like "7.5oz", "8oz"), default to "Water"
              if (drinkName.match(/^\d+\.?\d*oz$/)) {
                drinkName = 'Water';
              } else if (drinkName.match(/^\d+\.?\d* oz$/)) {
                // Handle "8 oz" format
                drinkName = 'Water';
              } else {
                // Remove any amount suffix if it exists (e.g., "Black Coffee (8 oz)" -> "Black Coffee")
                drinkName = drinkName.replace(/\s*\(\d+.*?\)$/, '');
                drinkName = drinkName.replace(/\s*\d+.*?oz.*?$/, '');
                drinkName = drinkName.replace(/\s*\d+.*? oz.*?$/, '');
              }
              return (
                <View key={index} style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2
                }}>
                  {/* Drink Icon */}
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: drinkInfo.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <Text style={{ fontSize: 20 }}>{drinkInfo.emoji}</Text>
                  </View>
                  
                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'Nunito_600SemiBold',
                      fontSize: 16,
                      color: 'black',
                      marginBottom: 4
                    }}>
                      {drinkName} - {checkin.value} oz
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{
                        fontFamily: 'Nunito_400Regular',
                        fontSize: 14,
                        color: '#666'
                      }}>
                        {formatTime(checkin.created_at)}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 16 }}>{hydrationEmoji}</Text>
                        <Text style={{
                          fontFamily: 'Nunito_400Regular',
                          fontSize: 14,
                          color: '#666'
                        }}>
                          {checkin.ai_estimate_oz || 50}% hydrated
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2
          }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💧</Text>
            <Text style={{
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 16,
              color: '#666',
              textAlign: 'center',
              marginBottom: 8
            }}>
              No water logged yet today
            </Text>
            <Text style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: 14,
              color: '#999',
              textAlign: 'center'
            }}>
              Tap the + button to log your first drink
            </Text>
          </View>
        )}
      </View>
      </PullToRefreshWithHaptics>
      
      {/* Floating Action Button for logging water */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          right: 24,
          bottom: 20,
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
        onPress={handleOpenCamera}
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
            {/* Background Pattern */}
            <View style={styles.backgroundPattern} pointerEvents="none">
              <Text style={styles.backgroundEmoji}>💧</Text>
              <Text style={[styles.backgroundEmoji, { position: 'absolute', top: 50, right: 30 }]}>🌊</Text>
              <Text style={[styles.backgroundEmoji, { position: 'absolute', bottom: 100, left: 20 }]}>💦</Text>
              <Text style={[styles.backgroundEmoji, { position: 'absolute', top: 120, left: 40 }]}>🚰</Text>
            </View>
            
            <View style={styles.handle} />
            <View style={styles.titleContainer}>
              {modalStep !== 1 && (
                <TouchableOpacity
                  onPress={() => handleStepTransition(1)}
                  style={styles.backIconButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#000000" />
                </TouchableOpacity>
              )}
              {modalStep === 1 && <View style={{ width: 24 }} />}
              <Text style={styles.title}>Log Drink</Text>
              <View style={{ width: 24 }} />
            </View>
            
            {/* Step 1: Select Drink Source */}
            {modalStep === 1 && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.stepTitle}>What did you drink?</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity
                      onPress={() => handleStepTransition(3)}
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
                </View>
                
                <ScrollView 
                  style={{ flex: 1 }} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 80 }}
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
                          handleStepTransition(2);
                        }}
                      >
                        <Text style={[
                          styles.drinkEmoji,
                          selectedDrinkObject?.name === drink.name && styles.drinkEmojiSelected
                        ]}>
                          {drink.emoji}
                        </Text>
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
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>How are you feeling?</Text>
                </View>
                
                <View style={styles.hydrationDisplay}>
                  <Text style={styles.hydrationEmoji}>
                    {getHydrationEmoji(hydrationLevel)}
                  </Text>
                  <Text style={styles.hydrationText}>
                    {hydrationLevel}% hydrated
                  </Text>
                  <Text style={styles.hydrationSubtext}>
                    {hydrationLevel < 30 ? "You need water!" : 
                     hydrationLevel < 60 ? "Getting there..." : 
                     hydrationLevel < 80 ? "Good job!" : 
                     "Excellent hydration!"}
                  </Text>
                </View>
                
                <Slider
                  style={{ width: '100%', height: 40, marginBottom: 20 }}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={hydrationLevel}
                  onValueChange={setHydrationLevel}
                  minimumTrackTintColor={getHydrationColor(hydrationLevel)}
                  maximumTrackTintColor={'#E5E5E5'}
                  thumbTintColor={'#fff'}
                />
                
                <View style={[styles.buttonRow, { marginBottom: 120 }]}>
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
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>Enter amount (oz)</Text>
                  </View>
                  
                  <TextInput
                    style={styles.customInput}
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    placeholder="Enter ounces"
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  
                  <View style={[styles.buttonRow, { marginBottom: 0 }]}>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={async () => {
                        const totalAmount = parseInt(customAmount) || 0;
                        if (totalAmount > 0) {
                          // For custom amount, assume it's water (100% water content)
                          const waterContent = calculateWaterContent('Water', totalAmount);
                          const success = await addHydrationCheckin(waterContent, 'freeform', 'Water');
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
              </KeyboardAvoidingView>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <CameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onDrinkDetected={async (drinkData) => {
          const success = await addHydrationCheckin(drinkData.water_oz, drinkData.checkinType, drinkData.name);
          if (success) {
            setIsCameraVisible(false);
          }
        }}
        onOpenManualLog={handleOpenModal}
      />

      {/* In-App Notification */}
      <InAppNotification
        visible={showInAppNotification}
        notification={inAppNotification}
        onHide={() => setShowInAppNotification(false)}
      />
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
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    zIndex: 0,
  },
  backgroundEmoji: {
    fontSize: 40,
    opacity: 0.3,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    zIndex: 1,
  },
  titleEmoji: {
    fontSize: 28,
    marginRight: 8,
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
    textAlign: 'center',
    color: '#000000',
  },
  backIconButton: {
    padding: 8,
  },
  stepTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: 'black',
    marginBottom: 16,
    zIndex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  stepEmoji: {
    fontSize: 24,
    marginRight: 8,
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
    zIndex: 1,
  },
  drinkEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  drinkEmojiSelected: {
    transform: [{ scale: 1.1 }],
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
    zIndex: 1,
  },
  hydrationEmoji: {
    fontSize: 96,
    marginBottom: 8,
    zIndex: 1,
  },
  hydrationText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'black',
    zIndex: 1,
  },
  hydrationSubtext: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    zIndex: 1,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 12,
  },
  backButton: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
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