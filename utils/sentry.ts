/**
 * Sentry Error Monitoring Configuration
 *
 * Production-ready error tracking with:
 * - Automatic error capture
 * - User context tracking
 * - Breadcrumbs for debugging
 * - Performance monitoring
 * - Release tracking
 * - Environment separation
 */

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

/**
 * Initialize Sentry
 * Call this once at app startup
 */
export function initializeSentry(): void {
  // Only initialize in production
  if (!isProduction) {
    console.log('📊 Sentry: Disabled in development mode');
    return;
  }

  // Check if DSN is configured
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('⚠️ Sentry: DSN not configured. Set EXPO_PUBLIC_SENTRY_DSN in .env');
    return;
  }

  try {
    Sentry.init({
      // Sentry DSN from environment variables
      dsn,

      // Enable in production only
      enabled: isProduction,

      // Environment
      environment: isProduction ? 'production' : 'development',

      // App version and release tracking
      release: process.env.EXPO_PUBLIC_APP_VERSION || 'unknown',
      dist: process.env.EXPO_PUBLIC_BUILD_NUMBER || '1',

      // Performance monitoring (10% of transactions)
      tracesSampleRate: 0.1,

      // Attach stack traces to all messages
      attachStacktrace: true,

      // Enable automatic session tracking
      enableAutoSessionTracking: true,

      // Session tracking interval (30 seconds)
      sessionTrackingIntervalMillis: 30000,

      // Maximum breadcrumbs to keep
      maxBreadcrumbs: 50,

      // Before send callback - filter sensitive data
      beforeSend(event, hint) {
        // Remove sensitive data from event
        if (event.user) {
          // Remove email from user context (keep user ID only)
          delete event.user.email;
        }

        // Remove query parameters from URLs (might contain tokens)
        if (event.request?.url) {
          event.request.url = event.request.url.split('?')[0];
        }

        // Filter out non-error console messages in production
        if (event.level === 'log' || event.level === 'info') {
          return null;
        }

        return event;
      },

      // Before breadcrumb callback - filter sensitive breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Remove query parameters from navigation breadcrumbs
        if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
          breadcrumb.data.to = breadcrumb.data.to.split('?')[0];
        }

        // Remove sensitive console logs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }

        return breadcrumb;
      },

      // Integrations
      integrations: [
        // React Native specific integrations
        new Sentry.ReactNativeTracing({
          // Routing instrumentation for Expo Router
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),

          // Track screen performance
          enableStallTracking: true,

          // Enable user interaction tracking
          enableUserInteractionTracing: true,
        }),
      ],

      // Platform-specific options
      ...(Platform.OS === 'web' ? {
        // Web-specific options
        normalizeDepth: 6,
      } : {}),
    });

    console.log('✅ Sentry: Initialized successfully');
  } catch (error) {
    console.error('❌ Sentry: Initialization failed:', error);
  }
}

/**
 * Set user context for error tracking
 * Call this after user logs in
 */
export function setSentryUser(userId: string, email?: string): void {
  try {
    Sentry.setUser({
      id: userId,
      // Only include email in development
      ...(isDevelopment && email ? { email } : {}),
    });
  } catch (error) {
    console.error('❌ Sentry: Failed to set user:', error);
  }
}

/**
 * Clear user context
 * Call this when user logs out
 */
export function clearSentryUser(): void {
  try {
    Sentry.setUser(null);
  } catch (error) {
    console.error('❌ Sentry: Failed to clear user:', error);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    console.error('❌ Sentry: Failed to add breadcrumb:', error);
  }
}

/**
 * Capture exception
 * Use this to manually report errors
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  try {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  } catch (err) {
    console.error('❌ Sentry: Failed to capture exception:', err);
  }
}

/**
 * Capture message
 * Use this to manually report messages
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  try {
    Sentry.captureMessage(message, {
      level,
      contexts: {
        custom: context,
      },
    });
  } catch (error) {
    console.error('❌ Sentry: Failed to capture message:', error);
  }
}

/**
 * Set custom tag
 */
export function setSentryTag(key: string, value: string): void {
  try {
    Sentry.setTag(key, value);
  } catch (error) {
    console.error('❌ Sentry: Failed to set tag:', error);
  }
}

/**
 * Set custom context
 */
export function setSentryContext(
  key: string,
  value: Record<string, any>
): void {
  try {
    Sentry.setContext(key, value);
  } catch (error) {
    console.error('❌ Sentry: Failed to set context:', error);
  }
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction | null {
  try {
    return Sentry.startTransaction({
      name,
      op,
    });
  } catch (error) {
    console.error('❌ Sentry: Failed to start transaction:', error);
    return null;
  }
}

/**
 * Wrap async function with Sentry error tracking
 */
export function withSentryErrorTracking<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return fn().catch((error) => {
    captureException(error instanceof Error ? error : new Error(String(error)), context);
    throw error;
  });
}

// Export Sentry for advanced usage
export { Sentry };

// Type exports
export type { SeverityLevel } from '@sentry/react-native';
