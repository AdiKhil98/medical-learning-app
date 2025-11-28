/**
 * Lazy Loading Utility
 *
 * Cross-platform lazy loading for React components.
 * Works with both web and React Native.
 *
 * Features:
 * - Automatic code splitting
 * - Loading states
 * - Error boundaries
 * - Preloading support
 *
 * Usage:
 *   const LazyScreen = lazyLoad(() => import('./screens/HeavyScreen'));
 *
 *   // With custom loading message
 *   const LazyAdmin = lazyLoad(
 *     () => import('./screens/Admin'),
 *     { message: 'Admin-Panel wird geladen...' }
 *   );
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { LazyLoadFallback } from '@/components/LazyLoadFallback';
import { logger } from './logger';

interface LazyLoadOptions {
  message?: string;
  fullScreen?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Lazy load a component with automatic code splitting
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFunc);

  const { message, fullScreen = true, onError } = options;

  return (props: React.ComponentProps<T>) => (
    <Suspense
      fallback={<LazyLoadFallback message={message} fullScreen={fullScreen} />}
    >
      <ErrorBoundaryWrapper onError={onError}>
        <LazyComponent {...props} />
      </ErrorBoundaryWrapper>
    </Suspense>
  );
}

/**
 * Preload a lazy component
 */
export function preload<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): void {
  importFunc()
    .then(() => {
      logger.info('Component preloaded successfully');
    })
    .catch((error) => {
      logger.error('Failed to preload component', error);
    });
}

/**
 * Error boundary wrapper for lazy loaded components
 */
class ErrorBoundaryWrapper extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    logger.error('Lazy load error', error);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <LazyLoadFallback
          message="Fehler beim Laden. Bitte neu laden."
          fullScreen={true}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Lazy load multiple components at once
 */
export function lazyLoadBatch(
  importFuncs: Array<() => Promise<{ default: ComponentType<any> }>>
): Promise<void> {
  return Promise.all(importFuncs.map((fn) => fn()))
    .then(() => {
      logger.info('Batch preload completed', {
        count: importFuncs.length,
      });
    })
    .catch((error) => {
      logger.error('Batch preload failed', error);
    });
}

export default lazyLoad;
