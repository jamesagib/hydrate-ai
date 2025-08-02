import { useCallback } from 'react';
import HapticEngine from './index';

export const useHaptics = () => {
  const playProgressiveHaptic = useCallback((intensity, sharpness) => {
    HapticEngine.playProgressiveHaptic(intensity, sharpness);
  }, []);

  const playImpactHaptic = useCallback((style = 'medium') => {
    HapticEngine.playImpactHaptic(style);
  }, []);

  const playNotificationHaptic = useCallback((type = 'success') => {
    HapticEngine.playNotificationHaptic(type);
  }, []);

  const playPullToRefreshHaptic = useCallback((progress) => {
    HapticEngine.playPullToRefreshHaptic(progress);
  }, []);

  const playRefreshTriggeredHaptic = useCallback(() => {
    HapticEngine.playRefreshTriggeredHaptic();
  }, []);

  return {
    playProgressiveHaptic,
    playImpactHaptic,
    playNotificationHaptic,
    playPullToRefreshHaptic,
    playRefreshTriggeredHaptic,
  };
}; 