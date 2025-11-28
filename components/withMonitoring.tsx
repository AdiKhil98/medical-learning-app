/**
 * Combined Monitoring HOC
 *
 * Wraps components with both error boundaries and performance tracking.
 * This is the recommended way to add monitoring to screens.
 *
 * Usage:
 *   export default withMonitoring(MyScreen, 'My Screen');
 *
 *   // Replaces:
 *   // export default withErrorBoundary(
 *   //   withPerformanceTracking(MyScreen, 'My Screen'),
 *   //   'My Screen'
 *   // );
 */

import React, { ComponentType } from 'react';
import { withErrorBoundary } from './withErrorBoundary';
import { withPerformanceTracking } from './withPerformanceTracking';

interface MonitoringOptions {
  name: string;
  trackPerformance?: boolean;
  trackErrors?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Wrap component with both error boundary and performance tracking
 */
export function withMonitoring<P extends object>(
  Component: ComponentType<P>,
  options: MonitoringOptions | string
): ComponentType<P> {
  const config: MonitoringOptions =
    typeof options === 'string'
      ? { name: options, trackPerformance: true, trackErrors: true }
      : { trackPerformance: true, trackErrors: true, ...options };

  let WrappedComponent = Component;

  // Add performance tracking
  if (config.trackPerformance) {
    WrappedComponent = withPerformanceTracking(WrappedComponent, {
      name: config.name,
      trackScreenLoad: true,
      trackRender: true,
    });
  }

  // Add error boundary
  if (config.trackErrors) {
    WrappedComponent = withErrorBoundary(WrappedComponent, {
      screenName: config.name,
      onError: config.onError,
    });
  }

  return WrappedComponent;
}

export default withMonitoring;
