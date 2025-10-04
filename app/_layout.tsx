import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { runGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

export default function RootLayout() {
  console.log('RootLayout rendering...');
  
  // Run global Voiceflow cleanup on app start (but not on simulation pages)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Small delay to ensure DOM is ready, then check if we should run cleanup
      setTimeout(() => {
        const currentPath = window.location?.pathname || '';
        const isSimulationPage = currentPath.includes('/simulation/');
        
        if (!isSimulationPage) {
          console.log('🧹 Root layout cleanup - not on simulation page');
          runGlobalVoiceflowCleanup();
        } else {
          console.log('🚫 Root layout - on simulation page, skipping cleanup');
        }
      }, 1000);
    }
  }, []);
  
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Stack
              screenOptions={{
                headerShown: false,  // Hide default headers globally
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/register" />
              <Stack.Screen name="auth/forgot-password" />
              <Stack.Screen name="auth/reset-password" />
              <Stack.Screen name="auth/verify-email" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="subscription" />
              <Stack.Screen name="updates" />
              <Stack.Screen name="bookmarks" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="feedback" />
              <Stack.Screen name="impressum" />
              <Stack.Screen name="haftung" />
              <Stack.Screen name="datenschutz-einstellungen" />
            </Stack>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
