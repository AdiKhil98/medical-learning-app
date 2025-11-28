/**
 * Higher-Order Component for Error Boundaries
 *
 * Wraps any component with ScreenErrorBoundary for easy error tracking.
 *
 * Usage:
 *   export default withErrorBoundary(MyScreen, 'My Screen Name');
 *
 *   // Or with options:
 *   export default withErrorBoundary(MyScreen, {
 *     screenName: 'My Screen',
 *     onError: (error, errorInfo) => console.log('Custom handler'),
 *   });
 */

import React, { ComponentType } from 'react';
import { ScreenErrorBoundary } from './ScreenErrorBoundary';

interface ErrorBoundaryOptions {
  screenName: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: React.ReactNode;
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: ErrorBoundaryOptions | string
): ComponentType<P> {
  const config: ErrorBoundaryOptions =
    typeof options === 'string' ? { screenName: options } : options;

  const WrappedComponent = (props: P) => (
    <ScreenErrorBoundary
      screenName={config.screenName}
      onError={config.onError}
      fallback={config.fallback}
    >
      <Component {...props} />
    </ScreenErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default withErrorBoundary;
