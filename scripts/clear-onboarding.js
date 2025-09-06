// Script to clear onboarding status for testing
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearOnboardingStatus = async () => {
  try {
    await AsyncStorage.removeItem('hasCompletedOnboarding');
    console.log('✅ Onboarding status cleared! Welcome flow will show on next app restart.');
  } catch (error) {
    console.error('❌ Error clearing onboarding status:', error);
  }
};

clearOnboardingStatus();