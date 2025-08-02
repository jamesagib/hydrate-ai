import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import superwallDelegate from '../../lib/superwallDelegate';

// Test component to verify Superwall delegate functionality
export default function SuperwallTestComponent() {
  const testWillRedeemLink = () => {
    console.log('🧪 Testing willRedeemLink...');
    superwallDelegate.willRedeemLink();
  };

  const testDidRedeemLinkSuccess = () => {
    console.log('🧪 Testing didRedeemLink with success...');
    superwallDelegate.didRedeemLink({
      type: 'success',
      code: 'test-code-123',
      redemptionInfo: {
        purchaserInfo: {
          email: 'test@example.com'
        }
      }
    });
  };

  const testDidRedeemLinkError = () => {
    console.log('🧪 Testing didRedeemLink with error...');
    superwallDelegate.didRedeemLink({
      type: 'error',
      code: 'test-code-123',
      error: {
        message: 'Test error message'
      }
    });
  };

  const testDidRedeemLinkExpired = () => {
    console.log('🧪 Testing didRedeemLink with expired code...');
    superwallDelegate.didRedeemLink({
      type: 'expiredCode',
      code: 'test-code-123',
      expiredInfo: {
        redemptionEmailResent: true
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Superwall Delegate Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testWillRedeemLink}>
        <Text style={styles.buttonText}>Test willRedeemLink</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testDidRedeemLinkSuccess}>
        <Text style={styles.buttonText}>Test Success Redemption</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testDidRedeemLinkError}>
        <Text style={styles.buttonText}>Test Error Redemption</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testDidRedeemLinkExpired}>
        <Text style={styles.buttonText}>Test Expired Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4FC3F7',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
  },
}); 