import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { SecureLogger } from './security';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Get user's sound/vibration preference from database
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    // Fetch user's notification preferences
    const { data: userData } = await supabase
      .from('users')
      .select('sound_vibration_enabled')
      .eq('id', user.id)
      .single();

    const soundVibrationEnabled = userData?.sound_vibration_enabled ?? true;

    return {
      shouldShowAlert: true,
      shouldPlaySound: soundVibrationEnabled,
      shouldSetBadge: false,
    };
  },
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (error) {
      SecureLogger.error('Failed to set notification channel', error);
    }
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        SecureLogger.warn('Notification permission not granted');
        throw new Error('Notification permission denied');
      }
      
      // Check if we have a valid project ID
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      // If no project ID or it's the placeholder, skip push token registration
      if (!projectId || projectId === 'your-project-id-here') {
        SecureLogger.warn('No valid EAS project ID found, skipping push token registration');
        if (__DEV__) {
          console.log('💡 To enable push notifications, set up EAS project and update app.json with real project ID');
        }
        return 'dev-token-placeholder'; // Return placeholder for dev mode
      }
      
      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = tokenResult.data;
        SecureLogger.log('Push token obtained successfully');
      } catch (tokenError: any) {
        SecureLogger.error('Failed to get push token from Expo servers', tokenError);
        
        // More specific error handling
        if (tokenError.message?.includes('server') || tokenError.code === 'ERR_NOTIFICATIONS_SERVER_ERROR') {
          throw new Error('Cannot connect to notification servers. Please check your internet connection and EAS configuration.');
        } else {
          throw new Error('Failed to register for push notifications. Please try again later.');
        }
      }
    } catch (error: any) {
      SecureLogger.error('Error in push notification registration', error);
      throw error;
    }
  } else {
    const message = 'Push notifications require a physical device';
    SecureLogger.warn(message);
    if (__DEV__) {
      console.log(message);
    }
    throw new Error(message);
  }

  return token;
}

export async function sendTestNotification(title: string, body: string) {
  if (Platform.OS === 'web') {
    if (__DEV__) {
      console.log('Test notification would be sent:', { title, body });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { test: true },
    },
    trigger: { seconds: 1 },
  });
}

export async function updateUserNotificationSettings(
  userId: string,
  pushEnabled: boolean,
  soundVibrationEnabled: boolean
) {
  const { error } = await supabase
    .from('users')
    .update({
      push_notifications_enabled: pushEnabled,
      sound_vibration_enabled: soundVibrationEnabled,
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  // If push notifications are being enabled, register for push token
  if (pushEnabled) {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      // Store the push token in the database for future use
      await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);
    }
  }
}

export async function checkNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web doesn't need explicit permission check
  }

  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}