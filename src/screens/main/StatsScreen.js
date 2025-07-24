import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Hydration Stats</Text>
          <Text style={styles.subtitle}>Keep up the good work!</Text>
        </View>

        <View style={styles.streakCard}>
          <Ionicons name="flame" size={32} color="#FF9800" />
          <Text style={styles.streakCount}>7</Text>
          <Text style={styles.streakText}>Day Streak</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Weekly Goal</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>64 oz</Text>
            <Text style={styles.statLabel}>Daily Average</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>21</Text>
            <Text style={styles.statLabel}>Perfect Days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.5</Text>
            <Text style={styles.statLabel}>Avg. Check-ins</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {[1, 2, 3, 4, 5].map((day) => (
            <View key={day} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <Text style={styles.activityDay}>Today</Text>
                <Text style={styles.activityProgress}>72 oz / 80 oz</Text>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityPercentage}>90%</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  streakCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  streakCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F57C00',
    marginVertical: 8,
  },
  streakText: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  statCard: {
    width: '50%',
    padding: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activityLeft: {
    flex: 1,
  },
  activityDay: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  activityProgress: {
    fontSize: 14,
    color: '#666',
  },
  activityRight: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activityPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
}); 