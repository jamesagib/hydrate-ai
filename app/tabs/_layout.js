'use client';

import { Tabs } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { View } from 'react-native';
import 'react-native-gesture-handler';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

export default function TabsLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4FC3F7',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            backgroundColor: '#F2EFEB',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontFamily: 'Nunito_600SemiBold',
            fontSize: 12,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons 
                name={focused ? 'water' : 'water-outline'} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons 
                name={focused ? 'stats-chart' : 'stats-chart-outline'} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons 
                name={focused ? 'settings-sharp' : 'settings-outline'} 
                size={size} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
} 