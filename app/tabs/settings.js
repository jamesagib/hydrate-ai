'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../lib/supabase';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { clearOnboardingData } from '../../lib/onboardingStorage';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setUserEmail(user?.email || null);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              await SecureStore.deleteItemAsync('supabase_session');
              await SecureStore.deleteItemAsync('supabase_refresh_token');
              router.replace('/auth');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await SecureStore.deleteItemAsync('onboarding_complete');
    await clearOnboardingData();
    await supabase.auth.signOut();
    Alert.alert('Onboarding reset', 'Restart the app to begin onboarding again.');
    router.replace('/');
  };

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header - matching stats page style */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
          <Text style={{ 
            fontFamily: 'Nunito_700Bold', 
            fontSize: 28, 
            color: 'black',
            marginBottom: 4
          }}>
            Settings
          </Text>
          <Text style={{ 
            fontFamily: 'Nunito_400Regular', 
            fontSize: 16, 
            color: '#666'
          }}>
            Manage your account and preferences
          </Text>
        </View>
        
        {user && (
          <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
            <Text style={{ 
              fontFamily: 'Nunito_600SemiBold', 
              fontSize: 18, 
              color: 'black',
              marginBottom: 16
            }}>
              Profile
            </Text>
            <View style={styles.profileSection}>
              <View style={styles.profileInfo}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>
                  {user.user_metadata?.full_name || user.user_metadata?.name || 'Not provided'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.label}>Provider:</Text>
                <Text style={styles.value}>
                  {user.app_metadata?.provider || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        {userEmail === 'jamesmagib@gmail.com' && (
          <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
            <TouchableOpacity
              style={{ backgroundColor: 'black', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center' }}
              onPress={handleResetOnboarding}
            >
              <Text style={{ color: 'white', fontSize: 18, fontFamily: 'Nunito_600SemiBold' }}>Reset Onboarding (DEV)</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  label: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: 'black',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
  },
}); 