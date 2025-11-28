/**
 * Performance Tracking Utility
 *
 * Automatically tracks and stores performance metrics for monitoring:
 * - Screen load times
 * - API call performance
 * - Render performance
 * - Performance budget violations
 *
 * Integrates with MonitoringDashboard and PostHog Analytics.
 *
 * Usage:
 *   import { performanceTracker } from '@/utils/performanceTracking';
 *
 *   // Track screen load
 *   const tracker = performanceTracker.startScreenLoad('Home');
 *   // ... screen loads
 *   tracker.end();
 *
 *   // Track API call
 *   performanceTracker.trackApiCall('/api/users', 'GET', 245);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { analytics, AnalyticsEvent } from './analytics';

// ===== STORAGE KEYS =====
const STORAGE_KEYS = {
  ERRORS: '@monitoring/errors',
  SCREEN_LOADS: '@monitoring/screen_loads',
  API_CALLS: '@monitoring/api_calls',
  RENDER_PERFORMANCE: '@monitoring/render_performance',
  BUDGET_VIOLATIONS: '@monitoring/budget_violations',
};

// ===== PERFORMANCE BUDGETS =====
export const PERFORMANCE_BUDGETS = {
  // Screen load time budgets (ms)
  SCREEN_LOAD: {
    GOOD: 1000, // < 1s is good
    ACCEPTABLE: 2500, // < 2.5s is acceptable
    POOR: 5000, // > 5s is poor
  },
  // API call budgets (ms)
  API_CALL: {
    GOOD: 500,
    ACCEPTABLE: 1500,
    POOR: 3000,
  },
  // Render time budgets (ms)
  RENDER: {
    GOOD: 16, // 60fps
    ACCEPTABLE: 33, // 30fps
    POOR: 100,
  },
};

// ===== TYPES =====
interface ScreenLoadMetric {
  screen: string;
  duration: number;
  timestamp: string;
  budget: 'good' | 'acceptable' | 'poor';
}

interface ApiCallMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode?: number;
  timestamp: string;
  budget: 'good' | 'acceptable' | 'poor';
}

interface RenderMetric {
  component: string;
  duration: number;
  timestamp: string;
}

interface BudgetViolation {
  type: 'screen' | 'api' | 'render';
  name: string;
  duration: number;
  budget: number;
  timestamp: string;
}

interface ErrorRecord {
  screen: string;
  message: string;
  timestamp: string;
  errorType?: string;
}

// ===== PERFORMANCE TRACKER CLASS =====
class PerformanceTracker {
  private maxStoredMetrics = 1000; // Keep last 1000 metrics
  private enabled = true;

  /**
   * Track screen load time
   */
  startScreenLoad(screenName: string) {
    const startTime = Date.now();

    return {
      end: async () => {
        const duration = Date.now() - startTime;
        await this.recordScreenLoad(screenName, duration);
      },
    };
  }

  /**
   * Record screen load metric
   */
  private async recordScreenLoad(screen: string, duration: number) {
    if (!this.enabled) return;

    try {
      const budget = this.getScreenLoadBudget(duration);
      const metric: ScreenLoadMetric = {
        screen,
        duration,
        timestamp: new Date().toISOString(),
        budget,
      };

      // Store metric
      const existing = await this.getStoredMetrics(STORAGE_KEYS.SCREEN_LOADS);
      const updated = this.addAndTrimMetrics(existing.loads || [], metric);
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCREEN_LOADS,
        JSON.stringify({ loads: updated })
      );

      // Check budget violation
      if (budget === 'poor') {
        await this.recordBudgetViolation({
          type: 'screen',
          name: screen,
          duration,
          budget: PERFORMANCE_BUDGETS.SCREEN_LOAD.POOR,
          timestamp: new Date().toISOString(),
        });

        logger.warn('Screen load budget violated', {
          screen,
          duration,
          budget: PERFORMANCE_BUDGETS.SCREEN_LOAD.POOR,
        });
      }

      // Track to PostHog
      analytics.track(AnalyticsEvent.SCREEN_VIEW, {
        screen,
        loadTime: duration,
        loadTimeBudget: budget,
      });

      logger.performance(`Screen: ${screen}`, duration, { screen, budget });
    } catch (error) {
      logger.error('Failed to record screen load', error);
    }
  }

  /**
   * Track API call performance
   */
  async trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode?: number
  ) {
    if (!this.enabled) return;

    try {
      const budget = this.getApiCallBudget(duration);
      const metric: ApiCallMetric = {
        endpoint,
        method,
        duration,
        statusCode,
        timestamp: new Date().toISOString(),
        budget,
      };

      // Store metric
      const existing = await this.getStoredMetrics(STORAGE_KEYS.API_CALLS);
      const updated = this.addAndTrimMetrics(existing.calls || [], metric);
      await AsyncStorage.setItem(
        STORAGE_KEYS.API_CALLS,
        JSON.stringify({ calls: updated })
      );

      // Check budget violation
      if (budget === 'poor') {
        await this.recordBudgetViolation({
          type: 'api',
          name: `${method} ${endpoint}`,
          duration,
          budget: PERFORMANCE_BUDGETS.API_CALL.POOR,
          timestamp: new Date().toISOString(),
        });

        logger.warn('API call budget violated', {
          endpoint,
          method,
          duration,
          budget: PERFORMANCE_BUDGETS.API_CALL.POOR,
        });
      }

      logger.performance(`API: ${method} ${endpoint}`, duration, {
        endpoint,
        method,
        statusCode,
        budget,
      });
    } catch (error) {
      logger.error('Failed to track API call', error);
    }
  }

  /**
   * Track component render time
   */
  async trackRender(component: string, duration: number) {
    if (!this.enabled) return;

    try {
      const metric: RenderMetric = {
        component,
        duration,
        timestamp: new Date().toISOString(),
      };

      // Store metric
      const existing = await this.getStoredMetrics(
        STORAGE_KEYS.RENDER_PERFORMANCE
      );
      const updated = this.addAndTrimMetrics(existing.renders || [], metric);
      await AsyncStorage.setItem(
        STORAGE_KEYS.RENDER_PERFORMANCE,
        JSON.stringify({ renders: updated })
      );

      // Check budget violation
      const budget = this.getRenderBudget(duration);
      if (budget === 'poor') {
        await this.recordBudgetViolation({
          type: 'render',
          name: component,
          duration,
          budget: PERFORMANCE_BUDGETS.RENDER.POOR,
          timestamp: new Date().toISOString(),
        });

        logger.warn('Render budget violated', {
          component,
          duration,
          budget: PERFORMANCE_BUDGETS.RENDER.POOR,
        });
      }
    } catch (error) {
      logger.error('Failed to track render', error);
    }
  }

  /**
   * Record error for monitoring dashboard
   */
  async recordError(screen: string, message: string, errorType?: string) {
    if (!this.enabled) return;

    try {
      const errorRecord: ErrorRecord = {
        screen,
        message,
        errorType,
        timestamp: new Date().toISOString(),
      };

      const existing = await this.getStoredMetrics(STORAGE_KEYS.ERRORS);
      const updated = this.addAndTrimMetrics(
        existing.errors || [],
        errorRecord
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.ERRORS,
        JSON.stringify({ errors: updated })
      );
    } catch (error) {
      logger.error('Failed to record error', error);
    }
  }

  /**
   * Record budget violation
   */
  private async recordBudgetViolation(violation: BudgetViolation) {
    try {
      const existing = await this.getStoredMetrics(
        STORAGE_KEYS.BUDGET_VIOLATIONS
      );
      const updated = this.addAndTrimMetrics(
        existing.violations || [],
        violation,
        100 // Keep only last 100 violations
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.BUDGET_VIOLATIONS,
        JSON.stringify({ violations: updated })
      );

      // Track to PostHog for alerting
      analytics.track(AnalyticsEvent.ERROR_OCCURRED, {
        errorType: 'PerformanceBudgetViolation',
        violationType: violation.type,
        name: violation.name,
        duration: violation.duration,
        budget: violation.budget,
        exceedBy: violation.duration - violation.budget,
      });
    } catch (error) {
      logger.error('Failed to record budget violation', error);
    }
  }

  /**
   * Get stored metrics
   */
  private async getStoredMetrics(key: string): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Add metric and trim to max size
   */
  private addAndTrimMetrics(
    metrics: any[],
    newMetric: any,
    maxSize?: number
  ): any[] {
    const size = maxSize || this.maxStoredMetrics;
    const updated = [newMetric, ...metrics];
    return updated.slice(0, size);
  }

  /**
   * Get screen load budget category
   */
  private getScreenLoadBudget(duration: number): 'good' | 'acceptable' | 'poor' {
    if (duration < PERFORMANCE_BUDGETS.SCREEN_LOAD.GOOD) return 'good';
    if (duration < PERFORMANCE_BUDGETS.SCREEN_LOAD.ACCEPTABLE)
      return 'acceptable';
    return 'poor';
  }

  /**
   * Get API call budget category
   */
  private getApiCallBudget(duration: number): 'good' | 'acceptable' | 'poor' {
    if (duration < PERFORMANCE_BUDGETS.API_CALL.GOOD) return 'good';
    if (duration < PERFORMANCE_BUDGETS.API_CALL.ACCEPTABLE) return 'acceptable';
    return 'poor';
  }

  /**
   * Get render budget category
   */
  private getRenderBudget(duration: number): 'good' | 'acceptable' | 'poor' {
    if (duration < PERFORMANCE_BUDGETS.RENDER.GOOD) return 'good';
    if (duration < PERFORMANCE_BUDGETS.RENDER.ACCEPTABLE) return 'acceptable';
    return 'poor';
  }

  /**
   * Clear all metrics (for testing/debugging)
   */
  async clearMetrics() {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      logger.info('Performance metrics cleared');
    } catch (error) {
      logger.error('Failed to clear metrics', error);
    }
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    logger.info(`Performance tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// ===== SINGLETON INSTANCE =====
export const performanceTracker = new PerformanceTracker();

// ===== REACT HOOKS =====

/**
 * Hook to track screen load time automatically
 * Usage: useScreenLoadTracking('Home');
 */
export function useScreenLoadTracking(screenName: string) {
  const [tracker] = React.useState(() =>
    performanceTracker.startScreenLoad(screenName)
  );

  React.useEffect(() => {
    return () => {
      tracker.end();
    };
  }, [tracker]);
}

/**
 * Hook to track render performance
 * Usage: useRenderTracking('MyComponent');
 */
export function useRenderTracking(componentName: string) {
  const renderStart = React.useRef(Date.now());

  React.useEffect(() => {
    const duration = Date.now() - renderStart.current;
    performanceTracker.trackRender(componentName, duration);
  });
}

// Import React for hooks
import React from 'react';

export default performanceTracker;
