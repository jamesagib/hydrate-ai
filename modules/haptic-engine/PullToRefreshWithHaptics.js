import React, { useRef, useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useHaptics } from './useHaptics';

const PullToRefreshWithHaptics = ({ 
  children, 
  onRefresh, 
  refreshing = false,
  style,
  contentContainerStyle,
  ...props 
}) => {
  const { playPullToRefreshHaptic, playRefreshTriggeredHaptic } = useHaptics();
  const scrollViewRef = useRef(null);
  const lastProgress = useRef(0);

  const handleScroll = useCallback((event) => {
    const { contentOffset } = event.nativeEvent;
    const progress = Math.max(0, contentOffset.y / 100); // Normalize to 0-1 range
    
    // Only trigger haptic if progress changed significantly
    if (Math.abs(progress - lastProgress.current) > 0.05) {
      playPullToRefreshHaptic(progress);
      lastProgress.current = progress;
    }
  }, [playPullToRefreshHaptic]);

  const handleRefresh = useCallback(async () => {
    // Play the strong haptic when refresh is triggered
    playRefreshTriggeredHaptic();
    
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh, playRefreshTriggeredHaptic]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
          colors={["#007AFF"]}
        />
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default PullToRefreshWithHaptics; 