import { Stack, usePathname } from 'expo-router';
import { logger } from '@/utils/logger';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { runGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

export default function RootLayout() {
  logger.info('RootLayout rendering...');
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  // Fix mobile viewport on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Add mobile viewport fix styles
      const style = document.createElement('style');
      style.id = 'mobile-viewport-fix';
      style.textContent = `
        html {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          width: 100%;
        }
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }
      `;
      if (!document.getElementById('mobile-viewport-fix')) {
        document.head.appendChild(style);
        logger.info('✅ Mobile viewport fix applied');
      }
    }
  }, []);

  // Run global Voiceflow cleanup on app start (but not on simulation pages)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Small delay to ensure DOM is ready, then check if we should run cleanup
      setTimeout(() => {
        const currentPath = window.location?.pathname || '';
        const isSimulationPage = currentPath.includes('/simulation/');

        if (!isSimulationPage) {
          logger.info('🧹 Root layout cleanup - not on simulation page');
          runGlobalVoiceflowCleanup();
        } else {
          logger.info('🚫 Root layout - on simulation page, skipping cleanup');
        }
      }, 1000);
    }
  }, []);

  // Clean up Voiceflow widget when navigating away from simulation pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = pathname || window.location?.pathname || '';
      const previousPath = previousPathRef.current || '';

      const wasOnSimulationPage = previousPath.includes('/simulation/kp') || previousPath.includes('/simulation/fsp');
      const isOnSimulationPage = currentPath.includes('/simulation/kp') || currentPath.includes('/simulation/fsp');

      // If we were on a simulation page and now we're not, run cleanup
      if (wasOnSimulationPage && !isOnSimulationPage) {
        logger.info('🔄 Navigated away from simulation page, running cleanup...');
        setTimeout(() => {
          runGlobalVoiceflowCleanup(true); // Force cleanup
        }, 100);
      }

      // Update previous path
      previousPathRef.current = currentPath;
    }
  }, [pathname]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Stack
              screenOptions={{
                headerShown: false, // Hide default headers globally
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
