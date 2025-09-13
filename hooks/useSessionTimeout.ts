import { useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SecureLogger } from '@/lib/security';

interface UseSessionTimeoutOptions {
  timeoutDuration?: number; // in milliseconds, default 30 minutes
  warningDuration?: number; // warning time before timeout, default 2 minutes
  activityUpdateInterval?: number; // database update interval, default 5 minutes
  enabled?: boolean; // whether session timeout is enabled, default true
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const {
    timeoutDuration = 30 * 60 * 1000, // 30 minutes
    warningDuration = 2 * 60 * 1000, // 2 minutes
    activityUpdateInterval = 5 * 60 * 1000, // 5 minutes
    enabled = true,
  } = options;

  const { user, signOut } = useAuth();
  
  // Timers
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Activity tracking
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (activityUpdateTimerRef.current) {
      clearTimeout(activityUpdateTimerRef.current);
      activityUpdateTimerRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  // Update last activity in database
  const updateLastActivityInDB = useCallback(async () => {
    if (!user?.id) {
      SecureLogger.warn('Cannot update last activity: user not authenticated');
      return;
    }

    try {
      const { error } = await supabase.rpc('update_last_activity', {
        user_id_input: user.id
      });

      if (error) {
        SecureLogger.error('Failed to update last activity in database', error);
      } else {
        SecureLogger.log('Last activity updated in database');
      }
    } catch (error) {
      SecureLogger.error('Error updating last activity', error);
    }
  }, [user?.id]);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    SecureLogger.warn('Session timeout reached, signing out user');
    cleanup();
    
    try {
      await signOut();
      
      // Show timeout message
      if (Platform.OS === 'web') {
        alert('Ihre Sitzung ist abgelaufen. Sie wurden automatisch abgemeldet.');
      } else {
        Alert.alert(
          'Sitzung abgelaufen',
          'Ihre Sitzung ist abgelaufen. Sie wurden automatisch abgemeldet.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      SecureLogger.error('Error during session timeout signout', error);
    }
  }, [signOut, cleanup]);

  // Show warning dialog
  const showWarning = useCallback(() => {
    if (warningShownRef.current) return;
    
    warningShownRef.current = true;
    SecureLogger.warn('Session timeout warning shown to user');

    const handleExtendSession = () => {
      SecureLogger.log('User chose to extend session');
      warningShownRef.current = false;
      resetTimers();
    };

    const handleSignOut = async () => {
      SecureLogger.log('User chose to sign out from warning dialog');
      try {
        await signOut();
      } catch (error) {
        SecureLogger.error('Error during manual signout from warning', error);
      }
    };

    if (Platform.OS === 'web') {
      const result = confirm('Session expires in 2 minutes. Do you want to continue?');
      if (result) {
        handleExtendSession();
      } else {
        handleSignOut();
      }
    } else {
      Alert.alert(
        'Sitzung läuft ab',
        'Session expires in 2 minutes',
        [
          {
            text: 'Abmelden',
            style: 'destructive',
            onPress: handleSignOut,
          },
          {
            text: 'Weiter arbeiten',
            onPress: handleExtendSession,
          },
        ],
        { cancelable: false }
      );
    }
  }, [signOut]);

  // Reset all timers
  const resetTimers = useCallback(() => {
    if (!enabled || !user) return;

    cleanup();
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Set warning timer (timeoutDuration - warningDuration)
    const warningTime = timeoutDuration - warningDuration;
    warningTimerRef.current = setTimeout(() => {
      showWarning();
    }, warningTime);

    // Set timeout timer
    timeoutTimerRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutDuration);

    // Set activity update timer
    activityUpdateTimerRef.current = setTimeout(() => {
      updateLastActivityInDB();
      // Reschedule the next update
      if (activityUpdateTimerRef.current) {
        activityUpdateTimerRef.current = setTimeout(updateLastActivityInDB, activityUpdateInterval);
      }
    }, activityUpdateInterval);

    SecureLogger.log('Session timeout timers reset');
  }, [enabled, user, timeoutDuration, warningDuration, activityUpdateInterval, showWarning, handleTimeout, updateLastActivityInDB, cleanup]);

  // Activity handler
  const handleActivity = useCallback(() => {
    if (!enabled || !user) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if enough time has passed to avoid too frequent resets
    if (timeSinceLastActivity > 30000) { // 30 seconds threshold
      SecureLogger.log('User activity detected, resetting session timer');
      resetTimers();
    }
  }, [enabled, user, resetTimers]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled || !user) {
      cleanup();
      return;
    }

    // Activity event types to monitor
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'keydown',
      'touchstart',
      'touchmove',
      'click',
      'scroll',
    ];

    // Add event listeners for web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
      });
    }

    // For React Native, we'll rely on navigation and component interactions
    // The activity will be triggered by the resetTimers call in the effect below

    return () => {
      // Cleanup event listeners
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        activityEvents.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
      }
    };
  }, [enabled, user, handleActivity]);

  // Initialize timers when user is authenticated
  useEffect(() => {
    if (!enabled || !user) {
      cleanup();
      return;
    }

    SecureLogger.log('Initializing session timeout monitoring');
    resetTimers();
    updateLastActivityInDB(); // Initial activity update

    return cleanup;
  }, [enabled, user, resetTimers, updateLastActivityInDB, cleanup]);

  // Manual activity trigger for React Native components
  const triggerActivity = useCallback(() => {
    handleActivity();
  }, [handleActivity]);

  return {
    triggerActivity,
    cleanup,
    isEnabled: enabled && !!user,
  };
};

export default useSessionTimeout;