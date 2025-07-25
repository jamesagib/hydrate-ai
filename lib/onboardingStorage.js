import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'onboarding_data';

export async function saveOnboardingData(data) {
  await SecureStore.setItemAsync(ONBOARDING_KEY, JSON.stringify(data));
}

export async function loadOnboardingData() {
  const json = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return json ? JSON.parse(json) : null;
}

export async function clearOnboardingData() {
  await SecureStore.deleteItemAsync(ONBOARDING_KEY);
} 