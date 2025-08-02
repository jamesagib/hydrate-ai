import { Alert } from 'react-native';
import { supabase } from './supabase';
import { useLoading } from './loadingContext';

// Set up loading context for delegate methods
let loadingContext = null;

export const setLoadingContext = (context) => {
  loadingContext = context;
};

// Helper function to create paywall data with user information
export const createPaywallData = (placement, user) => {
  if (user) {
    return {
      placement,
      userAttributes: {
        email: user.email,
        app_user_id: user.id,
        user_id: user.id
      }
    };
  }
  return { placement };
};

// Helper function to determine purchase options based on location
export const getPurchaseOptions = (userLocation) => {
  if (userLocation === 'US') {
    return {
      type: 'dual',
      description: 'US users can choose between IAP and external checkout',
      hasIAP: true,
      hasExternalCheckout: true
    };
  } else {
    return {
      type: 'iap_only',
      description: 'Non-US users get IAP only',
      hasIAP: true,
      hasExternalCheckout: false
    };
  }
};

// Main delegate class for handling redemption
class SuperwallDelegate {
  constructor() {
    this.isLoading = false;
  }

  // Called when app opens via deep link, before making network call to redeem code
  willRedeemLink() {
    console.log('🔄 Superwall: willRedeemLink - Starting redemption process');
    this.isLoading = true;
    
    // You can show a global loading indicator here
    // For now, we'll just log it. You can integrate with your app's loading state
    this.showLoadingIndicator();
  }

  // Called after receiving response from network with redemption result
  didRedeemLink(result) {
    console.log('✅ Superwall: didRedeemLink - Redemption completed', result);
    this.isLoading = false;
    
    // Hide loading indicator
    this.hideLoadingIndicator();

    switch (result.type) {
      case 'success':
        this.handleSuccess(result);
        break;
      case 'error':
        this.handleError(result);
        break;
      case 'expiredCode':
        this.handleExpiredCode(result);
        break;
      case 'invalidCode':
        this.handleInvalidCode(result);
        break;
      case 'expiredSubscription':
        this.handleExpiredSubscription(result);
        break;
      default:
        console.warn('⚠️ Superwall: Unknown redemption result type', result);
    }
  }

  // Handle successful redemption
  async handleSuccess(result) {
    const { code, redemptionInfo } = result;
    console.log('🎉 Superwall: Redemption successful', { code, redemptionInfo });

    try {
      // Set user attributes if email is available
      if (redemptionInfo.purchaserInfo?.email) {
        const email = redemptionInfo.purchaserInfo.email;
        console.log('📧 Setting user email:', email);
        
        // Update user profile in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.auth.updateUser({
            email: email
          });
          if (error) {
            console.error('❌ Error updating user email:', error);
          }
        }
      }

      // Show success message
      this.showSuccessMessage('Welcome! Your subscription is now active.');
      
      // Refresh user data to reflect new subscription status
      this.refreshUserData();
      
    } catch (error) {
      console.error('❌ Error handling successful redemption:', error);
      this.showErrorMessage('Subscription activated, but there was an issue updating your profile.');
    }
  }

  // Handle redemption error
  handleError(result) {
    const { code, error } = result;
    console.error('❌ Superwall: Redemption error', { code, error });
    
    const errorMessage = error.message || 'An error occurred while activating your subscription.';
    this.showErrorMessage(errorMessage);
  }

  // Handle expired code
  handleExpiredCode(result) {
    const { code, expiredInfo } = result;
    console.warn('⏰ Superwall: Code expired', { code, expiredInfo });
    
    let message = 'This link has expired.';
    if (expiredInfo.redemptionEmailResent) {
      message += ' A new activation email has been sent to your email address.';
    }
    
    this.showErrorMessage(message);
  }

  // Handle invalid code
  handleInvalidCode(result) {
    const { code } = result;
    console.warn('🚫 Superwall: Invalid code', { code });
    
    this.showErrorMessage('This activation link is invalid. Please try again or contact support.');
  }

  // Handle expired subscription
  handleExpiredSubscription(result) {
    const { code, redemptionInfo } = result;
    console.warn('📅 Superwall: Expired subscription', { code, redemptionInfo });
    
    this.showErrorMessage('Your subscription has expired. Please renew to continue using premium features.');
  }

  // Show loading indicator
  showLoadingIndicator() {
    console.log('🔄 Showing loading indicator for redemption...');
    
    if (loadingContext) {
      loadingContext.showLoading('Activating your subscription...');
    }
  }

  // Hide loading indicator
  hideLoadingIndicator() {
    console.log('✅ Hiding loading indicator');
    
    if (loadingContext) {
      loadingContext.hideLoading();
    }
  }

  // Show success message
  showSuccessMessage(message) {
    Alert.alert(
      'Success! 🎉',
      message,
      [{ text: 'OK', style: 'default' }]
    );
  }

  // Show error message
  showErrorMessage(message) {
    Alert.alert(
      'Error',
      message,
      [{ text: 'OK', style: 'default' }]
    );
  }

  // Refresh user data after successful redemption
  async refreshUserData() {
    try {
      console.log('🔄 Refreshing user data after successful redemption...');
      
      // Trigger a refresh of your app's user data
      // This could be calling your fetchUserData function or updating global state
      
      // Example: If you have a global user context, you could call:
      // UserContext.refreshUserData();
      
      // Or emit an event that your app can listen to:
      // EventEmitter.emit('userDataRefreshed');
      
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  }

  // Get current loading state
  get isLoading() {
    return this._isLoading;
  }

  // Set loading state
  set isLoading(value) {
    this._isLoading = value;
  }
}

// Create singleton instance
const superwallDelegate = new SuperwallDelegate();

export default superwallDelegate; 