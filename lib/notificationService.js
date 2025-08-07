import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.isScheduling = false; // Add scheduling lock
  }

  // Request notification permissions and get push token
  async requestPermissions() {
    console.log('🔔 Requesting notification permissions...');
    
    if (!Device.isDevice) {
      console.log('❌ Notifications not available on simulator');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 Current notification status:', existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('🔐 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📱 New notification status:', status);
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions not granted');
        return false;
      }

      // Get push token for remote notifications
      console.log('🔑 Getting Expo push token...');
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'b4f22400-7632-4de3-bcd1-76119d301f5d',
      });
      
      console.log('✅ Push token received:', token.data);
      
      // Save push token to user's profile if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('👤 User authenticated, saving push token to profile...');
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token.data })
          .eq('user_id', user.id);
        
        if (error) {
          console.error('❌ Error saving push token:', error);
        } else {
          console.log('✅ Push token saved to profile for user:', user.id);
        }
      } else {
        // If no authenticated user, save token locally for later use
        console.log('👤 No authenticated user, saving push token locally...');
        await SecureStore.setItemAsync('pending_push_token', token.data);
        console.log('✅ Push token saved locally for later use');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Save pending push token to user profile
  async savePendingPushToken() {
    console.log('🔄 Attempting to save pending push token...');
    try {
      const pendingToken = await SecureStore.getItemAsync('pending_push_token');
      if (!pendingToken) {
        console.log('❌ No pending push token found');
        return false;
      }
      console.log('✅ Found pending push token:', pendingToken.substring(0, 30) + '...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        return false;
      }
      console.log('👤 Found authenticated user:', user.id);

      const { error } = await supabase
        .from('profiles')
        .update({ push_token: pendingToken })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ Error saving pending push token:', error);
        return false;
      } else {
        console.log('✅ Pending push token saved to profile for user:', user.id);
        // Clear the pending token
        await SecureStore.deleteItemAsync('pending_push_token');
        console.log('🗑️ Pending token cleared from local storage');
        return true;
      }
    } catch (error) {
      console.error('Error saving pending push token:', error);
      return false;
    }
  }

  // Get user profile for preferences
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, wants_coaching, climate, activity_level, push_token')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Enable push notifications for user (no local scheduling needed)
  async scheduleNotifications(userId) {
    console.log('Push notifications enabled for user:', userId);
    
    // No local scheduling needed - push notifications are handled by server
    // The server will check user preferences and send notifications at the right times
    return true;
  }



  // Cancel all local notifications for user (emergency cleanup)
  async cancelUserNotifications(userId) {
    console.log('Cancelling all local notifications for user:', userId);
    
    try {
      // Cancel all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      let cancelledCount = 0;
      
      for (const notification of scheduledNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        cancelledCount++;
      }
      
      console.log(`Cancelled ${cancelledCount} local notifications for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error cancelling local notifications:', error);
      return false;
    }
  }



  // Handle notification response (when user taps notification)
  handleNotificationResponse(actionIdentifier, data) {
    console.log('Handling notification response:', actionIdentifier, data);
    
    // You can add custom logic here based on the notification type
    if (data.type === 'hydration_reminder') {
      console.log('Hydration reminder tapped - user should log water intake');
      // You could navigate to a logging screen or trigger other actions
    }
  }

  // Update user's notification preferences
  async updateNotificationPreferences(userId, wantsCoaching) {
    try {
      console.log('Updating notification preferences for user:', userId, 'wantsCoaching:', wantsCoaching);
      
      const { error } = await supabase
        .from('profiles')
        .update({ wants_coaching: wantsCoaching })
        .eq('user_id', userId);

      if (error) throw error;

      // For push notifications, no local scheduling needed
      if (wantsCoaching) {
        console.log('User wants coaching - push notifications will be sent by server');
      } else {
        console.log('User does not want coaching - push notifications disabled');
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 