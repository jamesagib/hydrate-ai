import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';

// Configure Google Signin
GoogleSignin.configure({
  webClientId: '786448900175-k369nmbtbqb0vp72eqiat2v8epqsosds.apps.googleusercontent.com',      // from "Web application"
  iosClientId: '786448900175-t4l077b9dii6m9fp4e716ro93vnj9lqq.apps.googleusercontent.com',      // from "iOS" type
  scopes: ['openid', 'email', 'profile'], // optional, but explicit
});

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
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
        // After sign-in, go to plan setup to generate and show the plan
        router.replace('/plan-setup');
        return;
      } else {
        Alert.alert('Google sign-in failed', 'No session returned.');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert('Google sign-in error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('Apple sign-in error:', error);
        Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
      } else if (data.session) {
        console.log('Apple sign-in successful, session created');
        // After sign-in, go to plan setup to generate and show the plan
        router.replace('/plan-setup');
        return;
      }
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        console.log('Apple sign-in cancelled');
      } else {
        console.error('Apple sign-in error:', error);
        Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 60, left: 20 }}
          onPress={() => router.replace('/onboarding/welcome')}
        >
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_600SemiBold', color: '#666' }}>← Back</Text>
        </TouchableOpacity>

        <Image
          source={require('../assets/icon.png')}
          style={{ width: 80, height: 80, marginBottom: 32 }}
          resizeMode="contain"
        />
        
        <Text style={{ fontSize: 28, fontFamily: 'Nunito_700Bold', color: 'black', marginBottom: 16, textAlign: 'center' }}>
          Welcome Back
        </Text>
        
        <Text style={{ fontSize: 16, fontFamily: 'Nunito_400Regular', color: '#666', textAlign: 'center', marginBottom: 40 }}>
          Sign in to continue with your hydration journey
        </Text>

        <TouchableOpacity
          style={{ 
            backgroundColor: 'white', 
            paddingVertical: 16, 
            paddingHorizontal: 24, 
            borderRadius: 12, 
            borderWidth: 1,
            borderColor: '#E0E0E0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginBottom: 16
          }}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Image
            source={require('../assets/googleLogo.png')}
            style={{ width: 20, height: 20, marginRight: 12 }}
            resizeMode="contain"
          />
          <Text style={{ color: 'black', fontFamily: 'Nunito_600SemiBold', fontSize: 16 }}>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ width: '100%', height: 50, marginBottom: 24 }}
          onPress={handleAppleSignIn}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Nunito_400Regular', color: '#666' }}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth')}>
            <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: 'black' }}>
              Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 