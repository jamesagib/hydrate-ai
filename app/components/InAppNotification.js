import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import drinkNotificationService from '../../lib/drinkNotificationService';

export default function InAppNotification({ visible, onHide, notification }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback when notification appears
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Slide in from top
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible || !notification) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        style={{
          backgroundColor: '#4FC3F7',
          marginHorizontal: 16,
          marginTop: 60,
          borderRadius: 12,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'Nunito_600SemiBold',
                fontSize: 16,
                color: 'white',
                marginBottom: 4,
              }}
            >
              {notification.title}
            </Text>
            <Text
              style={{
                fontFamily: 'Nunito_400Regular',
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 20,
              }}
            >
              {notification.body}
            </Text>
          </View>
          <TouchableOpacity
            onPress={hideNotification}
            style={{
              padding: 8,
              marginLeft: 12,
            }}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
} 