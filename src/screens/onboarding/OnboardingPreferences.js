import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CLIMATE_OPTIONS = [
  {
    id: 'cold',
    title: 'Cold',
    icon: 'snow-outline',
  },
  {
    id: 'temperate',
    title: 'Temperate',
    icon: 'partly-sunny-outline',
  },
  {
    id: 'hot',
    title: 'Hot',
    icon: 'sunny-outline',
  },
];

const REMINDER_OPTIONS = [
  {
    id: 'yes',
    title: 'Yes, remind me',
    description: 'Get daily hydration coaching',
    icon: 'notifications-outline',
  },
  {
    id: 'no',
    title: 'No, thanks',
    description: "I'll track on my own",
    icon: 'notifications-off-outline',
  },
];

export default function OnboardingPreferences({ navigation, route }) {
  const [climate, setClimate] = useState(null);
  const [wantsReminders, setWantsReminders] = useState(null);
  const { name, age, weight, height, activityLevel } = route.params;

  const handleFinish = () => {
    if (climate && wantsReminders !== null) {
      // Here we would typically save all user data
      // For now, just navigate to main app
      navigation.navigate('MainApp', {
        userData: {
          name,
          age,
          weight,
          height,
          activityLevel,
          climate,
          wantsReminders,
        },
      });
    }
  };

  const isValid = climate && wantsReminders !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Almost Done!</Text>
          <Text style={styles.subtitle}>
            Just a few more details to personalize your experience
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your typical climate</Text>
          <View style={styles.climateOptions}>
            {CLIMATE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.climateOption,
                  climate === option.id && styles.selectedOption,
                ]}
                onPress={() => setClimate(option.id)}
              >
                <Ionicons
                  name={option.icon}
                  size={32}
                  color={climate === option.id ? '#fff' : '#2196F3'}
                />
                <Text
                  style={[
                    styles.climateText,
                    climate === option.id && styles.selectedText,
                  ]}
                >
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Would you like reminders?</Text>
          <View style={styles.reminderOptions}>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.reminderOption,
                  wantsReminders === (option.id === 'yes') && styles.selectedOption,
                ]}
                onPress={() => setWantsReminders(option.id === 'yes')}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={wantsReminders === (option.id === 'yes') ? '#fff' : '#2196F3'}
                />
                <View style={styles.reminderText}>
                  <Text
                    style={[
                      styles.reminderTitle,
                      wantsReminders === (option.id === 'yes') && styles.selectedText,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      styles.reminderDescription,
                      wantsReminders === (option.id === 'yes') && styles.selectedText,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  climateOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  climateOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 8,
  },
  climateText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  reminderOptions: {
    gap: 16,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 16,
  },
  reminderText: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  reminderDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedOption: {
    backgroundColor: '#2196F3',
  },
  selectedText: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 