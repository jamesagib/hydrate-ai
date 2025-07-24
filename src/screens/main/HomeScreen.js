import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [sliderValue, setSliderValue] = useState(0.5);
  const sliderPosition = new Animated.Value(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      const newValue = Math.max(0, Math.min(1, gesture.moveX / 300));
      setSliderValue(newValue);
    },
  });

  const getHydrationEmoji = () => {
    if (sliderValue < 0.3) return '🐫';
    if (sliderValue < 0.7) return '💧';
    return '🌊';
  };

  const getHydrationText = () => {
    if (sliderValue < 0.3) return 'Dry';
    if (sliderValue < 0.7) return 'Hydrated';
    return 'Very Hydrated';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning!</Text>
        <Text style={styles.question}>How hydrated do you feel?</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.emoji}>{getHydrationEmoji()}</Text>
        <View 
          style={styles.slider}
          {...panResponder.panHandlers}
        >
          <View style={styles.sliderTrack} />
          <Animated.View 
            style={[
              styles.sliderThumb,
              {
                left: `${sliderValue * 100}%`,
                transform: [{ translateX: -15 }],
              },
            ]} 
          />
        </View>
        <Text style={styles.hydrationText}>{getHydrationText()}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="water" size={24} color="#2196F3" />
          <Text style={styles.statTitle}>Today's Goal</Text>
          <Text style={styles.statValue}>80 oz</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#2196F3" />
          <Text style={styles.statTitle}>Next Check-in</Text>
          <Text style={styles.statValue}>2:00 PM</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  question: {
    fontSize: 18,
    color: '#666',
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  slider: {
    width: 300,
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2196F3',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  hydrationText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    margin: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
}); 