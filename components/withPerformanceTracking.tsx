/**
 * Higher-Order Component for Performance Tracking
 *
 * Wraps components to automatically track:
 * - Screen load times
 * - Render performance
 *
 * Usage:
 *   export default withPerformanceTracking(MyScreen, 'My Screen');
 *
 *   // Or combine with error boundary:
 *   export default withErrorBoundary(
 *     withPerformanceTracking(MyScreen, 'My Screen'),
 *     'My Screen'
 *   );
 */

import React, { ComponentType, useEffect, useRef } from 'react';
import { performanceTracker } from '@/utils/performanceTracking';

interface PerformanceTrackingOptions {
  name: string;
  trackScreenLoad?: boolean;
  trackRender?: boolean;
}

export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  options: PerformanceTrackingOptions | string
): ComponentType<P> {
  const config: PerformanceTrackingOptions =
    typeof options === 'string'
      ? { name: options, trackScreenLoad: true, trackRender: true }
      : { trackScreenLoad: true, trackRender: true, ...options };

  const WrappedComponent = (props: P) => {
    const screenLoadTracker = useRef<{ end: () => void } | null>(null);
    const renderStartTime = useRef(Date.now());
    const isMounted = useRef(false);

    // Track screen load time
    useEffect(() => {
      if (config.trackScreenLoad && !isMounted.current) {
        screenLoadTracker.current = performanceTracker.startScreenLoad(
          config.name
        );
      }

      return () => {
        if (screenLoadTracker.current) {
          screenLoadTracker.current.end();
        }
      };
    }, []);

    // Track render time
    useEffect(() => {
      if (config.trackRender) {
        const renderDuration = Date.now() - renderStartTime.current;
        if (!isMounted.current) {
          // Only track initial render
          performanceTracker.trackRender(config.name, renderDuration);
          isMounted.current = true;
        }
      }
    });

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceTracking(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Hook to manually track render performance
 * Usage: useRenderPerformance('MyComponent');
 */
export function useRenderPerformance(componentName: string) {
  const renderStartTime = useRef(Date.now());
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      const duration = Date.now() - renderStartTime.current;
      performanceTracker.trackRender(componentName, duration);
      hasTracked.current = true;
    }
  });
}

/**
 * Hook to manually track screen load time
 * Usage: useScreenLoadPerformance('Home Screen');
 */
export function useScreenLoadPerformance(screenName: string) {
  const tracker = useRef<{ end: () => void } | null>(null);

  useEffect(() => {
    tracker.current = performanceTracker.startScreenLoad(screenName);

    return () => {
      if (tracker.current) {
        tracker.current.end();
      }
    };
  }, [screenName]);
}

export default withPerformanceTracking;
