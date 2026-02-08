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
        console.log('[Onboarding] AsyncStorage value:', done);
        // Only show onboarding if user hasn't completed it
        const shouldShow = done !== 'true';
        console.log('[Onboarding] Should show:', shouldShow);
        setShowOnboarding(shouldShow);
      } catch (e) {
        console.error('[Onboarding] Error reading AsyncStorage:', e);
        setShowOnboarding(false);
      }
      setIsReady(true);
      console.log('[Onboarding] Ready state set to true');
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
