/**
 * Service Worker Registration
 *
 * Registers and manages the service worker for PWA functionality.
 * Provides offline support, caching, and background sync.
 */

import { logger } from './logger';

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(config?: ServiceWorkerConfig): Promise<void> {
  // Only register on web and in production
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    logger.info('Service Worker not supported in this environment');
    return;
  }

  // Only register in production to avoid caching issues in development
  if (process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_APP_ENV !== 'production') {
    logger.info('Service Worker registration skipped in development');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    logger.info('Service Worker registered successfully', {
      scope: registration.scope,
      active: !!registration.active,
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            logger.info('New service worker available');
            config?.onUpdate?.(registration);
          } else {
            // Service worker installed for first time
            logger.info('Service worker installed for first time');
            config?.onSuccess?.(registration);
          }
        }
      });
    });

    // Handle errors
    navigator.serviceWorker.addEventListener('error', (error) => {
      logger.error('Service Worker error', { error });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'CACHE_CLEARED') {
        logger.info('Service Worker: Cache cleared');
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      logger.info('App is online');
      config?.onOnline?.();
    });

    window.addEventListener('offline', () => {
      logger.info('App is offline');
      config?.onOffline?.();
    });
  } catch (error) {
    logger.error('Service Worker registration failed', { error });
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    logger.info('Service Worker unregistered');
  } catch (error) {
    logger.error('Service Worker unregister failed', { error });
  }
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'CLEAR_CACHE' });
    logger.info('Service Worker: Cache clear requested');
  } catch (error) {
    logger.error('Service Worker: Cache clear failed', { error });
  }
}

/**
 * Check if app is running as PWA
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Prompt user to install PWA
 */
export function promptPWAInstall(): void {
  if (typeof window === 'undefined') return;

  // Listen for beforeinstallprompt event
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    logger.info('PWA install prompt available');

    // Optionally, show install button or prompt
    // You can dispatch a custom event here to show UI
    window.dispatchEvent(new CustomEvent('pwainstallable'));
  });

  // Show install prompt when user clicks install button
  window.addEventListener('pwainstall', async () => {
    if (!deferredPrompt) {
      logger.warn('No install prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      logger.info('PWA install accepted');
    } else {
      logger.info('PWA install dismissed');
    }

    // Clear the deferred prompt
    deferredPrompt = null;
  });
}

/**
 * Check if app update is available
 */
export async function checkForAppUpdate(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();

    // Check if there's a waiting worker
    return !!registration.waiting;
  } catch (error) {
    logger.error('Update check failed', { error });
    return false;
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaitingAndReload(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if (registration.waiting) {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Wait for the new service worker to be activated
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page to use the new service worker
        window.location.reload();
      });
    }
  } catch (error) {
    logger.error('Skip waiting failed', { error });
  }
}
