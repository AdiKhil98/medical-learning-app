/**
 * Retry Logic for Network Requests
 *
 * Advanced retry strategies:
 * - Exponential backoff
 * - Jittered backoff
 * - Circuit breaker pattern
 * - Request deduplication
 * - Timeout handling
 */

import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  timeout?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing - reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing - allow limited requests
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  const exponentialDelay = Math.min(
    initialDelay * Math.pow(backoffMultiplier, attempt),
    maxDelay
  );

  if (jitter) {
    // Add random jitter (±25%)
    const jitterAmount = exponentialDelay * 0.25;
    return exponentialDelay + (Math.random() * 2 - 1) * jitterAmount;
  }

  return exponentialDelay;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors?: string[]): boolean {
  if (!error) return false;

  // Network errors are always retryable
  if (error.message?.includes('Network') || error.message?.includes('timeout')) {
    return true;
  }

  // Check specific error codes/messages
  if (retryableErrors && retryableErrors.length > 0) {
    return retryableErrors.some(
      pattern => error.message?.includes(pattern) || error.code === pattern
    );
  }

  // Default retryable HTTP status codes
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }

  return false;
}

/**
 * Execute function with retry logic
 *
 * @example
 * const data = await withRetry(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    jitter = true,
    timeout,
    retryableErrors,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wrap in timeout if specified
      if (timeout) {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          ),
        ]);
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this is the last attempt, throw
      if (attempt === maxRetries) {
        logger.error('Max retries exceeded', {
          attempts: attempt + 1,
          error: lastError,
        });
        throw lastError;
      }

      // Check if error is retryable
      if (!isRetryableError(error, retryableErrors)) {
        logger.warn('Non-retryable error encountered', { error });
        throw error;
      }

      // Calculate delay
      const delay = calculateBackoff(
        attempt,
        initialDelay,
        maxDelay,
        backoffMultiplier,
        jitter
      );

      logger.info('Retrying request', {
        attempt: attempt + 1,
        maxRetries,
        delay: `${delay.toFixed(0)}ms`,
        error: lastError.message,
      });

      // Call retry callback
      if (onRetry) {
        try {
          onRetry(attempt + 1, lastError);
        } catch (callbackError) {
          logger.error('Error in retry callback', { error: callbackError });
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests when failure rate is high
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;

  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 60000; // 1 minute
  }

  /**
   * Execute function through circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error('Circuit breaker is OPEN');
        logger.warn('Circuit breaker blocked request', {
          state: this.state,
          nextAttempt: new Date(this.nextAttemptTime).toISOString(),
        });
        throw error;
      }

      // Try half-open state
      this.state = CircuitState.HALF_OPEN;
      logger.info('Circuit breaker entering HALF_OPEN state');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info('Circuit breaker CLOSED after successful recovery');
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.timeout;

      logger.error('Circuit breaker OPEN due to failures', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
        timeout: this.timeout,
        nextAttempt: new Date(this.nextAttemptTime).toISOString(),
      });
    }
  }

  /**
   * Get current circuit state
   */
  getState(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
    logger.info('Circuit breaker reset');
  }
}

/**
 * Request Deduplication
 * Prevents duplicate in-flight requests
 */
export class RequestDeduplicator {
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  /**
   * Execute request with deduplication
   * If same key is already in flight, returns existing promise
   */
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    if (this.inFlightRequests.has(key)) {
      logger.debug('Request deduplicated', { key });
      return this.inFlightRequests.get(key)!;
    }

    // Execute new request
    const promise = fn()
      .then(result => {
        this.inFlightRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.inFlightRequests.delete(key);
        throw error;
      });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear specific request
   */
  clear(key: string): void {
    this.inFlightRequests.delete(key);
  }

  /**
   * Clear all requests
   */
  clearAll(): void {
    this.inFlightRequests.clear();
  }

  /**
   * Check if request is in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlightRequests.has(key);
  }
}

// Export singleton instances
export const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
});

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper: Fetch with retry and circuit breaker
 *
 * @example
 * const data = await fetchWithRetry('/api/data', {
 *   maxRetries: 3,
 *   timeout: 5000,
 * });
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit & RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    jitter,
    timeout,
    retryableErrors,
    onRetry,
    ...fetchOptions
  } = options;

  return withRetry(
    () =>
      apiCircuitBreaker.execute(async () => {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          throw error;
        }

        return response.json();
      }),
    {
      maxRetries,
      initialDelay,
      maxDelay,
      backoffMultiplier,
      jitter,
      timeout,
      retryableErrors,
      onRetry,
    }
  );
}

/**
 * React Hook: Use retry with component state
 *
 * @example
 * const { execute, loading, error, retryCount } = useRetry(
 *   () => api.fetchData(),
 *   { maxRetries: 3 }
 * );
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const execute = React.useCallback(async (): Promise<T | undefined> => {
    setLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      const result = await withRetry(fn, {
        ...options,
        onRetry: (attempt, err) => {
          setRetryCount(attempt);
          options.onRetry?.(attempt, err);
        },
      });
      return result;
    } catch (err) {
      setError(err as Error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [fn, options]);

  return {
    execute,
    loading,
    error,
    retryCount,
  };
}

// For React Native environment
const React = {
  useState,
  useCallback,
} as const;

// Import from react
import { useState, useCallback } from 'react';
