import React, { useEffect } from 'react';
import { Linking, AppState } from 'react-native';
import { useRouter } from 'expo-router';

// Component to handle deep links for Superwall post-checkout redirecting
export default function SuperwallDeepLinkHandler() {
  const router = useRouter();

  const handleDeepLink = async (url) => {
    if (url) {
      console.log('🔗 Deep link received:', url);
      
      try {
        // Import Superwall and handle the deep link
        const { SuperwallExpoModule } = await import('expo-superwall');
        
        if (SuperwallExpoModule && SuperwallExpoModule.handleDeepLink) {
          console.log('🎯 Handling deep link with Superwall...');
          SuperwallExpoModule.handleDeepLink(url);
        } else {
          console.log('⚠️ SuperwallExpoModule.handleDeepLink not available');
        }
      } catch (error) {
        console.error('❌ Error handling deep link with Superwall:', error);
      }
    }
  };

  useEffect(() => {
    const handleIncomingLink = async () => {
      try {
        const url = await Linking.getInitialURL();
        console.log('🔗 Initial deep link:', url);
        handleDeepLink(url);
      } catch (error) {
        console.error('❌ Error getting initial URL:', error);
      }
    };

    // Handle any existing deep link on mount
    handleIncomingLink();

    // Handle app state changes
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('🔄 App became active, checking for deep links...');
        handleIncomingLink();
      }
    });

    // Handle deep links when app is already running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 Deep link event received:', event.url);
      handleDeepLink(event.url);
    });

    // Cleanup
    return () => {
      appStateSubscription?.remove();
      linkingSubscription?.remove();
    };
  }, [router]);

  // This component doesn't render anything
  return null;
} 