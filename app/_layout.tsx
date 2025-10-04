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
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/register" options={{ headerShown: false }} />
              <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
              <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
              <Stack.Screen name="auth/verify-email" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="subscription" options={{ headerShown: false }} />
            </Stack>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
