import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

// Drink logging congratulation messages
const DRINK_CONGRATULATIONS = [
  {
    "name": "nice_sip",
    "title": "Nice Sip 💧",
    "body": "That's the kind of hydration we like to see.",
    "desc": "You didn't have to go that hard... but you did. Respect."
  },
  {
    "name": "log_success",
    "title": "Logged & Loaded ✅",
    "body": "That drink just made your body smile.",
    "desc": "Great choice. Keep sipping, legend."
  },
  {
    "name": "drink_logged",
    "title": "Drink Logged! 🍹",
    "body": "Your hydration journey continues.",
    "desc": "Every log makes a difference. Keep up the great work."
  },
  {
    "name": "hydrated_vibes",
    "title": "Hydrated Vibes Only ✨",
    "body": "Feeling better already, right?",
    "desc": "Your brain, skin, and cells just high-fived."
  },
  {
    "name": "good_call",
    "title": "Good Call 🙌",
    "body": "That was the right move.",
    "desc": "Water: 1. Dehydration: 0."
  },
  {
    "name": "simple_congrats",
    "title": "Logged! 👏",
    "body": "Another glass down.",
    "desc": "Clean. Easy. Efficient. You nailed it."
  },
  {
    "name": "refresh_achieved",
    "title": "Refresh Achieved 💦",
    "body": "You just leveled up your hydration.",
    "desc": "Every sip is a win. Nicely done."
  },
  {
    "name": "you_snapped",
    "title": "You Snapped 🔥",
    "body": "That was a crisp water log.",
    "desc": "Just saying, you're kind of built different."
  },
  {
    "name": "daily_boost",
    "title": "Boost Secured 🚀",
    "body": "You just gave your body a boost.",
    "desc": "Energy, clarity, and glow — unlocked."
  },
  {
    "name": "water_logged",
    "title": "Water Logged 📝",
    "body": "And just like that, you're more hydrated.",
    "desc": "Simple actions. Big benefits."
  },
  {
    "name": "clean_entry",
    "title": "Clean Entry 👌",
    "body": "You log drinks like a pro.",
    "desc": "We're not saying you're elite… but we're also not *not* saying it."
  },
  {
    "name": "drip_acquired",
    "title": "Drip Acquired 😎",
    "body": "You drank water and gained +1 swag.",
    "desc": "The glow-up is real. Stay hydrated, king/queen."
  },
  {
    "name": "hydration_input",
    "title": "Hydration Input Detected 🧠",
    "body": "Neural performance increased by 7%.*",
    "desc": "(*Definitely not science. But feels like it, right?)"
  },
  {
    "name": "hydration_accepted",
    "title": "Hydration Accepted 💧",
    "body": "Your cells are throwing a party.",
    "desc": "No one celebrates water like your body does."
  },
  {
    "name": "appreciation_mode",
    "title": "Appreciate You 🫶",
    "body": "That water log made our day.",
    "desc": "Yours too, probably."
  }
];

class DrinkNotificationService {
  constructor() {
    this.usedNotifications = new Set();
  }

  // Get a random congratulation message that hasn't been used today
  async getRandomCongratulation() {
    try {
      // Load used notifications for today
      const today = new Date().toDateString();
      const usedNotificationsKey = `used_drink_notifications_${today}`;
      const usedNotificationsJson = await SecureStore.getItemAsync(usedNotificationsKey);
      
      if (usedNotificationsJson) {
        this.usedNotifications = new Set(JSON.parse(usedNotificationsJson));
      } else {
        this.usedNotifications = new Set();
      }

      // Filter out used notifications
      const availableNotifications = DRINK_CONGRATULATIONS.filter(
        notification => !this.usedNotifications.has(notification.name)
      );

      // If all notifications have been used, reset for the day
      if (availableNotifications.length === 0) {
        console.log('All drink notifications used today, resetting...');
        this.usedNotifications = new Set();
        await SecureStore.setItemAsync(usedNotificationsKey, JSON.stringify([]));
        return DRINK_CONGRATULATIONS[Math.floor(Math.random() * DRINK_CONGRATULATIONS.length)];
      }

      // Select random notification
      const selectedNotification = availableNotifications[Math.floor(Math.random() * availableNotifications.length)];
      
      // Mark as used
      this.usedNotifications.add(selectedNotification.name);
      await SecureStore.setItemAsync(usedNotificationsKey, JSON.stringify([...this.usedNotifications]));

      console.log(`Selected drink notification: ${selectedNotification.name}`);
      return selectedNotification;
    } catch (error) {
      console.error('Error getting drink notification:', error);
      // Fallback to random selection
      return DRINK_CONGRATULATIONS[Math.floor(Math.random() * DRINK_CONGRATULATIONS.length)];
    }
  }

  // Show local notification for drink logging
  async showDrinkCongratulation() {
    try {
      const notification = await this.getRandomCongratulation();
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { type: 'drink_congratulation' },
        },
        trigger: null, // Show immediately
      });

      console.log('Drink congratulation notification scheduled');
      return true;
    } catch (error) {
      console.error('Error showing drink congratulation:', error);
      return false;
    }
  }

  // Clear used notifications (useful for testing)
  async clearUsedNotifications() {
    try {
      const today = new Date().toDateString();
      const usedNotificationsKey = `used_drink_notifications_${today}`;
      await SecureStore.deleteItemAsync(usedNotificationsKey);
      this.usedNotifications = new Set();
      console.log('Cleared used drink notifications');
    } catch (error) {
      console.error('Error clearing used notifications:', error);
    }
  }
}

// Create singleton instance
const drinkNotificationService = new DrinkNotificationService();

export default drinkNotificationService; 