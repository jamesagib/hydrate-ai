'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import OnboardingHeader from '../components/OnboardingHeader';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { saveOnboardingData, loadOnboardingData } from '../../lib/onboardingStorage';

const feetOptions = Array.from({ length: 5 }, (_, i) => 4 + i); // 4-8 ft
const inchOptions = Array.from({ length: 12 }, (_, i) => i); // 0-11 in
const cmOptions = Array.from({ length: 61 }, (_, i) => 140 + i); // 140-200 cm
const lbOptions = Array.from({ length: 251 }, (_, i) => 100 + i); // 100-350 lb
const kgOptions = Array.from({ length: 116 }, (_, i) => 45 + i); // 45-160 kg

export default function OnboardingHeightWeightScreen() {
  const [unit, setUnit] = useState('imperial');
  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(9);
  const [cm, setCm] = useState(170);
  const [lb, setLb] = useState(155);
  const [kg, setKg] = useState(70);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  if (!fontsLoaded) {
    return null;
  }

  const handleContinue = async () => {
    const prev = await loadOnboardingData() || {};
    let height_cm = null, weight_kg = null;
    if (unit === 'imperial') {
      height_cm = Math.round(((feet * 12 + inches) * 2.54));
      weight_kg = Math.round(lb * 0.453592);
    } else {
      height_cm = cm;
      weight_kg = kg;
    }
    await saveOnboardingData({ ...prev, height_cm, weight_kg, unit });
    router.push('/onboarding/activity');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2EFEB' }}>
      <OnboardingHeader 
        progress={50} 
        onBackPress={() => router.push('/onboarding/age')}
      />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 140 }}>
          <Text style={{
            fontFamily: 'Nunito_700Bold',
            fontSize: 28,
            color: 'black',
            marginBottom: 8,
          }}>
            Height & weight
          </Text>
          <Text style={{
            fontFamily: 'Nunito_400Regular',
            fontSize: 16,
            color: '#666',
            marginBottom: 32,
          }}>
            This will be used to calibrate your custom plan.
          </Text>

          {/* Segmented Control */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <TouchableOpacity
              style={{
                paddingVertical: 8,
                paddingHorizontal: 24,
                borderRadius: 20,
                backgroundColor: unit === 'imperial' ? 'black' : '#F5F5F5',
                marginRight: 8,
              }}
              onPress={() => setUnit('imperial')}
            >
              <Text style={{
                fontFamily: 'Nunito_600SemiBold',
                fontSize: 16,
                color: unit === 'imperial' ? 'white' : '#999',
              }}>
                Imperial
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingVertical: 8,
                paddingHorizontal: 24,
                borderRadius: 20,
                backgroundColor: unit === 'metric' ? 'black' : '#F5F5F5',
              }}
              onPress={() => setUnit('metric')}
            >
              <Text style={{
                fontFamily: 'Nunito_600SemiBold',
                fontSize: 16,
                color: unit === 'metric' ? 'white' : '#999',
              }}>
                Metric
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pickers */}
          {unit === 'imperial' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 }}>
              {/* Height Picker */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: 'black', marginBottom: 8 }}>Height</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Picker
                    selectedValue={feet}
                    style={{ width: 90, height: 120 }}
                    itemStyle={{ fontFamily: 'Nunito_400Regular', fontSize: 18 }}
                    onValueChange={setFeet}
                  >
                    {feetOptions.map((f) => (
                      <Picker.Item key={f} label={`${f} ft`} value={f} />
                    ))}
                  </Picker>
                  <Picker
                    selectedValue={inches}
                    style={{ width: 100, height: 120 }}
                    itemStyle={{ fontFamily: 'Nunito_400Regular', fontSize: 18 }}
                    onValueChange={setInches}
                  >
                    {inchOptions.map((i) => (
                      <Picker.Item key={i} label={`${i} in`} value={i} />
                    ))}
                  </Picker>
                </View>
              </View>
              {/* Weight Picker */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: 'black', marginBottom: 8 }}>Weight</Text>
                <Picker
                  selectedValue={lb}
                  style={{ width: 120, height: 120 }}
                  itemStyle={{ fontFamily: 'Nunito_400Regular', fontSize: 18 }}
                  onValueChange={setLb}
                >
                  {lbOptions.map((l) => (
                    <Picker.Item key={l} label={`${l} lb`} value={l} />
                  ))}
                </Picker>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 }}>
              {/* Height Picker */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: 'black', marginBottom: 8 }}>Height</Text>
                <Picker
                  selectedValue={cm}
                  style={{ width: 130, height: 120 }}
                  itemStyle={{ fontFamily: 'Nunito_400Regular', fontSize: 18 }}
                  onValueChange={setCm}
                >
                  {cmOptions.map((c) => (
                    <Picker.Item key={c} label={`${c} cm`} value={c} />
                  ))}
                </Picker>
              </View>
              {/* Weight Picker */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 16, color: 'black', marginBottom: 8 }}>Weight</Text>
                <Picker
                  selectedValue={kg}
                  style={{ width: 130, height: 120 }}
                  itemStyle={{ fontFamily: 'Nunito_400Regular', fontSize: 18 }}
                  onValueChange={setKg}
                >
                  {kgOptions.map((k) => (
                    <Picker.Item key={k} label={`${k} kg`} value={k} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Continue Button */}
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 40 }}>
          <TouchableOpacity
            onPress={handleContinue}
            style={{
              backgroundColor: 'black',
              borderRadius: 20,
              paddingVertical: 18,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{
              color: 'white',
              fontFamily: 'Nunito_700Bold',
              fontSize: 18,
            }}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 