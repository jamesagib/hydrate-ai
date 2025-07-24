'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const [hydrationLevel, setHydrationLevel] = useState(50); // 0-100
  const [dailyGoal] = useState(80); // oz
  const [currentIntake, setCurrentIntake] = useState(32); // oz
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [quickInput, setQuickInput] = useState('');

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Custom Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 0,
        minHeight: 70
      }}>
        <Text style={{
          fontFamily: 'NunitoSans_700Bold',
          fontSize: 35,
          color: 'black',
          letterSpacing: -1,
          textAlign: 'left',
        }}>
          HydrateAI
        </Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={28} color="#222" />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
          <Text style={{ 
            fontFamily: 'NunitoSans_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 4
          }}>
            Good morning! 👋
          </Text>
          <Text style={{ 
            fontFamily: 'NunitoSans_400Regular', 
            fontSize: 16, 
            color: '#666'
          }}>
            Let's stay hydrated today
          </Text>
        </View>

        {/* Visual Bottle */}
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <View style={{ 
            width: 120, 
            height: 200, 
            borderWidth: 3, 
            borderColor: '#E5E5E5', 
            borderRadius: 60,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <LinearGradient
              colors={['#4FC3F7', '#29B6F6']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${bottleFillPercentage}%`,
                borderBottomLeftRadius: 57,
                borderBottomRightRadius: 57,
              }}
            />
            <View style={{ 
              position: 'absolute', 
              top: -10, 
              left: '50%', 
              marginLeft: -15,
              width: 30, 
              height: 20, 
              backgroundColor: '#E5E5E5',
              borderRadius: 15
            }} />
          </View>
          
          <Text style={{ 
            fontFamily: 'NunitoSans_600SemiBold', 
            fontSize: 24, 
            color: 'black',
            marginTop: 16
          }}>
            {currentIntake} / {dailyGoal} oz
          </Text>
          <Text style={{ 
            fontFamily: 'NunitoSans_400Regular', 
            fontSize: 16, 
            color: '#666',
            marginTop: 4
          }}>
            {Math.round(bottleFillPercentage)}% of daily goal
          </Text>
        </View>

        {/* Vibe Slider */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'NunitoSans_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            How hydrated do you feel right now?
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <Text style={{ fontSize: 24 }}>🐫</Text>
            <Text style={{ fontSize: 24 }}>💧</Text>
          </View>
          
          <View style={{ 
            height: 8, 
            backgroundColor: '#E5E5E5', 
            borderRadius: 4,
            position: 'relative'
          }}>
            <View style={{ 
              height: '100%', 
              backgroundColor: getHydrationColor(hydrationLevel), 
              width: `${hydrationLevel}%`,
              borderRadius: 4
            }} />
            <TouchableOpacity
              style={{
                position: 'absolute',
                left: `${hydrationLevel}%`,
                top: -6,
                width: 20,
                height: 20,
                backgroundColor: 'white',
                borderRadius: 10,
                borderWidth: 2,
                borderColor: getHydrationColor(hydrationLevel),
                marginLeft: -10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3
              }}
              onPress={() => {
                // This would be enhanced with proper slider interaction
                setHydrationLevel(prev => Math.min(prev + 10, 100));
              }}
            />
          </View>
          
          {/* Quick Set Buttons */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            marginTop: 16,
            paddingHorizontal: 10
          }}>
            {[0, 25, 50, 75, 100].map((level) => (
              <TouchableOpacity
                key={level}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: hydrationLevel === level ? getHydrationColor(level) : '#F5F5F5',
                  borderRadius: 20,
                  minWidth: 50,
                  alignItems: 'center'
                }}
                onPress={() => setHydrationLevel(level)}
              >
                <Text style={{ 
                  fontFamily: 'NunitoSans_600SemiBold', 
                  fontSize: 12, 
                  color: hydrationLevel === level ? 'white' : '#666'
                }}>
                  {level}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={{ 
            fontFamily: 'NunitoSans_400Regular', 
            fontSize: 16, 
            color: '#666',
            textAlign: 'center',
            marginTop: 12
          }}>
            {getHydrationEmoji(hydrationLevel)} {hydrationLevel}% hydrated
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'NunitoSans_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16
          }}>
            Quick Add
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity 
              style={{ 
                flex: 1, 
                padding: 16, 
                backgroundColor: '#F5F5F5', 
                borderRadius: 12,
                alignItems: 'center'
              }}
              onPress={() => setCurrentIntake(prev => Math.min(prev + 8, dailyGoal))}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>🥤</Text>
              <Text style={{ 
                fontFamily: 'NunitoSans_600SemiBold', 
                fontSize: 14, 
                color: 'black'
              }}>
                Glass (8oz)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ 
                flex: 1, 
                padding: 16, 
                backgroundColor: '#F5F5F5', 
                borderRadius: 12,
                alignItems: 'center'
              }}
              onPress={() => setCurrentIntake(prev => Math.min(prev + 16, dailyGoal))}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>💧</Text>
              <Text style={{ 
                fontFamily: 'NunitoSans_600SemiBold', 
                fontSize: 14, 
                color: 'black'
              }}>
                Bottle (16oz)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Freeform Input */}
          {showQuickInput ? (
            <View style={{ 
              flexDirection: 'row', 
              gap: 12, 
              alignItems: 'center'
            }}>
              <TextInput
                style={{ 
                  flex: 1, 
                  borderWidth: 1, 
                  borderColor: '#E5E5E5', 
                  borderRadius: 12, 
                  padding: 16, 
                  fontSize: 16,
                  fontFamily: 'NunitoSans_400Regular'
                }}
                value={quickInput}
                onChangeText={setQuickInput}
                placeholder="e.g., had tea and a glass of water"
                placeholderTextColor="#999"
                autoFocus
              />
              <TouchableOpacity 
                style={{ 
                  padding: 16, 
                  backgroundColor: 'black', 
                  borderRadius: 12
                }}
                onPress={handleQuickAdd}
              >
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={{ 
                padding: 16, 
                backgroundColor: '#F5F5F5', 
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onPress={() => setShowQuickInput(true)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#666" style={{ marginRight: 8 }} />
              <Text style={{ 
                fontFamily: 'NunitoSans_600SemiBold', 
                fontSize: 16, 
                color: '#666'
              }}>
                Tell me what you drank
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Summary */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'NunitoSans_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16
          }}>
            Today's Progress
          </Text>
          
          <View style={{ 
            backgroundColor: '#F8F9FA', 
            borderRadius: 12, 
            padding: 20
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ 
                fontFamily: 'NunitoSans_400Regular', 
                fontSize: 16, 
                color: '#666'
              }}>
                Current Streak
              </Text>
              <Text style={{ 
                fontFamily: 'NunitoSans_600SemiBold', 
                fontSize: 16, 
                color: 'black'
              }}>
                3 days 🔥
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ 
                fontFamily: 'NunitoSans_400Regular', 
                fontSize: 16, 
                color: '#666'
              }}>
                Remaining Today
              </Text>
              <Text style={{ 
                fontFamily: 'NunitoSans_600SemiBold', 
                fontSize: 16, 
                color: 'black'
              }}>
                {dailyGoal - currentIntake} oz
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 