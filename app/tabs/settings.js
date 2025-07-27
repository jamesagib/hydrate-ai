'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, Modal, TextInput } from 'react-native';
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
  const [profile, setProfile] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

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

  const getFieldLabel = (field) => {
    if (!field) return '';
    switch (field) {
      case 'name': return 'Name';
      case 'age': return 'Age';
      case 'activity_level': return 'Activity Level';
      case 'climate': return 'Climate';
      default: return field;
    }
  };

  const getFieldOptions = (field) => {
    switch (field) {
      case 'activity_level':
        return ['low', 'moderate', 'high'];
      case 'climate':
        return ['cold', 'temperate', 'hot'];
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ 
                fontFamily: 'Nunito_600SemiBold', 
                fontSize: 18, 
                color: 'black'
              }}>
                Profile
              </Text>
              <TouchableOpacity
                onPress={() => handleEditField('name', profile?.name)}
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ 
                  fontFamily: 'Nunito_600SemiBold', 
                  fontSize: 14, 
                  color: '#4FC3F7'
                }}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.profileSection}>
              <TouchableOpacity 
                style={styles.profileInfo}
                onPress={() => handleEditField('name', profile?.name)}
              >
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>
                  {profile?.name || 'Not provided'}
                </Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileInfo}
                onPress={() => handleEditField('age', profile?.age?.toString())}
              >
                <Text style={styles.label}>Age:</Text>
                <Text style={styles.value}>
                  {profile?.age ? `${profile.age} years` : 'Not provided'}
                </Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileInfo}
                onPress={() => handleEditField('activity_level', profile?.activity_level)}
              >
                <Text style={styles.label}>Activity Level:</Text>
                <Text style={styles.value}>
                  {profile?.activity_level ? profile.activity_level.charAt(0).toUpperCase() + profile.activity_level.slice(1) : 'Not provided'}
                </Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileInfo}
                onPress={() => handleEditField('climate', profile?.climate)}
              >
                <Text style={styles.label}>Climate:</Text>
                <Text style={styles.value}>
                  {profile?.climate ? profile.climate.charAt(0).toUpperCase() + profile.climate.slice(1) : 'Not provided'}
                </Text>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user.email}</Text>
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
                Edit {getFieldLabel(editingField) || 'Field'}
              </Text>
              
              {getFieldOptions(editingField) ? (
                // Dropdown for fields with options
                <View style={styles.optionsContainer}>
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
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
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
  editIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
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
  },
  optionButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionButtonSelected: {
    backgroundColor: '#4FC3F7',
    borderColor: '#4FC3F7',
  },
  optionText: {
    fontSize: 16,
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
}); 