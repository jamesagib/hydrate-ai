'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, Modal, TextInput, Linking } from 'react-native';
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
import notificationService from '../../lib/notificationService';

export default function SettingsScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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

        // Fetch user profile data
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'jagib07@gmail.com') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

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
              router.replace('/onboarding/welcome');
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

  const handleDeleteAccount = async () => {
    // First confirmation
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShowDeleteModal(true);
          }
        }
      ]
    );
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText === 'DELETE') {
      try {
        // Cancel all notifications for the user
        if (user) {
          await notificationService.cancelUserNotifications(user.id);
        }
        
        // Call the delete-account Edge Function
        const { data, error } = await supabase.functions.invoke('delete-account');
        
        if (error) {
          console.error('Error calling delete-account function:', error);
          Alert.alert('Error', 'Failed to delete account. Please try again.');
          return;
        }
        
        // Clear local storage
        await SecureStore.deleteItemAsync('onboarding_complete');
        await clearOnboardingData();
        
        setShowDeleteModal(false);
        setDeleteConfirmationText('');
        
        Alert.alert(
          'Account Deleted',
          'Your account has been permanently deleted. Thank you for using HydrateAI.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/onboarding/welcome')
            }
          ]
        );
      } catch (error) {
        console.error('Error deleting account:', error);
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    } else {
      Alert.alert('Incorrect Text', 'Please type "DELETE" exactly to confirm account deletion.');
    }
  };



  const handleEditField = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingField) return;

    try {
      const updateData = {};
      updateData[editingField] = editValue;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        return;
      }

      // Update local state
      setProfile(prev => ({ ...prev, [editingField]: editValue }));
      setIsEditModalVisible(false);
      setEditingField(null);
      setEditValue('');
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        return;
      }

      setIsEditModalVisible(false);
      setEditingField(null);
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const getFieldLabel = (field) => {
    if (!field) return '';
    switch (field) {
      case 'name': return 'Name';
      case 'age': return 'Age';
      case 'activity_level': return 'Activity Level';
      case 'climate': return 'Climate';
      case 'timezone': return 'Timezone';
      default: return field;
    }
  };

  const formatTimezoneDisplay = (timezone) => {
    if (!timezone) return 'UTC (default)';
    
    const timezoneMap = {
      'America/New_York': 'Eastern Time (ET)',
      'America/Chicago': 'Central Time (CT)',
      'America/Denver': 'Mountain Time (MT)',
      'America/Los_Angeles': 'Pacific Time (PT)',
      'America/Anchorage': 'Alaska Time (AKT)',
      'Pacific/Honolulu': 'Hawaii Time (HST)',
      'Europe/London': 'London (GMT/BST)',
      'Europe/Paris': 'Paris (CET/CEST)',
      'Europe/Berlin': 'Berlin (CET/CEST)',
      'Asia/Tokyo': 'Tokyo (JST)',
      'Asia/Shanghai': 'Shanghai (CST)',
      'Asia/Kolkata': 'Mumbai (IST)',
      'Australia/Sydney': 'Sydney (AEST/AEDT)',
      'UTC': 'UTC (Universal Time)'
    };
    
    return timezoneMap[timezone] || timezone;
  };

  const getFieldOptions = (field) => {
    switch (field) {
      case 'activity_level':
        return ['low', 'moderate', 'high'];
      case 'climate':
        return ['cold', 'temperate', 'hot'];
      case 'timezone':
        return [
          'America/New_York',
          'America/Chicago', 
          'America/Denver',
          'America/Los_Angeles',
          'America/Anchorage',
          'Pacific/Honolulu',
          'Europe/London',
          'Europe/Paris',
          'Europe/Berlin',
          'Asia/Tokyo',
          'Asia/Shanghai',
          'Asia/Kolkata',
          'Australia/Sydney',
          'UTC'
        ];
      default:
        return null;
    }
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
        </View>
        
        {user && (
          <>
            {/* Profile Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <View style={styles.profileCard}>
                {/* Profile Picture Placeholder */}
                <View style={styles.profilePicture}>
                  <Text style={styles.profileInitial}>
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
                
                {/* Profile Info */}
                <View style={styles.profileInfo}>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Name</Text>
                    <Text style={styles.profileValue}>
                      {profile?.name || 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Age</Text>
                    <Text style={styles.profileValue}>
                      {profile?.age ? `${profile.age} years` : 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Activity Level</Text>
                    <Text style={styles.profileValue}>
                      {profile?.activity_level ? profile.activity_level.charAt(0).toUpperCase() + profile.activity_level.slice(1) : 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Climate</Text>
                    <Text style={styles.profileValue}>
                      {profile?.climate ? profile.climate.charAt(0).toUpperCase() + profile.climate.slice(1) : 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Timezone</Text>
                    <Text style={styles.profileValue}>
                      {formatTimezoneDisplay(profile?.timezone)}
                    </Text>
                  </View>
                  <View style={styles.profileRow}>
                    <Text style={styles.profileLabel}>Email</Text>
                    <Text style={styles.profileValue}>{user.email}</Text>
                  </View>
                </View>
                
                {/* Edit Profile Button */}
                <TouchableOpacity 
                  style={styles.editProfileButton}
                  onPress={() => {
                    setEditingField('profile');
                    setEditValue('');
                    setIsEditModalVisible(true);
                  }}
                >
                  <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hydration Plan Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hydration Plan</Text>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => router.push('/plan-result?from=settings')}
              >
                <Text style={styles.primaryButtonText}>View My Hydration Plan</Text>
              </TouchableOpacity>
            </View>

            {/* Notifications Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <View style={styles.notificationCard}>
                <View style={styles.notificationRow}>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationLabel}>Hydration Reminders</Text>
                    <Text style={styles.notificationDescription}>
                      Get daily reminders based on your hydration plan
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      { backgroundColor: profile?.wants_coaching ? '#4FC3F7' : '#E5E5E5' }
                    ]}
                    onPress={async () => {
                      if (!user) return;
                      
                      const newValue = !profile?.wants_coaching;
                      try {
                        const { error } = await supabase
                          .from('profiles')
                          .update({ wants_coaching: newValue })
                          .eq('user_id', user.id);
                        
                        if (error) {
                          console.error('Error updating coaching preference:', error);
                          Alert.alert('Error', 'Failed to update notification preferences.');
                          return;
                        }
                        
                        setProfile(prev => ({ ...prev, wants_coaching: newValue }));
                        
                        if (newValue) {
                          // Ensure we have permissions and saved token when enabling reminders
                          try {
                            const granted = await notificationService.requestPermissions();
                            if (granted) {
                              await notificationService.savePendingPushToken();
                            }
                          } catch (e) {
                            console.warn('Enabling reminders: failed to register push token', e);
                          }
                          Alert.alert(
                            'Notifications Enabled',
                            'You\'ll now receive hydration reminders based on your plan!'
                          );
                        } else {
                          Alert.alert(
                            'Notifications Disabled',
                            'You\'ve turned off hydration reminders. You can re-enable them anytime.'
                          );
                        }
                      } catch (error) {
                        console.error('Error updating notification preferences:', error);
                        Alert.alert('Error', 'Failed to update notification preferences.');
                      }
                    }}
                  >
                    <View style={[
                      styles.toggleKnob,
                      { 
                        transform: [{ translateX: profile?.wants_coaching ? 20 : 2 }],
                        backgroundColor: profile?.wants_coaching ? 'white' : '#999'
                      }
                    ]} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Support Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Need Help?</Text>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => Linking.openURL('https://x.com/agibjames')}
              >
                <Text style={styles.primaryButtonText}>Contact the founder himself on X!</Text>
                <Text style={styles.primaryButtonSubtext}>@agibjames</Text>
              </TouchableOpacity>
            </View>

            {/* Danger Zone Section */}
            <View style={styles.section}>
              <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
              <View style={styles.dangerZone}>
                <TouchableOpacity 
                  style={styles.logoutButton} 
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteAccountButton} 
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Admin Section (Hidden) */}
            {userEmail === 'jamesmagib@gmail.com' && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.adminButton}
                  onPress={handleResetOnboarding}
                >
                  <Text style={styles.adminButtonText}>Reset Onboarding (DEV)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Medical Disclaimer */}
            <View style={styles.disclaimerSection}>
              <Text style={styles.disclaimerText}>
                This app provides general wellness tips and is not intended to diagnose, treat, or replace medical advice. Always consult a healthcare professional for personalized guidance.
              </Text>
            </View>
          </>
        )}



        {/* Edit Profile Modal */}
        <Modal
          visible={isEditModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingField === 'profile' ? 'Edit Profile' : `Edit ${getFieldLabel(editingField) || 'Field'}`}
              </Text>
              
              {editingField === 'profile' ? (
                // Full profile edit form
                <ScrollView style={styles.profileEditForm}>
                  {/* Name Field */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>Name</Text>
                    <TextInput
                      style={styles.editTextInput}
                      value={profile?.name || ''}
                      onChangeText={(text) => {
                        setProfile(prev => ({ ...prev, name: text }));
                      }}
                      placeholder="Enter your name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Age Field */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>Age</Text>
                    <TextInput
                      style={styles.editTextInput}
                      value={profile?.age?.toString() || ''}
                      onChangeText={(text) => {
                        setProfile(prev => ({ ...prev, age: parseInt(text) || null }));
                      }}
                      placeholder="Enter your age"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Activity Level Field */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>Activity Level</Text>
                    <View style={styles.optionsContainer}>
                      {getFieldOptions('activity_level').map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            profile?.activity_level === option && styles.optionButtonSelected
                          ]}
                          onPress={() => {
                            setProfile(prev => ({ ...prev, activity_level: option }));
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            profile?.activity_level === option && styles.optionTextSelected
                          ]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Climate Field */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>Climate</Text>
                    <View style={styles.optionsContainer}>
                      {getFieldOptions('climate').map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            profile?.climate === option && styles.optionButtonSelected
                          ]}
                          onPress={() => {
                            setProfile(prev => ({ ...prev, climate: option }));
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            profile?.climate === option && styles.optionTextSelected
                          ]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Timezone Field */}
                  <View style={styles.editFieldContainer}>
                    <Text style={styles.editFieldLabel}>Timezone</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setEditingField('timezone')}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {formatTimezoneDisplay(profile?.timezone) || 'Select timezone'}
                      </Text>
                      <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Extra bottom padding to prevent cutoff */}
                  <View style={{ height: 20 }} />
                </ScrollView>
              ) : getFieldOptions(editingField) ? (
                // Dropdown for fields with options
                <ScrollView 
                  style={styles.optionsContainer} 
                  showsVerticalScrollIndicator={true}
                  maximumHeight={200}
                >
                  {getFieldOptions(editingField).map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        editValue === option && styles.optionButtonSelected
                      ]}
                      onPress={() => setEditValue(option)}
                    >
                      <Text style={[
                        styles.optionText,
                        editValue === option && styles.optionTextSelected
                      ]}>
                        {editingField === 'timezone' ? formatTimezoneDisplay(option) : option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                // Text input for other fields
                <TextInput
                  style={styles.textInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder={`Enter ${(getFieldLabel(editingField) || 'value').toLowerCase()}`}
                  placeholderTextColor="#999"
                  keyboardType={editingField === 'age' ? 'numeric' : 'default'}
                  autoFocus
                />
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditModalVisible(false);
                    setEditingField(null);
                    setEditValue('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={editingField === 'profile' ? handleSaveProfile : handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Account Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Final Confirmation
              </Text>
              
              <Text style={styles.deleteWarningText}>
                To confirm deletion, please type "DELETE" in the field below:
              </Text>
              
              <TextInput
                style={styles.textInput}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                placeholder="Type DELETE to confirm"
                placeholderTextColor="#999"
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmationText('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: '#FF4444' }]}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.saveButtonText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header Styles
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: 'black',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: '#666',
  },

  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: 'black',
    marginBottom: 16,
  },
  dangerSectionTitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: '#FF4444',
    marginBottom: 16,
  },

  // Profile Card Styles
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileInitial: {
    fontSize: 32,
    fontFamily: 'Nunito_700Bold',
    color: 'white',
  },
  profileInfo: {
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#333',
  },
  profileValue: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  // Button Styles
  primaryButton: {
    backgroundColor: '#4FC3F7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
  },
  primaryButtonSubtext: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    opacity: 0.9,
    marginTop: 2,
  },
  editProfileButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  editProfileButtonText: {
    color: '#4FC3F7',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
  },

  // Notification Styles
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationContent: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: 'black',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    lineHeight: 18,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  // Danger Zone Styles
  dangerZone: {
    gap: 12,
  },
  dangerButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
  },
  deleteAccountButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#B91C1C',
  },
  deleteAccountButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },

  // Admin Styles
  adminButton: {
    backgroundColor: 'black',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  adminButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
  },

  // Loading Styles
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    marginBottom: 20,
  },
  optionsContainer: {
    marginBottom: 20,
    maxHeight: 200,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionButtonSelected: {
    backgroundColor: '#4FC3F7',
    borderColor: '#4FC3F7',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: 'black',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: 'white',
    fontFamily: 'Nunito_600SemiBold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4FC3F7',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: 'white',
  },
  deleteWarningText: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Profile Edit Form Styles
  profileEditForm: {
    maxHeight: 500,
    marginBottom: 20,
  },
  editFieldContainer: {
    marginBottom: 20,
  },
  editFieldLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    backgroundColor: '#F8F9FA',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  disclaimerSection: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#E65100',
    lineHeight: 20,
    textAlign: 'center',
  },
}); 