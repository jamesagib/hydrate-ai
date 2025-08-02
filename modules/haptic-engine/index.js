import { NativeModules, Platform } from 'react-native';

const { HapticEngine } = NativeModules;

// Debug logging to help troubleshoot module loading
console.log('HapticEngine module loaded:', {
  platform: Platform.OS,
  hapticEngine: !!HapticEngine,
  methods: HapticEngine ? Object.keys(HapticEngine) : []
});

class HapticEngineModule {
  playProgressiveHaptic(intensity, sharpness) {
    if (Platform.OS === 'ios' && HapticEngine && HapticEngine.playProgressiveHaptic) {
      try {
        HapticEngine.playProgressiveHaptic(intensity, sharpness);
      } catch (error) {
        console.warn('HapticEngine.playProgressiveHaptic failed:', error);
      }
    }
  }

  playImpactHaptic(style = 'medium') {
    if (Platform.OS === 'ios' && HapticEngine && HapticEngine.playImpactHaptic) {
      try {
        HapticEngine.playImpactHaptic(style);
      } catch (error) {
        console.warn('HapticEngine.playImpactHaptic failed:', error);
      }
    }
  }

  playNotificationHaptic(type = 'success') {
    if (Platform.OS === 'ios' && HapticEngine && HapticEngine.playNotificationHaptic) {
      try {
        HapticEngine.playNotificationHaptic(type);
      } catch (error) {
        console.warn('HapticEngine.playNotificationHaptic failed:', error);
      }
    }
  }

  // Arc Browser style pull-to-refresh haptics
  playPullToRefreshHaptic(progress) {
    if (Platform.OS !== 'ios' || !HapticEngine) return;

    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    // Progressive intensity based on pull distance
    const intensity = clampedProgress * 0.8; // Max 0.8 intensity
    const sharpness = 0.3 + (clampedProgress * 0.4); // Sharpness increases with pull
    
    this.playProgressiveHaptic(intensity, sharpness);
  }

  // Strong haptic when refresh is triggered
  playRefreshTriggeredHaptic() {
    if (Platform.OS === 'ios' && HapticEngine && HapticEngine.playImpactHaptic) {
      try {
        HapticEngine.playImpactHaptic('heavy');
      } catch (error) {
        console.warn('HapticEngine.playRefreshTriggeredHaptic failed:', error);
      }
    }
  }
}

export default new HapticEngineModule(); 