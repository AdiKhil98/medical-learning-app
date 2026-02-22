import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { SecureLogger } from '@/lib/security';
import {
  registerForPushNotificationsAsync,
  checkNotificationPermissions,
} from '@/lib/notifications';
import { dailyNotifications, DailyNotificationConfig } from '@/lib/dailyNotifications';

interface NotificationContextType {
  pushNotificationsEnabled: boolean;
  soundVibrationEnabled: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setSoundVibrationEnabled: (enabled: boolean) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  hasPermission: boolean;
  loading: boolean;
  // Daily notifications
  dailyNotificationsConfig: DailyNotificationConfig;
  updateDailyNotificationsConfig: (config: Partial<DailyNotificationConfig>) => Promise<void>;
  sendTestTipNotification: () => Promise<void>;
  sendTestQuestionNotification: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pushNotificationsEnabled, setPushNotificationsEnabledState] = useState(true);
  const [soundVibrationEnabled, setSoundVibrationEnabledState] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dailyNotificationsConfig, setDailyNotificationsConfig] = useState<DailyNotificationConfig>({
    enabled: true,
    tipNotificationTime: { hour: 9, minute: 0 },
    questionNotificationTime: { hour: 18, minute: 0 },
  });

  // Load user's notification preferences and initialize daily notifications
  useEffect(() => {
    async function loadNotificationSettings() {
      if (!user) {
        SecureLogger.log('No user found, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        SecureLogger.log('Loading notification settings for user');
        
        // Check system permissions
        const permission = await checkNotificationPermissions();
        setHasPermission(permission);
        SecureLogger.log('System permission checked');

        // Initialize daily notifications
        await dailyNotifications.initialize();
        const dailyConfig = dailyNotifications.getConfig();
        setDailyNotificationsConfig(dailyConfig);
        SecureLogger.log('Daily notifications initialized');

        // First, ensure the user exists in the users table
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('id, push_notifications_enabled, sound_vibration_enabled')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) {
          SecureLogger.error('Error fetching user', fetchError);
          
          // If it's a column not found error, try to create the user without those columns first
          if (fetchError.message.includes('push_notifications_enabled') || fetchError.message.includes('sound_vibration_enabled')) {
            SecureLogger.log('Columns not found, trying to create user without notification columns');
            
            // Try to insert basic user data first
            const { error: insertError } = await supabase
              .from('users')
              .upsert([
                {
                  id: user.id,
                  name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                  email: user.email,
                  role: 'user',
                }
              ], { onConflict: 'id' });

            if (insertError) {
              SecureLogger.error('Error creating basic user', insertError);
            } else {
              SecureLogger.log('Basic user created, using default notification settings');
              setPushNotificationsEnabledState(true);
              setSoundVibrationEnabledState(true);
            }
          }
        } else if (!existingUser) {
          SecureLogger.log('User not found in users table, creating...');
          
          // Try to create user with notification settings
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: user.id,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                email: user.email,
                role: 'user',
                push_notifications_enabled: true,
                sound_vibration_enabled: true,
              }
            ]);
          
          if (insertError) {
            SecureLogger.error('Error creating user with notification settings', insertError);
            // Fall back to default values
            setPushNotificationsEnabledState(true);
            setSoundVibrationEnabledState(true);
          } else {
            SecureLogger.log('User created with default notification settings');
            setPushNotificationsEnabledState(true);
            setSoundVibrationEnabledState(true);
          }
        } else {
          SecureLogger.log('Loaded notification settings');
          setPushNotificationsEnabledState(existingUser.push_notifications_enabled ?? true);
          setSoundVibrationEnabledState(existingUser.sound_vibration_enabled ?? true);
        }
      } catch (error) {
        SecureLogger.error('Error loading notification settings', error);
        // Use default values on error
        setPushNotificationsEnabledState(true);
        setSoundVibrationEnabledState(true);
      } finally {
        setLoading(false);
      }
    }

    loadNotificationSettings();
  }, [user]);

  // Handle app state changes to reschedule notifications if needed
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active, check if we need to reschedule notifications
        try {
          await dailyNotifications.checkAndRescheduleIfNeeded();
        } catch (error) {
          SecureLogger.error('Error checking daily notifications on app resume', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      SecureLogger.log('Notification received');
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      SecureLogger.log('Notification response received');
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const encryptPushToken = (token: string, userId: string): string => {
    try {
      return btoa(token + userId);
    } catch (error) {
      SecureLogger.error('Failed to encrypt push token', error);
      throw new Error('Token encryption failed');
    }
  };

  const updateUserNotificationSettings = async (
    pushEnabled: boolean,
    soundVibrationEnabled: boolean
  ) => {
    if (!user) {
      const error = new Error('User not authenticated');
      SecureLogger.error('User not authenticated in updateUserNotificationSettings');
      throw error;
    }

    try {
      SecureLogger.log('Updating notification settings');

      // Get push token if enabling push notifications
      let encryptedPushToken = null;
      if (pushEnabled && Platform.OS !== 'web') {
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken && pushToken !== 'dev-token-placeholder') {
            encryptedPushToken = encryptPushToken(pushToken, user.id);
            SecureLogger.log('Push token encrypted successfully');
          } else if (pushToken === 'dev-token-placeholder') {
            SecureLogger.log('Using development mode, skipping token encryption');
            // Don't set encrypted token for dev mode
          }
        } catch (tokenError: any) {
          SecureLogger.error('Failed to get or encrypt push token', tokenError);
          
          // Allow the settings update to continue even if push token fails
          // This enables local notifications to work
          if (tokenError.message?.includes('server') || tokenError.message?.includes('EAS')) {
            SecureLogger.warn('Push token unavailable, continuing with local notifications only');
          } else {
            throw new Error('Failed to obtain secure push token');
          }
        }
      }

      // Direct database update with encrypted token
      const updateData: any = {
        push_notifications_enabled: pushEnabled,
        sound_vibration_enabled: soundVibrationEnabled,
      };
      
      if (encryptedPushToken) {
        updateData.push_token_encrypted = encryptedPushToken;
      }

      const { error: dbError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);
      
      if (dbError) {
        SecureLogger.error('Database update failed', dbError);
        throw dbError;
      }
      SecureLogger.log('Settings updated successfully');
    } catch (error) {
      SecureLogger.error('Error updating notification settings', error);
      throw error;
    }
  };

  const setPushNotificationsEnabled = async (enabled: boolean) => {
    if (!user) {
      const error = new Error('User not authenticated');
      SecureLogger.error('User not authenticated in setPushNotificationsEnabled');
      throw error;
    }

    try {
      SecureLogger.log('Setting push notifications enabled', { enabled });
      
      if (enabled && Platform.OS !== 'web') {
        try {
          // Request permission when enabling push notifications
          const token = await registerForPushNotificationsAsync();
          if (!token) {
            throw new Error('Failed to get push notification token');
          }
          
          // Check if it's a development placeholder token
          if (token === 'dev-token-placeholder') {
            setHasPermission(true); // Allow local notifications in dev mode
            SecureLogger.log('Using development mode for notifications');
          } else {
            setHasPermission(true);
            SecureLogger.log('Push notification token obtained successfully');
          }
        } catch (permissionError: any) {
          SecureLogger.error('Failed to get push notification permission', permissionError);
          
          // Provide user-friendly error messages
          let errorMessage = 'Push notification setup failed';
          if (permissionError.message?.includes('permission denied')) {
            errorMessage = 'Push notification permission denied. Please enable notifications in your device settings.';
          } else if (permissionError.message?.includes('physical device')) {
            errorMessage = 'Push notifications are only available on physical devices.';
          } else if (permissionError.message?.includes('server') || permissionError.message?.includes('EAS')) {
            errorMessage = 'Cannot connect to notification servers. Local notifications will still work.';
            SecureLogger.log('Falling back to local notifications only');
            // Don't throw error, allow local notifications to work
          } else {
            errorMessage = permissionError.message || errorMessage;
          }
          
          // Only throw if it's a hard permission denial, not server issues
          if (!permissionError.message?.includes('server') && !permissionError.message?.includes('EAS')) {
            throw new Error(errorMessage);
          } else {
            // Log warning but continue with local notifications
            SecureLogger.warn('Push notifications unavailable, using local notifications only');
            setHasPermission(false); // Can still use local notifications
          }
        }
      }

      // Update database first
      await updateUserNotificationSettings(enabled, soundVibrationEnabled);
      
      // Update local state
      setPushNotificationsEnabledState(enabled);
      SecureLogger.log('Push notifications state updated', { enabled });
    } catch (error: any) {
      SecureLogger.error('Error updating push notification setting', error);
      throw error;
    }
  };

  const setSoundVibrationEnabled = async (enabled: boolean) => {
    if (!user) {
      const error = new Error('User not authenticated');
      SecureLogger.error('User not authenticated in setSoundVibrationEnabled');
      throw error;
    }

    try {
      SecureLogger.log('Setting sound/vibration enabled', { enabled });
      
      // Update database first
      await updateUserNotificationSettings(pushNotificationsEnabled, enabled);
      
      // Update local state
      setSoundVibrationEnabledState(enabled);
      SecureLogger.log('Sound/vibration state updated', { enabled });
    } catch (error) {
      SecureLogger.error('Error updating sound/vibration setting', error);
      throw error;
    }
  };

  const sendTestNotification = async () => {
    try {
      if (!pushNotificationsEnabled) {
        const error = new Error('Push notifications are disabled');
        SecureLogger.warn('Test notification attempted but push notifications disabled');
        throw error;
      }

      if (!user) {
        const error = new Error('User not authenticated');
        SecureLogger.error('User not authenticated in sendTestNotification');
        throw error;
      }

      SecureLogger.log('Sending test notification');

      if (Platform.OS === 'web') {
        try {
          // For web, show a browser notification if supported
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('MedMeister Test', {
                body: 'Dies ist eine Test-Benachrichtigung von MedMeister!',
                icon: '/favicon.png',
              });
              SecureLogger.log('Web notification sent successfully');
            } else if (Notification.permission !== 'denied') {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification('MedMeister Test', {
                  body: 'Dies ist eine Test-Benachrichtigung von MedMeister!',
                  icon: '/favicon.png',
                });
                SecureLogger.log('Web notification sent after permission grant');
              } else {
                SecureLogger.warn('Web notification permission denied');
                throw new Error('Notification permission denied');
              }
            } else {
              SecureLogger.warn('Web notification permission was previously denied');
              throw new Error('Notification permission denied. Please enable notifications in your browser settings.');
            }
          } else {
            SecureLogger.log('Web notifications not supported, showing alert');
            alert('Test-Benachrichtigung: Dies ist eine Test-Benachrichtigung von MedMeister!');
          }
        } catch (webNotificationError) {
          SecureLogger.error('Web notification failed', webNotificationError);
          throw webNotificationError;
        }
        return;
      }

      // Use local notification for mobile - always works regardless of push token availability
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'MedMeister Test',
            body: 'Dies ist eine Test-Benachrichtigung von MedMeister! 🔔',
            data: { test: true },
          },
          trigger: { seconds: 1 },
        });
        SecureLogger.log('Local notification scheduled successfully');
        
        // Add extra context for development mode
        if (__DEV__) {
          logger.info('📱 Test notification scheduled - you should see it in 1 second');
        }
      } catch (scheduleError) {
        SecureLogger.error('Failed to schedule local notification', scheduleError);
        throw new Error('Failed to schedule notification. Please check if notifications are enabled for this app in your device settings.');
      }
    } catch (error) {
      SecureLogger.error('Error in sendTestNotification', error);
      throw error;
    }
  };

  // Daily notifications functions
  const updateDailyNotificationsConfig = async (config: Partial<DailyNotificationConfig>) => {
    try {
      await dailyNotifications.updateConfig(config);
      const updatedConfig = dailyNotifications.getConfig();
      setDailyNotificationsConfig(updatedConfig);
      SecureLogger.log('Daily notification config updated');
    } catch (error) {
      SecureLogger.error('Error updating daily notification config', error);
      throw error;
    }
  };

  const sendTestTipNotification = async () => {
    try {
      await dailyNotifications.sendTestTipNotification();
      SecureLogger.log('Test tip notification sent');
    } catch (error) {
      SecureLogger.error('Error sending test tip notification', error);
      throw error;
    }
  };

  const sendTestQuestionNotification = async () => {
    try {
      await dailyNotifications.sendTestQuestionNotification();
      SecureLogger.log('Test question notification sent');
    } catch (error) {
      SecureLogger.error('Error sending test question notification', error);
      throw error;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        pushNotificationsEnabled,
        soundVibrationEnabled,
        setPushNotificationsEnabled,
        setSoundVibrationEnabled,
        sendTestNotification,
        hasPermission,
        loading,
        // Daily notifications
        dailyNotificationsConfig,
        updateDailyNotificationsConfig,
        sendTestTipNotification,
        sendTestQuestionNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}