/**
 * Performance Monitoring Dashboard
 *
 * Real-time performance metrics tracking and reporting
 *
 * Metrics tracked:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Custom performance marks
 * - API response times
 * - Bundle load times
 * - Memory usage
 */

import { logger } from './logger';
import { trackEvent } from './analytics';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private marks: Map<string, number> = new Map();
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializePerformanceObserver();
    }
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    // LCP - Largest Contentful Paint
    this.observeLCP();

    // FID - First Input Delay (deprecated, use INP)
    this.observeFID();

    // CLS - Cumulative Layout Shift
    this.observeCLS();

    // FCP - First Contentful Paint
    this.observeFCP();

    // TTFB - Time to First Byte
    this.observeTTFB();
  }

  /**
   * Initialize Performance Observer for resource timing
   */
  private initializePerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.reportNavigationTiming(entry as PerformanceNavigationTiming);
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.reportResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      logger.warn('Failed to initialize PerformanceObserver', { error });
    }
  }

  /**
   * Observe Largest Contentful Paint (LCP)
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        if (lastEntry) {
          const lcp = lastEntry.startTime;
          this.reportMetric('LCP', lcp);
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      logger.warn('Failed to observe LCP', { error });
    }
  }

  /**
   * Observe First Input Delay (FID)
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          this.reportMetric('FID', fid);
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      logger.warn('Failed to observe FID', { error });
    }
  }

  /**
   * Observe Cumulative Layout Shift (CLS)
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }

        this.reportMetric('CLS', clsValue);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      logger.warn('Failed to observe CLS', { error });
    }
  }

  /**
   * Observe First Contentful Paint (FCP)
   */
  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.reportMetric('FCP', entry.startTime);
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      logger.warn('Failed to observe FCP', { error });
    }
  }

  /**
   * Observe Time to First Byte (TTFB)
   */
  private observeTTFB(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        this.reportMetric('TTFB', ttfb);
      }
    } catch (error) {
      logger.warn('Failed to observe TTFB', { error });
    }
  }

  /**
   * Report a performance metric
   */
  private reportMetric(name: string, value: number): void {
    const rating = this.getRating(name, value);

    const metric: PerformanceMetric = {
      name,
      value: Math.round(value),
      rating,
      timestamp: Date.now(),
    };

    this.metrics.set(name, metric);

    // Log metric
    logger.info(`Performance metric: ${name}`, {
      value: metric.value,
      rating: metric.rating,
    });

    // Track in analytics
    trackEvent('performance_metric', {
      metric_name: name,
      metric_value: metric.value,
      metric_rating: rating,
    });
  }

  /**
   * Get rating for a metric based on Core Web Vitals thresholds
   */
  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 }, // milliseconds
      FID: { good: 100, poor: 300 }, // milliseconds
      CLS: { good: 0.1, poor: 0.25 }, // score
      FCP: { good: 1800, poor: 3000 }, // milliseconds
      TTFB: { good: 800, poor: 1800 }, // milliseconds
      INP: { good: 200, poor: 500 }, // milliseconds
    };

    const threshold = thresholds[name];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Report navigation timing
   */
  private reportNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connection: entry.connectEnd - entry.connectStart,
      request_time: entry.responseStart - entry.requestStart,
      response_time: entry.responseEnd - entry.responseStart,
      dom_processing: entry.domComplete - entry.domInteractive,
      dom_content_loaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load_complete: entry.loadEventEnd - entry.loadEventStart,
      total_load_time: entry.loadEventEnd - entry.fetchStart,
    };

    logger.info('Navigation timing metrics', metrics);

    // Track total load time
    trackEvent('page_load_complete', {
      total_load_time: metrics.total_load_time,
      dom_content_loaded: metrics.dom_content_loaded,
    });
  }

  /**
   * Report resource timing (for slow resources)
   */
  private reportResourceTiming(entry: PerformanceResourceTiming): void {
    const duration = entry.duration;

    // Only report slow resources (>500ms)
    if (duration > 500) {
      logger.warn('Slow resource detected', {
        name: entry.name,
        duration: Math.round(duration),
        type: entry.initiatorType,
      });

      trackEvent('slow_resource', {
        resource_name: entry.name,
        resource_type: entry.initiatorType,
        duration: Math.round(duration),
      });
    }
  }

  /**
   * Start a custom performance mark
   */
  mark(name: string): void {
    if (!this.enabled) return;

    this.marks.set(name, performance.now());

    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    if (!this.enabled) return null;

    const startTime = this.marks.get(startMark);
    if (!startTime) {
      logger.warn('Start mark not found', { startMark });
      return null;
    }

    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    if (!endTime) {
      logger.warn('End mark not found', { endMark });
      return null;
    }

    const duration = endTime - startTime;

    logger.info(`Performance measure: ${name}`, {
      duration: Math.round(duration),
    });

    trackEvent('performance_measure', {
      measure_name: name,
      duration: Math.round(duration),
    });

    return duration;
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): Map<string, PerformanceMetric> {
    return this.metrics;
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.marks.clear();

    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    good: number;
    needsImprovement: number;
    poor: number;
    total: number;
  } {
    const summary = {
      good: 0,
      needsImprovement: 0,
      poor: 0,
      total: this.metrics.size,
    };

    for (const metric of this.metrics.values()) {
      if (metric.rating === 'good') summary.good++;
      else if (metric.rating === 'needs-improvement') summary.needsImprovement++;
      else summary.poor++;
    }

    return summary;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const markPerformance = (name: string) => performanceMonitor.mark(name);
export const measurePerformance = (name: string, startMark: string, endMark?: string) =>
  performanceMonitor.measure(name, startMark, endMark);
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceSummary = () => performanceMonitor.getSummary();
