import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
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
import { saveOnboardingData } from '../lib/onboardingStorage';

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

// Simple SHA256 implementation for React Native
const hashNonce = async (nonce) => {
  // For now, let's try without hashing the nonce
  // Apple Sign In might work with the raw nonce
  console.log('Using raw nonce for Apple Sign In');
  return nonce;
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
        // Check if this is a new user (no existing profile)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', data.session.user.id)
          .single();
        
        if (!existingProfile) {
          // This is a new user - go to plan setup
          console.log('New user signed in with Google, going to plan setup');
          router.replace('/plan-setup');
        } else {
          // This is an existing user - go directly to home
          console.log('Existing user signed in with Google, going to home');
          router.replace('/tabs/home');
        }
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
        // Don't pass nonce to Apple - let it handle it internally
      });
      
      const { identityToken, fullName } = credential;
      if (!identityToken) throw new Error('No Apple identity token returned');
      
      console.log('Apple sign-in successful, token received');
      console.log('Apple provided name:', fullName);
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        // Don't pass nonce to Supabase either - let it handle Apple tokens
      });
      
      if (error) {
        console.error('Supabase Apple auth error:', error);
        throw error;
      }
      
      if (data.session) {
        console.log('Apple sign-in successful, session created');
        
        // Check if this is a new user (no existing profile)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', data.session.user.id)
          .single();
        
        if (!existingProfile) {
          // This is a new user - try to get name from Apple
          if (fullName && fullName.givenName) {
            const name = `${fullName.givenName}${fullName.familyName ? ` ${fullName.familyName}` : ''}`;
            console.log('Saving Apple provided name for new user:', name);
            
            // Save the name to onboarding storage
            await saveOnboardingData({ name });
          } else {
            console.log('No name provided by Apple for new user - will prompt during onboarding');
          }
          
          // After sign-in, go to plan setup to generate and show the plan
          router.replace('/plan-setup');
        } else {
          // This is an existing user - go directly to home
          console.log('Existing user signed in, going to home');
          router.replace('/tabs/home');
        }
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
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Sign up to save your progress and view your personalized water plan.</Text>
      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Image source={require('../assets/googleLogo.png')} style={styles.googleLogo} />
        <Text style={styles.buttonText}>Sign in with Google</Text>
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
             
             <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32 }}>
               <Text style={{ fontSize: 14, fontFamily: 'Nunito_400Regular', color: '#666' }}>
                 Already have an account?{' '}
               </Text>
               <TouchableOpacity onPress={() => router.push('/login')}>
                 <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: 'black' }}>
                   Sign in
                 </Text>
               </TouchableOpacity>
             </View>

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
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
}); 