import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
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

  // Request notification permissions
  async requestPermissions() {
    if (!Device.isDevice) {
      console.log('Notifications not available on simulator');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Get push token for remote notifications (if needed later)
      if (Platform.OS === 'ios') {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PROJECT_ID,
        });
        console.log('Push token:', token.data);
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Get user's hydration plan logging times
  async getUserHydrationPlan(userId) {
    try {
      const { data, error } = await supabase
        .from('hydration_plans')
        .select('suggested_logging_times, daily_goal')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching hydration plan:', error);
      return null;
    }
  }

  // Get user profile for name and preferences
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, wants_coaching, climate, activity_level')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // List all scheduled notifications (for debugging)
  async listAllScheduledNotifications() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('All scheduled notifications:', scheduledNotifications.map(n => ({
        id: n.identifier,
        title: n.content.title,
        userId: n.content.data?.userId,
        type: n.content.data?.type,
        trigger: n.trigger
      })));
      return scheduledNotifications;
    } catch (error) {
      console.error('Error listing scheduled notifications:', error);
      return [];
    }
  }

  // Get count of scheduled notifications for a user
  async getScheduledNotificationCount(userId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      return scheduledNotifications.filter(notification => 
        notification.content.data?.userId === userId
      ).length;
    } catch (error) {
      console.error('Error getting scheduled notification count:', error);
      return 0;
    }
  }

  // Check if user already has scheduled notifications
  async hasScheduledNotifications(userId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      return scheduledNotifications.some(notification => 
        notification.content.data?.userId === userId
      );
    } catch (error) {
      console.error('Error checking scheduled notifications:', error);
      return false;
    }
  }

  // Schedule notifications based on hydration plan
  async scheduleNotifications(userId) {
    // Prevent multiple simultaneous scheduling operations
    if (this.isScheduling) {
      console.log('Notification scheduling already in progress, skipping...');
      return false;
    }

    this.isScheduling = true;
    
    try {
      console.log('Starting notification scheduling for user:', userId);
      
      // Get user's hydration plan and profile
      const [hydrationPlan, userProfile] = await Promise.all([
        this.getUserHydrationPlan(userId),
        this.getUserProfile(userId)
      ]);

      if (!hydrationPlan || !userProfile) {
        console.log('No hydration plan or profile found for user:', userId);
        return false;
      }

      // Check if user wants coaching
      if (!userProfile.wants_coaching) {
        console.log('User does not want coaching notifications');
        return false;
      }

      // Cancel existing notifications for this user
      await this.cancelUserNotifications(userId);

      const { suggested_logging_times } = hydrationPlan;
      
      if (!suggested_logging_times || !Array.isArray(suggested_logging_times)) {
        console.log('No suggested logging times found');
        return false;
      }

      // Schedule notifications for each logging time
      const scheduledNotifications = [];
      
      for (const timeSlot of suggested_logging_times) {
        const notificationId = await this.scheduleNotificationForTimeSlot(
          userId,
          timeSlot,
          userProfile,
          hydrationPlan
        );
        
        if (notificationId) {
          scheduledNotifications.push(notificationId);
        }
      }

      // Schedule additional AI check-ins between logging times
      await this.scheduleAICheckins(userId, suggested_logging_times, userProfile);

      console.log(`Successfully scheduled ${scheduledNotifications.length} notifications for user:`, userId);
      return true;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      return false;
    } finally {
      this.isScheduling = false; // Release the lock
    }
  }

  // Schedule notification for a specific time slot
  async scheduleNotificationForTimeSlot(userId, timeSlot, userProfile, hydrationPlan) {
    try {
      const { time, oz, note } = timeSlot;
      
      // Parse time (e.g., "7:00 AM" or "08:00")
      const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!timeParts) {
        console.log('Invalid time format:', time);
        return null;
      }

      let hour = parseInt(timeParts[1]);
      const minute = parseInt(timeParts[2]);
      const period = timeParts[3]?.toUpperCase();

      // Convert to 24-hour format
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      // Create notification content
      const title = 'Time to Hydrate! 💧';
      const body = this.createNotificationBody(timeSlot, userProfile, hydrationPlan);

      // Schedule notification
      const trigger = {
        hour: hour,
        minute: minute,
        repeats: true, // Daily repeat
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            userId,
            type: 'hydration_reminder',
            timeSlot,
            oz: oz || null,
            note: note || null,
          },
        },
        trigger,
      });

      // Save to database
      await this.saveNotificationToDatabase(userId, title, body, 'reminder', {
        timeSlot,
        scheduledTime: `${hour}:${minute.toString().padStart(2, '0')}`,
        notificationId,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification for time slot:', error);
      return null;
    }
  }

  // Schedule AI check-ins between logging times
  async scheduleAICheckins(userId, loggingTimes, userProfile) {
    try {
      // Schedule AI check-ins 2-3 hours after each logging time
      for (let i = 0; i < loggingTimes.length; i++) {
        const timeSlot = loggingTimes[i];
        const timeParts = timeSlot.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        
        if (!timeParts) continue;

        let hour = parseInt(timeParts[1]);
        const minute = parseInt(timeParts[2]);
        const period = timeParts[3]?.toUpperCase();

        // Convert to 24-hour format
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;

        // Schedule check-in 2.5 hours later
        const checkinHour = (hour + 2) % 24;
        const checkinMinute = minute + 30;
        const finalHour = checkinMinute >= 60 ? (checkinHour + 1) % 24 : checkinHour;
        const finalMinute = checkinMinute >= 60 ? checkinMinute - 60 : checkinMinute;

        const title = 'Quick Check-in';
        const body = `Hey ${userProfile.name || 'there'}, did you drink any water since I last checked in?`;

        const trigger = {
          hour: finalHour,
          minute: finalMinute,
          repeats: true,
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              userId,
              type: 'ai_checkin',
              timeSlot,
            },
          },
          trigger,
        });

        // Save to database
        await this.saveNotificationToDatabase(userId, title, body, 'checkin', {
          timeSlot,
          scheduledTime: `${finalHour}:${finalMinute.toString().padStart(2, '0')}`,
          notificationId,
        });
      }
    } catch (error) {
      console.error('Error scheduling AI check-ins:', error);
    }
  }

  // Create notification body based on time slot and user data
  createNotificationBody(timeSlot, userProfile, hydrationPlan) {
    const { oz, note } = timeSlot;
    const { name, climate, activity_level } = userProfile;
    
    let body = `Time to hydrate! `;
    
    if (oz) {
      body += `Aim for ${oz} oz. `;
    }
    
    if (note) {
      body += note;
    } else {
      // Default messages based on climate and activity
      if (climate === 'hot') {
        body += 'Stay cool and hydrated!';
      } else if (activity_level === 'high') {
        body += 'Keep your energy up!';
      } else {
        body += 'Stay healthy and hydrated!';
      }
    }
    
    return body;
  }

  // Save notification to database
  async saveNotificationToDatabase(userId, title, body, type, metadata = {}) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          body,
          status: 'scheduled',
          metadata,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving notification to database:', error);
    }
  }

  // Cancel all notifications for a user
  async cancelUserNotifications(userId) {
    try {
      const beforeCount = await this.getScheduledNotificationCount(userId);
      console.log(`Cancelling notifications for user: ${userId} (found ${beforeCount} existing)`);
      
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      let cancelledCount = 0;
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.userId === userId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          cancelledCount++;
        }
      }
      
      const afterCount = await this.getScheduledNotificationCount(userId);
      console.log(`Cancelled ${cancelledCount} notifications for user: ${userId} (remaining: ${afterCount})`);
    } catch (error) {
      console.error('Error canceling user notifications:', error);
    }
  }

  // Handle notification response
  async handleNotificationResponse(response, notificationData) {
    try {
      const { userId, type, timeSlot } = notificationData;
      
      // Update notification status in database
      await supabase
        .from('notifications')
        .update({ 
          status: 'responded',
          metadata: { ...notificationData, response }
        })
        .eq('user_id', userId)
        .eq('status', 'scheduled');

      // Handle different response types
      if (type === 'ai_checkin') {
        await this.handleAICheckinResponse(userId, response, timeSlot);
      }

      console.log('Notification response handled:', { userId, type, response });
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  // Handle AI check-in response
  async handleAICheckinResponse(userId, response, timeSlot) {
    try {
      let estimatedOz = 0;
      
      switch (response) {
        case 'yes':
          estimatedOz = timeSlot.oz || 16; // Default to 16 oz if no specific amount
          break;
        case 'a_little':
          estimatedOz = (timeSlot.oz || 16) * 0.5; // Half the recommended amount
          break;
        case 'no':
          estimatedOz = 0;
          break;
      }

      // Save hydration check-in
      if (estimatedOz > 0) {
        const { error } = await supabase
          .from('hydration_checkins')
          .insert({
            user_id: userId,
            checkin_type: 'ai_checkin',
            value: estimatedOz,
            raw_input: response,
            ai_estimate_oz: estimatedOz,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error handling AI check-in response:', error);
    }
  }

  // Get notification history for a user
  async getNotificationHistory(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
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

      // Reschedule notifications based on new preference
      if (wantsCoaching) {
        console.log('User wants coaching, scheduling notifications...');
        await this.scheduleNotifications(userId);
      } else {
        console.log('User does not want coaching, cancelling notifications...');
        await this.cancelUserNotifications(userId);
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