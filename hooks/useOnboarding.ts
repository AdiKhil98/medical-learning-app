import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureLogger } from '@/lib/security';

export interface OnboardingState {
  showWelcome: boolean;
  loading: boolean;
  completeOnboarding: () => Promise<void>;
}

export const useOnboarding = (): OnboardingState => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkOnboardingStatus = async () => {
    try {
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      if (!hasCompletedOnboarding) {
        setShowWelcome(true);
      }
    } catch (error) {
      SecureLogger.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      setShowWelcome(false);
      SecureLogger.log('Onboarding completed and saved to AsyncStorage');
    } catch (error) {
      SecureLogger.error('Error saving onboarding completion:', error);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  return {
    showWelcome,
    loading,
    completeOnboarding,
  };
};