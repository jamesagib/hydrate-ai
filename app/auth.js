import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { router } from 'expo-router';

// Configure Google Signin
GoogleSignin.configure({
  webClientId: '786448900175-k369nmbtbqb0vp72eqiat2v8epqsosds.apps.googleusercontent.com',      // from "Web application"
  iosClientId: '786448900175-t4l077b9dii6m9fp4e716ro93vnj9lqq.apps.googleusercontent.com',      // from "iOS" type
  scopes: ['openid', 'email', 'profile'], // optional, but explicit
});

// Generate a random nonce
const generateNonce = () => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};


export default function AuthScreen() {
  // All hooks must be called at the top, in the same order, on every render
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const navigation = useNavigation();
  
  // Check if Apple Auth is available
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);
  
  React.useEffect(() => {
    const checkAppleAuth = async () => {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(isAvailable);
        console.log('Apple Auth available:', isAvailable);
      } catch (error) {
        console.error('Error checking Apple Auth availability:', error);
        setIsAppleAuthAvailable(false);
      }
    };
    
    checkAppleAuth();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      
      const userInfo = await GoogleSignin.signIn();
      console.log('Google userInfo:', userInfo);
      const { idToken } = userInfo.data;
      
      if (!idToken) throw new Error('No Google ID token returned');
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      
      if (error) throw error;
      if (data.session) {
        // After sign-in, go to plan setup screen
        router.replace('/plan-setup');
        return;
      } else {
        Alert.alert('Google sign-in failed', 'No session returned.');
      }
    } catch (e) {
      Alert.alert('Google sign-in error', e.message);
    }
  };

  // Apple sign-in handler
  const handleAppleSignIn = async () => {
    try {
      console.log('Starting Apple sign-in process...');
      
      // Generate a secure nonce
      const nonce = generateNonce();
      console.log('Generated nonce:', nonce);
      
      console.log('Calling AppleAuthentication.signInAsync...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: nonce, // Add the nonce here
      });
      
      const { identityToken } = credential;
      if (!identityToken) throw new Error('No Apple identity token returned');
      
      console.log('Apple sign-in successful, token received');
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce: nonce, // Use the same nonce
      });
      
      if (error) {
        console.error('Supabase Apple auth error:', error);
        throw error;
      }
      
      if (data.session) {
        console.log('Apple sign-in successful, session created');
        // After sign-in, go to plan setup screen
        router.replace('/plan-setup');
        return;
      } else {
        Alert.alert('Apple sign-in failed', 'No session returned.');
      }
    } catch (e) {
      console.error('Apple sign-in error:', e);
      if (e.code === 'ERR_CANCELED') {
        console.log('User canceled Apple sign-in');
        return;
      }
      
      // More specific error handling
      let errorMessage = 'Apple sign-in failed';
      if (e.code === 'ERR_REQUEST_NOT_HANDLED') {
        errorMessage = 'Apple Sign In is not available on this device';
      } else if (e.code === 'ERR_REQUEST_EMPTY') {
        errorMessage = 'No response from Apple Sign In';
      } else if (e.code === 'ERR_REQUEST_INVALID_RESPONSE') {
        errorMessage = 'Invalid response from Apple Sign In';
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      // Send error to remote logging service
      console.error('Apple Auth Error Details:', {
        code: e.code,
        message: e.message,
        fullError: e
      });
      
      Alert.alert('Apple sign-in error', `${errorMessage}\n\nCode: ${e.code || 'Unknown'}\nMessage: ${e.message || 'No message'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Save your progress</Text>
      <Text style={styles.subtitle}>Sign up to view your personalized water plan, customized just for you.</Text>
      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.googleButton, { backgroundColor: 'red', marginTop: 16 }]} 
        onPress={() => {
          console.log('Test button pressed!');
          Alert.alert('Test', 'Button works!');
        }}
      >
        <Text style={styles.buttonText}>Test Button</Text>
      </TouchableOpacity>
      {isAppleAuthAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ width: 240, height: 44, marginTop: 16 }}
          onPress={() => {
            console.log('Apple Auth button pressed!');
            handleAppleSignIn();
          }}
        />
      )}
      {!isAppleAuthAvailable && (
        <Text style={{ marginTop: 16, color: 'red', fontFamily: 'Nunito_400Regular' }}>
          Apple Sign In not available on this device
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFEB',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 12,
    color: 'black',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
}); 