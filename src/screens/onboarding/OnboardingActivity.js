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

const ACTIVITY_LEVELS = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    description: 'Little to no regular exercise',
    icon: 'tv-outline',
  },
  {
    id: 'light',
    title: 'Lightly Active',
    description: 'Light exercise 1-3 days/week',
    icon: 'walk-outline',
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
    icon: 'bicycle-outline',
  },
  {
    id: 'very',
    title: 'Very Active',
    description: 'Hard exercise 6-7 days/week',
    icon: 'fitness-outline',
  },
  {
    id: 'extra',
    title: 'Extra Active',
    description: 'Hard exercise & physical job',
    icon: 'barbell-outline',
  },
];

export default function OnboardingActivity({ navigation, route }) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const { name, age, weight, height } = route.params;

  const handleNext = () => {
    if (selectedActivity) {
      navigation.navigate('OnboardingPreferences', {
        name,
        age,
        weight,
        height,
        activityLevel: selectedActivity,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Activity Level</Text>
          <Text style={styles.subtitle}>
            Select your typical activity level
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {ACTIVITY_LEVELS.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={[
                styles.activityOption,
                selectedActivity === activity.id && styles.selectedOption,
              ]}
              onPress={() => setSelectedActivity(activity.id)}
            >
              <Ionicons
                name={activity.icon}
                size={24}
                color={selectedActivity === activity.id ? '#fff' : '#2196F3'}
              />
              <View style={styles.activityText}>
                <Text
                  style={[
                    styles.activityTitle,
                    selectedActivity === activity.id && styles.selectedText,
                  ]}
                >
                  {activity.title}
                </Text>
                <Text
                  style={[
                    styles.activityDescription,
                    selectedActivity === activity.id && styles.selectedText,
                  ]}
                >
                  {activity.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, !selectedActivity && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={!selectedActivity}
      >
        <Text style={styles.buttonText}>Next</Text>
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
  optionsContainer: {
    gap: 16,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 16,
  },
  selectedOption: {
    backgroundColor: '#2196F3',
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
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