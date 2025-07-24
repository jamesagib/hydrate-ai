import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [healthSync, setHealthSync] = React.useState(false);

  const renderSettingItem = ({ icon, title, value, onPress, isSwitch }) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#2196F3" />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#D1D1D1', true: '#90CAF9' }}
          thumbColor={value ? '#2196F3' : '#f4f3f4'}
        />
      ) : (
        <View style={styles.settingRight}>
          <Text style={styles.settingValue}>{value}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
            <Text style={styles.name}>John Doe</Text>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Details</Text>
          {renderSettingItem({
            icon: 'body-outline',
            title: 'Weight',
            value: '160 lbs',
            onPress: () => {},
          })}
          {renderSettingItem({
            icon: 'fitness-outline',
            title: 'Activity Level',
            value: 'Moderate',
            onPress: () => {},
          })}
          {renderSettingItem({
            icon: 'thermometer-outline',
            title: 'Climate',
            value: 'Temperate',
            onPress: () => {},
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {renderSettingItem({
            icon: 'notifications-outline',
            title: 'Notifications',
            value: notifications,
            onPress: () => setNotifications(!notifications),
            isSwitch: true,
          })}
          {renderSettingItem({
            icon: 'fitness',
            title: 'Health App Sync',
            value: healthSync,
            onPress: () => setHealthSync(!healthSync),
            isSwitch: true,
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          {renderSettingItem({
            icon: 'star-outline',
            title: 'Rate App',
            value: '',
            onPress: () => {},
          })}
          {renderSettingItem({
            icon: 'share-outline',
            title: 'Share with Friends',
            value: '',
            onPress: () => {},
          })}
          {renderSettingItem({
            icon: 'document-text-outline',
            title: 'Privacy Policy',
            value: '',
            onPress: () => {},
          })}
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
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
  },
  editButtonText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
}); 