'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  
  // Mock data - would come from actual user data
  const weeklyData = [65, 72, 58, 80, 75, 68, 82];
  const currentStreak = 7;
  const bestStreak = 12;
  const averageHydration = 71;
  const totalDays = 28;
  const goalDays = 18;

  const getDayName = (index) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[index];
  };

  const getHydrationColor = (percentage) => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#4FC3F7';
    if (percentage >= 40) return '#FFD54F';
    return '#FF6B6B';
  };

  const getHydrationEmoji = (percentage) => {
    if (percentage >= 80) return '🌊';
    if (percentage >= 60) return '💧';
    if (percentage >= 40) return '😊';
    return '🐫';
  };

  const achievements = [
    { id: 1, title: 'First Week', description: 'Complete 7 days', icon: '🏆', earned: true },
    { id: 2, title: 'Hydration Hero', description: 'Meet goal 5 days in a row', icon: '🔥', earned: true },
    { id: 3, title: 'Perfect Week', description: 'Meet goal every day for a week', icon: '⭐', earned: false },
    { id: 4, title: 'Consistency King', description: '30 days of tracking', icon: '👑', earned: false },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
          <Text style={{ 
            fontFamily: 'Nunito_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 4
          }}>
            Your Stats
          </Text>
          <Text style={{ 
            fontFamily: 'Nunito_400Regular', 
            fontSize: 16, 
            color: '#666'
          }}>
            Track your hydration journey
          </Text>
        </View>

        {/* Period Selector */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: '#F5F5F5', 
            borderRadius: 12,
            padding: 4
          }}>
            {['week', 'month', 'year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: selectedPeriod === period ? 'white' : 'transparent',
                  alignItems: 'center'
                }}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={{ 
                  fontFamily: 'Nunito_600SemiBold', 
                  fontSize: 14, 
                  color: selectedPeriod === period ? 'black' : '#666',
                  textTransform: 'capitalize'
                }}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weekly Progress Chart */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'Nunito_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16
          }}>
            This Week's Progress
          </Text>
          
          <View style={{ 
            backgroundColor: '#F8F9FA', 
            borderRadius: 12, 
            padding: 20
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              {weeklyData.map((value, index) => {
                const percentage = (value / 80) * 100; // Assuming 80oz is the goal
                return (
                  <View key={index} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{ 
                      width: 30, 
                      height: 100, 
                      backgroundColor: '#E5E5E5', 
                      borderRadius: 15,
                      position: 'relative',
                      overflow: 'hidden',
                      marginBottom: 8
                    }}>
                      <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${Math.min(percentage, 100)}%`,
                        backgroundColor: getHydrationColor(percentage),
                        borderRadius: 15
                      }} />
                    </View>
                    <Text style={{ 
                      fontFamily: 'Nunito_400Regular', 
                      fontSize: 12, 
                      color: '#666',
                      marginBottom: 4
                    }}>
                      {getDayName(index)}
                    </Text>
                    <Text style={{ 
                      fontFamily: 'Nunito_600SemiBold', 
                      fontSize: 12, 
                      color: 'black'
                    }}>
                      {value}oz
                    </Text>
                  </View>
                );
              })}
            </View>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#E5E5E5'
            }}>
              <Text style={{ 
                fontFamily: 'Nunito_400Regular', 
                fontSize: 14, 
                color: '#666'
              }}>
                Average this week
              </Text>
              <Text style={{ 
                fontFamily: 'Nunito_600SemiBold', 
                fontSize: 16, 
                color: 'black'
              }}>
                {averageHydration}oz {getHydrationEmoji((averageHydration / 80) * 100)}
              </Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'Nunito_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16
          }}>
            Key Metrics
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ 
              flex: 1, 
              backgroundColor: '#F8F9FA', 
              borderRadius: 12, 
              padding: 20,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔥</Text>
              <Text style={{ 
                fontFamily: 'Nunito_700Bold', 
                fontSize: 24, 
                color: 'black',
                marginBottom: 4
              }}>
                {currentStreak}
              </Text>
              <Text style={{ 
                fontFamily: 'Nunito_400Regular', 
                fontSize: 14, 
                color: '#666',
                textAlign: 'center'
              }}>
                Current{'\n'}Streak
              </Text>
            </View>
            
            <View style={{ 
              flex: 1, 
              backgroundColor: '#F8F9FA', 
              borderRadius: 12, 
              padding: 20,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏆</Text>
              <Text style={{ 
                fontFamily: 'Nunito_700Bold', 
                fontSize: 24, 
                color: 'black',
                marginBottom: 4
              }}>
                {bestStreak}
              </Text>
              <Text style={{ 
                fontFamily: 'Nunito_400Regular', 
                fontSize: 14, 
                color: '#666',
                textAlign: 'center'
              }}>
                Best{'\n'}Streak
              </Text>
            </View>
            
            <View style={{ 
              flex: 1, 
              backgroundColor: '#F8F9FA', 
              borderRadius: 12, 
              padding: 20,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
              <Text style={{ 
                fontFamily: 'Nunito_700Bold', 
                fontSize: 24, 
                color: 'black',
                marginBottom: 4
              }}>
                {Math.round((goalDays / totalDays) * 100)}%
              </Text>
              <Text style={{ 
                fontFamily: 'Nunito_400Regular', 
                fontSize: 14, 
                color: '#666',
                textAlign: 'center'
              }}>
                Goal{'\n'}Success
              </Text>
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'Nunito_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16
          }}>
            Achievements
          </Text>
          
          <View style={{ gap: 12 }}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: achievement.earned ? '#F0F8FF' : '#F8F9FA', 
                borderRadius: 12, 
                padding: 16
              }}>
                <Text style={{ 
                  fontSize: 24, 
                  marginRight: 16,
                  opacity: achievement.earned ? 1 : 0.3
                }}>
                  {achievement.icon}
                </Text>
                
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontFamily: 'Nunito_600SemiBold', 
                    fontSize: 16, 
                    color: achievement.earned ? 'black' : '#999',
                    marginBottom: 2
                  }}>
                    {achievement.title}
                  </Text>
                  <Text style={{ 
                    fontFamily: 'Nunito_400Regular', 
                    fontSize: 14, 
                    color: achievement.earned ? '#666' : '#999'
                  }}>
                    {achievement.description}
                  </Text>
                </View>
                
                {achievement.earned && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Insights */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'Nunito_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16
          }}>
            Insights
          </Text>
          
          <View style={{ 
            backgroundColor: '#F8F9FA', 
            borderRadius: 12, 
            padding: 20
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
              <Text style={{ 
                fontFamily: 'Nunito_600SemiBold', 
                fontSize: 16, 
                color: 'black'
              }}>
                You're on fire! 🔥
              </Text>
            </View>
            <Text style={{ 
              fontFamily: 'Nunito_400Regular', 
              fontSize: 14, 
              color: '#666',
              lineHeight: 20
            }}>
              You've met your hydration goal for {currentStreak} days in a row. Keep up the great work! Your best streak is {bestStreak} days - you're getting close to beating it.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 