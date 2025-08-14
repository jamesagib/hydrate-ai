'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Modal, TouchableOpacity, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useUser } from 'expo-superwall';
import notificationService from '../lib/notificationService';
import { loadOnboardingData } from '../lib/onboardingStorage';

export default function SplashScreen({ fontsLoaded, onAppInitialized }) {
  const [loading, setLoading] = useState(true);
  const [showUhOh, setShowUhOh] = useState(false);
  
  // Add error handling for Superwall hook
  let subscriptionStatus = null;
  try {
    const { subscriptionStatus: status } = useUser();
    subscriptionStatus = status;
  } catch (error) {
    console.error('Error getting Superwall subscription status:', error);
    // Continue with null subscription status
  }

  useEffect(() => {
    if (!fontsLoaded) return;
    
    // Safety timeout: if we haven't routed within 10s, show fallback modal
    const timeout = setTimeout(() => {
      if (loading) setShowUhOh(true);
    }, 10000);

    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Initialize Supabase auth session
        await supabase.auth.getSession();
        
        // Check onboarding state with error handling
        let onboarding = null;
        let onboardingData = null;
        
        try {
          onboarding = await SecureStore.getItemAsync('onboarding_complete');
          onboardingData = await loadOnboardingData();
        } catch (error) {
          console.error('Error loading onboarding data:', error);
          // Continue with null values
        }
        
        // If onboarding_complete flag exists but no actual onboarding data, 
        // this might be a corrupted state from an update - reset it
        if (onboarding === 'true' && !onboardingData) {
          console.log('Detected corrupted onboarding state, resetting...');
          try {
            await SecureStore.deleteItemAsync('onboarding_complete');
          } catch (error) {
            console.error('Error resetting onboarding state:', error);
          }
        }
        
        // Check authentication state and restore session if needed
        let { data: { session } } = await supabase.auth.getSession();
        
        // If no session, try to restore from stored tokens
        if (!session) {
          const accessToken = await SecureStore.getItemAsync('supabase_session');
          const refreshToken = await SecureStore.getItemAsync('supabase_refresh_token');
          
          if (accessToken && refreshToken) {
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (data.session && !error) {
                session = data.session;
                // Update stored tokens
                await SecureStore.setItemAsync('supabase_session', data.session.access_token);
                await SecureStore.setItemAsync('supabase_refresh_token', data.session.refresh_token);
              } else {
                // Clear invalid tokens
                await SecureStore.deleteItemAsync('supabase_session');
                await SecureStore.deleteItemAsync('supabase_refresh_token');
              }
            } catch (error) {
              // Clear invalid tokens
              await SecureStore.deleteItemAsync('supabase_session');
              await SecureStore.deleteItemAsync('supabase_refresh_token');
            }
          }
        }
        
        // Check if user has a profile in database
        let userProfile = null;
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          userProfile = profile;
        }
        
        // NEW FAST LOGIC FLOW
        if (!session?.user) {
          // NO ACCOUNT - Check onboarding state
          // Re-check onboarding state after potential reset
          const finalOnboardingState = await SecureStore.getItemAsync('onboarding_complete');
          
          if (!finalOnboardingState || finalOnboardingState !== 'true') {
            // No onboarding data or incomplete - go to welcome
            router.replace('/onboarding/welcome');
          } else {
            // Onboarding complete but no account - go to create account
            router.replace('/auth');
          }
        } else {
          // HAS ACCOUNT - Check subscription with error handling
          let hasActiveOrTrialSuperwall = false;
          let hasDatabaseSubscription = false;
          
          try {
            // Superwall is source of truth for trial; allow 'trial'/'trialing' to unlock during trial period
            hasActiveOrTrialSuperwall = subscriptionStatus?.status === 'active' || 
                                        subscriptionStatus?.status === 'ACTIVE' ||
                                        subscriptionStatus?.status === 'trialing' || 
                                        subscriptionStatus?.status === 'TRIALING' ||
                                        subscriptionStatus?.status === 'trial' || 
                                        subscriptionStatus?.status === 'TRIAL';
          } catch (error) {
            console.error('Error checking Superwall subscription status:', error);
          }
          
          try {
            // Also check database subscription status as fallback (for TestFlight sandbox issues)
            hasDatabaseSubscription = userProfile?.subscription_status === 'active' || 
                                    userProfile?.subscription_status === 'ACTIVE';
          } catch (error) {
            console.error('Error checking database subscription status:', error);
          }
          
          // Only allow home when subscription is active (DB) or trial/active via Superwall; otherwise show paywall
          let destination = (hasActiveOrTrialSuperwall || hasDatabaseSubscription)
            ? '/tabs/home'
            : '/plan-result?showPaywall=true';

          // After auth/subscription ready, honor initial quick action if any
          try {
            const QuickActions = await import('expo-quick-actions');
            const initial = await QuickActions.default.getInitialActionAsync?.();
            if (initial) {
              const rawId = initial?.id || '';
              const actionId = rawId.split('.').pop();
              const href = initial?.params?.href || initial?.userInfo?.href || initial?.href || null;
              if (initial.id === 'log-water') {
                // Only allow scan if subscription/trial is active
                if (hasActiveOrTrialSuperwall || hasDatabaseSubscription) {
                  destination = href || '/tabs/home?scan=1';
                }
              } else if (actionId === 'stats') {
                destination = href || '/tabs/stats';
              } else if (actionId === 'settings') {
                destination = href || '/tabs/settings';
              }
            }
          } catch {}

          // Avoid timing race with router setup on cold start
          setTimeout(() => { try { router.replace(destination); } catch {} }, 0);
          setTimeout(() => { try { router.replace(destination); } catch {} }, 1200);
        }
        
      } catch (error) {
        // On error, go to welcome screen
        router.replace('/onboarding/welcome');
      } finally {
        clearTimeout(timeout);
        setLoading(false);
        if (onAppInitialized) {
          onAppInitialized();
        }
      }
    };

    // Start immediately when fonts are loaded
    initializeApp();
    
    return () => clearTimeout(timeout);
    
  }, [fontsLoaded, subscriptionStatus]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync('supabase_session');
      await SecureStore.deleteItemAsync('supabase_refresh_token');
      router.replace('/onboarding/welcome');
    } catch (e) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setShowUhOh(false);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 30, color: 'black' }}>Water AI</Text>

        <Modal visible={showUhOh} transparent animationType="fade" onRequestClose={() => setShowUhOh(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Uh oh!</Text>
              <Text style={styles.modalText}>Something took too long. You can logout or contact the founder on X.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openURL('https://x.com/agibjames').catch(() => {})}>
                  <Text style={styles.primaryButtonText}>Contact on X</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 30 }}>Water AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFEB',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  // Reuse Settings button styles
  primaryButton: {
    backgroundColor: '#4FC3F7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: 'black',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
}); 