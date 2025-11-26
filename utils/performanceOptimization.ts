/**
 * Performance Optimization Utilities
 *
 * Collection of hooks and utilities for React performance optimization:
 * - Debouncing and throttling
 * - Lazy loading helpers
 * - Virtual list optimization
 * - Performance monitoring
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { logger } from './logger';

/**
 * Debounce hook - delays execution until after wait time has elapsed
 * Useful for: search inputs, resize handlers, scroll events
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * useEffect(() => {
 *   // API call with debouncedSearch
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook - limits function execution to once per wait time
 * Useful for: scroll events, mouse move, frequent updates
 *
 * @example
 * const throttledScroll = useThrottle(handleScroll, 200);
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Previous value hook - returns the previous value
 * Useful for: comparing with current value, detecting changes
 *
 * @example
 * const prevCount = usePrevious(count);
 * if (prevCount !== count) {
 *   // count changed
 * }
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Mount/unmount tracking hook
 * Prevents state updates on unmounted components
 *
 * @example
 * const isMounted = useIsMounted();
 * const fetchData = async () => {
 *   const data = await api.fetch();
 *   if (isMounted()) setState(data);
 * };
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * Performance monitoring hook
 * Measures component render time
 *
 * @example
 * usePerformanceMonitor('MyExpensiveComponent');
 */
export function usePerformanceMonitor(componentName: string, threshold: number = 16): void {
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;

    if (renderTime > threshold) {
      logger.warn('Slow render detected', {
        component: componentName,
        renderTime: `${renderTime.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
      });
    }

    renderStartTime.current = performance.now();
  });
}

/**
 * Lazy state hook - delays state initialization
 * Useful for: expensive initial state calculations
 *
 * @example
 * const [state, setState] = useLazyState(() => {
 *   return expensiveComputation();
 * });
 */
export function useLazyState<T>(initializer: () => T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initializer);
  return [state, setState];
}

/**
 * Interval hook with cleanup
 * Useful for: polling, animations, timers
 *
 * @example
 * useInterval(() => {
 *   fetchLatestData();
 * }, 5000); // Poll every 5 seconds
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Timeout hook with cleanup
 * Useful for: delayed actions, debouncing
 *
 * @example
 * useTimeout(() => {
 *   showNotification();
 * }, 3000); // Show after 3 seconds
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Memoized callback that persists across renders
 * Better than useCallback for callbacks that change frequently
 *
 * @example
 * const handleClick = useEventCallback((id: string) => {
 *   // Can safely use current state here
 *   doSomethingWith(id, currentState);
 * });
 */
export function useEventCallback<T extends (...args: any[]) => any>(callback: T): T {
  const ref = useRef<T>(callback);

  useEffect(() => {
    ref.current = callback;
  });

  return useCallback(((...args) => ref.current(...args)) as T, []);
}

/**
 * Optimized array filtering hook
 * Memoizes filtered results
 *
 * @example
 * const filteredItems = useFilteredArray(items, searchTerm, (item, term) =>
 *   item.name.toLowerCase().includes(term.toLowerCase())
 * );
 */
export function useFilteredArray<T>(
  array: T[],
  filter: string,
  predicate: (item: T, filter: string) => boolean
): T[] {
  return useMemo(() => {
    if (!filter) return array;
    return array.filter(item => predicate(item, filter));
  }, [array, filter, predicate]);
}

/**
 * Optimized sorted array hook
 * Memoizes sorted results
 *
 * @example
 * const sortedUsers = useSortedArray(users, (a, b) => a.name.localeCompare(b.name));
 */
export function useSortedArray<T>(
  array: T[],
  compareFn: (a: T, b: T) => number
): T[] {
  return useMemo(() => {
    return [...array].sort(compareFn);
  }, [array, compareFn]);
}

/**
 * Batched state updates
 * Reduces re-renders by batching multiple state updates
 *
 * @example
 * const [state, batchUpdate] = useBatchedState({ count: 0, text: '' });
 * batchUpdate({ count: 1, text: 'hello' }); // Single re-render
 */
export function useBatchedState<T extends object>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState<T>(initialState);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return [state, batchUpdate];
}

/**
 * Window size hook with debouncing
 * Prevents excessive re-renders on window resize
 *
 * @example
 * const { width, height } = useWindowSize(200); // 200ms debounce
 */
export function useWindowSize(debounceDelay: number = 200) {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, debounceDelay);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [debounceDelay]);

  return size;
}

/**
 * Render count tracker (development only)
 * Logs how many times a component has rendered
 *
 * @example
 * useRenderCount('MyComponent');
 */
export function useRenderCount(componentName: string): void {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;

    if (__DEV__) {
      logger.debug('Component render count', {
        component: componentName,
        count: renderCount.current,
      });
    }
  });
}

/**
 * Stable callback reference
 * Creates a callback that never changes reference but always calls latest version
 *
 * @example
 * const handleSubmit = useStableCallback((data) => {
 *   // Uses current props/state
 *   submitForm(data, currentUserId);
 * });
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(((...args) => callbackRef.current(...args)) as T, []);
}

/**
 * Async data fetching with loading/error states
 * Handles common async patterns
 *
 * @example
 * const { data, loading, error, refetch } = useAsync(
 *   () => fetchUserData(userId),
 *   [userId]
 * );
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useIsMounted();

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();

      if (isMounted()) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (isMounted()) {
        setError(err as Error);
        setLoading(false);
        logger.error('Async operation failed', { error: err });
      }
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
