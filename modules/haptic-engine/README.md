# Haptic Engine for React Native

This module provides Arc Browser-style pull-to-refresh haptics and other haptic feedback for React Native apps.

## Features

- **Progressive Pull-to-Refresh Haptics**: Like Arc Browser, haptics get more intense as you pull down
- **Impact Haptics**: Light, medium, heavy, rigid, and soft impact feedback
- **Notification Haptics**: Success, warning, and error feedback
- **iOS Only**: Currently supports iOS devices with haptic capabilities

## Installation

The module is already integrated into your project. The iOS native code is included and the JavaScript interface is ready to use.

## Usage

### Basic Haptic Feedback

```javascript
import { useHaptics } from '../modules/haptic-engine/useHaptics';

function MyComponent() {
  const { playImpactHaptic, playNotificationHaptic } = useHaptics();

  const handleButtonPress = () => {
    playImpactHaptic('medium'); // 'light', 'medium', 'heavy', 'rigid', 'soft'
  };

  const handleSuccess = () => {
    playNotificationHaptic('success'); // 'success', 'warning', 'error'
  };
}
```

### Pull-to-Refresh with Haptics

```javascript
import PullToRefreshWithHaptics from '../modules/haptic-engine/PullToRefreshWithHaptics';

function MyScreen() {
  const onRefresh = async () => {
    // Your refresh logic here
    await fetchData();
  };

  return (
    <PullToRefreshWithHaptics
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      {/* Your content */}
    </PullToRefreshWithHaptics>
  );
}
```

### Direct Haptic Engine Access

```javascript
import HapticEngine from '../modules/haptic-engine';

// Progressive haptics (0.0 to 1.0 for both parameters)
HapticEngine.playProgressiveHaptic(0.5, 0.3);

// Impact haptics
HapticEngine.playImpactHaptic('heavy');

// Notification haptics
HapticEngine.playNotificationHaptic('success');
```

## How It Works

1. **Progressive Haptics**: Uses iOS Core Haptics to create continuous haptic patterns that respond to pull distance
2. **Impact Haptics**: Uses UIKit's impact feedback generators for quick, tactile responses
3. **Notification Haptics**: Uses UIKit's notification feedback generators for system-style feedback

## Arc Browser Style

The pull-to-refresh implementation mimics Arc Browser's behavior:
- Haptics start light and get progressively more intense as you pull down
- Sharpness increases with pull distance for a "rubber band" feel
- Strong impact haptic when refresh is triggered
- Smooth, continuous feedback throughout the pull gesture

## Requirements

- iOS 15.1+
- Device with haptic capabilities (iPhone 7 or later)
- React Native 0.60+

## Notes

- Haptics are iOS-only and will gracefully degrade on unsupported devices
- The haptic engine automatically restores when the app becomes active
- All haptic calls are safe to use and won't crash the app 