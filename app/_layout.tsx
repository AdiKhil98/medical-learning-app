// TEMPORARY: Force console output for debugging
import '@/utils/forceConsole';

import { Stack, usePathname } from 'expo-router';
import { logger } from '@/utils/logger';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { runGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { preloadCriticalRoutes, trackNavigation } from '@/utils/routePreloader';
import { registerServiceWorker, checkForAppUpdate, skipWaitingAndReload } from '@/utils/serviceWorkerRegistration';
import { SessionTimeoutManager } from '@/lib/security';

export default function RootLayout() {
  logger.info('RootLayout rendering...');
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  // Preload critical routes on app init
  useEffect(() => {
    preloadCriticalRoutes();
    logger.info('🚀 Critical routes preloading initiated');
  }, []);

  // Register service worker for PWA functionality
  useEffect(() => {
    if (Platform.OS === 'web') {
      registerServiceWorker({
        onSuccess: (registration) => {
          logger.info('✅ Service Worker registered successfully');
        },
        onUpdate: (registration) => {
          logger.info('🔄 New app version available - auto-updating...');

          // Automatically skip waiting and reload to get new version
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });

            // Reload page when new service worker takes control
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              logger.info('♻️ New service worker activated - reloading...');
              window.location.reload();
            });
          }
        },
        onOffline: () => {
          logger.warn('📴 App is offline');
        },
        onOnline: () => {
          logger.info('🌐 App is online');
        },
      });

      // Check for updates every 5 minutes
      const updateCheckInterval = setInterval(
        async () => {
          logger.info('🔍 Checking for app updates...');
          const hasUpdate = await checkForAppUpdate();
          if (hasUpdate) {
            logger.info('📥 Update found! Auto-installing...');
            await skipWaitingAndReload();
          }
        },
        5 * 60 * 1000
      ); // 5 minutes

      return () => clearInterval(updateCheckInterval);
    }
  }, []);

  // Fix mobile viewport on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Add Google Fonts (Inter) import
      if (!document.getElementById('google-fonts-inter')) {
        const link = document.createElement('link');
        link.id = 'google-fonts-inter';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
        logger.info('✅ Google Fonts (Inter) loaded');
      }

      // Add mobile viewport fix styles using 2025 best practices
      const style = document.createElement('style');
      style.id = 'mobile-viewport-fix';
      style.textContent = `
        :root {
          --app-height: 100vh;
        }

        * {
          box-sizing: border-box;
        }

        html {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          width: 100%;
          overflow-x: hidden;
          -webkit-tap-highlight-color: transparent;
        }

        body {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-overflow-scrolling: touch;
        }

        /* Root container - prevent horizontal scroll */
        #root {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        /* Ensure all direct children respect container width */
        #root > * {
          max-width: 100vw;
          overflow-x: hidden;
        }

        /* Mobile-specific adjustments - 2025 best practices */
        @media screen and (max-width: 768px) {
          html {
            /* Use modern dynamic viewport height with fallbacks */
            height: 100vh; /* Fallback for older browsers */
            height: -webkit-fill-available; /* Safari fallback */
            height: var(--app-height); /* JavaScript fallback */
          }

          /* Modern browsers: use 100dvh (dynamic viewport height) */
          @supports (height: 100dvh) {
            html {
              height: 100dvh;
            }

            body {
              min-height: 100dvh;
            }

            #root {
              min-height: 100dvh;
            }
          }

          /* Older browsers: use CSS variables + JS */
          @supports not (height: 100dvh) {
            html {
              height: -webkit-fill-available;
            }

            body {
              min-height: 100vh;
              min-height: -webkit-fill-available;
              min-height: var(--app-height);
            }

            #root {
              min-height: 100vh;
              min-height: -webkit-fill-available;
              min-height: var(--app-height);
            }
          }

          body {
            overflow: auto;
            overscroll-behavior: none;
            touch-action: manipulation;
          }
        }
      `;
      if (!document.getElementById('mobile-viewport-fix')) {
        document.head.appendChild(style);
        logger.info('✅ Mobile viewport fix applied (2025 best practices)');
      }

      // JavaScript fallback: Set actual viewport height as CSS custom property
      // This handles iOS Safari address bar and works on all browsers
      const setAppHeight = () => {
        const vh = window.innerHeight;
        document.documentElement.style.setProperty('--app-height', `${vh}px`);
      };

      // Set on load
      setAppHeight();

      // Update on resize (handles orientation change and address bar show/hide)
      window.addEventListener('resize', setAppHeight);
      window.addEventListener('orientationchange', setAppHeight);

      // Reset scroll position on load
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;

      // Add cache control meta tags to prevent HTML caching
      const addMetaTag = (name: string, content: string) => {
        if (!document.querySelector(`meta[http-equiv="${name}"]`)) {
          const meta = document.createElement('meta');
          meta.httpEquiv = name;
          meta.content = content;
          document.head.appendChild(meta);
        }
      };

      addMetaTag('Cache-Control', 'no-cache, no-store, must-revalidate');
      addMetaTag('Pragma', 'no-cache');
      addMetaTag('Expires', '0');
      logger.info('✅ Cache control meta tags added - HTML will not be cached');
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

  // Track user activity for inactivity-based session timeout
  useEffect(() => {
    let lastActivityUpdate = Date.now();
    const THROTTLE_DELAY = 60 * 1000; // Update once per minute maximum

    const updateActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdate >= THROTTLE_DELAY) {
        lastActivityUpdate = now;
        SessionTimeoutManager.updateLastActivity().catch((error) => {
          logger.error('Failed to update activity timestamp', error);
        });
      }
    };

    if (Platform.OS === 'web') {
      // Web: Track mouse, keyboard, touch, and scroll events
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

      events.forEach((event) => {
        window.addEventListener(event, updateActivity, { passive: true });
      });

      logger.info('✅ Activity tracking initialized for web (throttled to 1 update/minute)');

      return () => {
        events.forEach((event) => {
          window.removeEventListener(event, updateActivity);
        });
        logger.info('🧹 Activity tracking cleaned up');
      };
    } else {
      // Mobile: Track app state changes (foreground/background)
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          updateActivity();
          logger.info('📱 App became active - activity updated');
        }
      });

      logger.info('✅ Activity tracking initialized for mobile (AppState monitoring)');

      return () => {
        subscription.remove();
        logger.info('🧹 Activity tracking cleaned up');
      };
    }
  }, []);

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
