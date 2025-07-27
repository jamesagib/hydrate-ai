'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function StatsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Real data from database
  const [periodData, setPeriodData] = useState([0, 0, 0, 0, 0, 0, 0]); // Dynamic based on period
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [averageHydration, setAverageHydration] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [goalDays, setGoalDays] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(80);

  // Fetch user stats data
  useEffect(() => {
    const fetchStatsData = async () => {
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

        // Fetch user's hydration plan for daily goal
        const { data: planData } = await supabase
          .from('hydration_plans')
          .select('daily_goal')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let goal = 80; // default
        if (planData && planData.daily_goal) {
          const goalMatch = planData.daily_goal.match(/(\d+)/);
          if (goalMatch) {
            goal = parseInt(goalMatch[1]);
          }
        }
        setDailyGoal(goal);

        // Fetch period data based on selected period
        const periodStart = new Date();
        let dataPoints = 7;
        
        switch (selectedPeriod) {
          case 'week':
            periodStart.setDate(periodStart.getDate() - 7);
            dataPoints = 7;
            break;
          case 'month':
            periodStart.setDate(periodStart.getDate() - 30);
            dataPoints = 30;
            break;
          case 'year':
            periodStart.setFullYear(periodStart.getFullYear() - 1);
            dataPoints = 12; // Monthly data points
            break;
        }
        
        const { data: periodCheckins } = await supabase
          .from('hydration_checkins')
          .select('value, created_at')
          .eq('user_id', user.id)
          .gte('created_at', periodStart.toISOString())
          .order('created_at', { ascending: true });

        // Process period data
        if (periodCheckins) {
          const totals = new Array(dataPoints).fill(0);
          const today = new Date();
          
          periodCheckins.forEach(checkin => {
            const checkinDate = new Date(checkin.created_at);
            let index;
            
            if (selectedPeriod === 'year') {
              // Monthly data for year view
              const monthDiff = (today.getFullYear() - checkinDate.getFullYear()) * 12 + 
                               (today.getMonth() - checkinDate.getMonth());
              index = 11 - monthDiff;
            } else {
              // Daily data for week/month view
              const daysAgo = Math.floor((today - checkinDate) / (1000 * 60 * 60 * 24));
              index = dataPoints - 1 - daysAgo;
            }
            
            if (index >= 0 && index < dataPoints) {
              totals[index] += checkin.value || 0;
            }
          });
          
          setPeriodData(totals);
        }

        // Fetch streak data
        const { data: streakData } = await supabase
          .from('streaks')
          .select('current_streak, longest_streak, goal_days, total_days')
          .eq('user_id', user.id)
          .single();

        if (streakData) {
          setCurrentStreak(streakData.current_streak || 0);
          setBestStreak(streakData.longest_streak || 0);
          setGoalDays(streakData.goal_days || 0);
          setTotalDays(streakData.total_days || 0);
        }

        // Calculate average hydration
        if (periodData.some(val => val > 0)) {
          const total = periodData.reduce((sum, val) => sum + val, 0);
          const nonZeroDays = periodData.filter(val => val > 0).length;
          const avg = nonZeroDays > 0 ? Math.round((total / dailyGoal) * 100) : 0;
          setAverageHydration(avg);
        }

        // Calculate achievements
        calculateAchievements();

      } catch (error) {
        console.error('Error fetching stats data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatsData();
  }, [selectedPeriod]);

  const getPeriodLabel = (index) => {
    if (selectedPeriod === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days[index];
    } else if (selectedPeriod === 'month') {
      const today = new Date();
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - index));
      return date.getDate().toString();
    } else if (selectedPeriod === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const today = new Date();
      const monthIndex = (today.getMonth() - 11 + index + 12) % 12;
      return months[monthIndex];
    }
    return '';
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

  // Calculate achievements based on user data
  const calculateAchievements = (userData) => {
    const newAchievements = achievements.map(achievement => {
      let earned = false;
      
      switch (achievement.criteria.type) {
        case 'streak':
          earned = currentStreak >= achievement.criteria.value;
          break;
        case 'goal_streak':
          // This would need goal streak data from database
          earned = false; // Placeholder
          break;
        case 'total_days':
          earned = totalDays >= achievement.criteria.value;
          break;
        case 'goal_percentage':
          const goalPercentage = totalDays > 0 ? (goalDays / totalDays) * 100 : 0;
          earned = goalPercentage >= achievement.criteria.value;
          break;
        case 'early_logging':
          // This would need early logging data
          earned = false; // Placeholder
          break;
      }
      
      return { ...achievement, earned };
    });
    
    setAchievements(newAchievements);
  };

  // Generate insights based on user data
  const generateInsights = () => {
    const insights = [];
    
    if (currentStreak > 0) {
      insights.push({
        type: 'positive',
        icon: '🔥',
        title: 'Great Streak!',
        description: `You've been tracking for ${currentStreak} days in a row. Keep it up!`
      });
    }
    
    if (averageHydration >= 80) {
      insights.push({
        type: 'positive',
        icon: '💧',
        title: 'Well Hydrated',
        description: 'Your average hydration is excellent this week!'
      });
    } else if (averageHydration < 60) {
      insights.push({
        type: 'improvement',
        icon: '🐫',
        title: 'Need More Water',
        description: 'Try to increase your daily water intake.'
      });
    }
    
    if (totalDays > 0 && (goalDays / totalDays) >= 0.8) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        title: 'Goal Crusher',
        description: 'You\'re meeting your goals consistently!'
      });
    }
    
    return insights;
  };

  const [achievements, setAchievements] = useState([
    { id: 1, title: 'First Week', description: 'Complete 7 days', icon: '🏆', earned: false, criteria: { type: 'streak', value: 7 } },
    { id: 2, title: 'Hydration Hero', description: 'Meet goal 5 days in a row', icon: '🔥', earned: false, criteria: { type: 'goal_streak', value: 5 } },
    { id: 3, title: 'Perfect Week', description: 'Meet goal every day for a week', icon: '⭐', earned: false, criteria: { type: 'goal_streak', value: 7 } },
    { id: 4, title: 'Consistency King', description: '30 days of tracking', icon: '👑', earned: false, criteria: { type: 'total_days', value: 30 } },
    { id: 5, title: 'Early Bird', description: 'Log hydration before 9 AM', icon: '🌅', earned: false, criteria: { type: 'early_logging', value: 1 } },
    { id: 6, title: 'Hydration Master', description: 'Meet goal 90% of the time', icon: '💎', earned: false, criteria: { type: 'goal_percentage', value: 90 } },
  ]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{ marginTop: 16, fontSize: 16, color: 'black', fontFamily: 'Nunito_400Regular' }}>
          Loading your stats...
        </Text>
      </SafeAreaView>
    );
  }

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

        {/* Period Progress Chart */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text style={{ 
            fontFamily: 'Nunito_600SemiBold', 
            fontSize: 18, 
            color: 'black',
            marginBottom: 16
          }}>
            {selectedPeriod === 'week' ? "This Week's Progress" : 
             selectedPeriod === 'month' ? "This Month's Progress" : 
             "This Year's Progress"}
          </Text>
          
          <View style={{ 
            backgroundColor: '#F8F9FA', 
            borderRadius: 12, 
            padding: 20
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, minWidth: '100%' }}>
                {periodData.map((value, index) => {
                  const percentage = (value / dailyGoal) * 100;
                  const barWidth = selectedPeriod === 'week' ? 30 : selectedPeriod === 'month' ? 8 : 20;
                  const barHeight = selectedPeriod === 'week' ? 100 : selectedPeriod === 'month' ? 80 : 100;
                  
                  return (
                    <View key={index} style={{ alignItems: 'center', marginRight: selectedPeriod === 'month' ? 4 : 8 }}>
                      <View style={{ 
                        width: barWidth, 
                        height: barHeight, 
                        backgroundColor: '#E5E5E5', 
                        borderRadius: selectedPeriod === 'week' ? 15 : 4,
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
                          borderRadius: selectedPeriod === 'week' ? 15 : 4
                        }} />
                      </View>
                      <Text style={{ 
                        fontFamily: 'Nunito_400Regular', 
                        fontSize: selectedPeriod === 'month' ? 10 : 12, 
                        color: '#666',
                        marginBottom: 4
                      }}>
                        {getPeriodLabel(index)}
                      </Text>
                      <Text style={{ 
                        fontFamily: 'Nunito_600SemiBold', 
                        fontSize: selectedPeriod === 'month' ? 10 : 12, 
                        color: 'black'
                      }}>
                        {value}oz
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            
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
                Average this {selectedPeriod}
              </Text>
              <Text style={{ 
                fontFamily: 'Nunito_600SemiBold', 
                fontSize: 16, 
                color: 'black'
              }}>
                {averageHydration}oz {getHydrationEmoji((averageHydration / dailyGoal) * 100)}
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
                {totalDays > 0 ? Math.round((goalDays / totalDays) * 100) : 0}%
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
          
          <View style={{ gap: 12 }}>
            {generateInsights().map((insight, index) => (
              <View key={index} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: insight.type === 'positive' ? '#F0F8FF' : '#FFF8F0', 
                borderRadius: 12, 
                padding: 16
              }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>
                  {insight.icon}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontFamily: 'Nunito_600SemiBold', 
                    fontSize: 16, 
                    color: 'black',
                    marginBottom: 2
                  }}>
                    {insight.title}
                  </Text>
                  <Text style={{ 
                    fontFamily: 'Nunito_400Regular', 
                    fontSize: 14, 
                    color: '#666'
                  }}>
                    {insight.description}
                  </Text>
                </View>
              </View>
            ))}
            
            {generateInsights().length === 0 && (
              <View style={{ 
                backgroundColor: '#F8F9FA', 
                borderRadius: 12, 
                padding: 20,
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
                <Text style={{ 
                  fontFamily: 'Nunito_600SemiBold', 
                  fontSize: 16, 
                  color: 'black',
                  marginBottom: 4
                }}>
                  No insights yet
                </Text>
                <Text style={{ 
                  fontFamily: 'Nunito_400Regular', 
                  fontSize: 14, 
                  color: '#666',
                  textAlign: 'center'
                }}>
                  Start tracking your hydration to get personalized insights
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 