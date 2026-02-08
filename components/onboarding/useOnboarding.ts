import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kpmed_onboarding_v2_done';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem(KEY);
        // Only show onboarding if user hasn't completed it
        setShowOnboarding(done !== 'true');
      } catch {
        setShowOnboarding(false);
      }
      setIsReady(true);
    })();
  }, []);

  const dismiss = async () => {
    setShowOnboarding(false);
    try {
      await AsyncStorage.setItem(KEY, 'true');
    } catch (e) {
      console.error('Error saving onboarding state:', e);
    }
  };

  const reset = async () => {
    await AsyncStorage.removeItem(KEY);
    setShowOnboarding(true);
  };

  return { showOnboarding, isReady, dismiss, reset };
}
