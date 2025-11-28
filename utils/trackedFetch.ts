/**
 * Performance-Tracked Fetch Wrapper
 *
 * Drop-in replacement for fetch() that automatically tracks:
 * - API call performance
 * - Response times
 * - Error rates
 * - Budget violations
 *
 * Usage:
 *   import { trackedFetch } from '@/utils/trackedFetch';
 *
 *   // Use exactly like fetch
 *   const response = await trackedFetch('/api/users', {
 *     method: 'GET',
 *   });
 */

import { performanceTracker } from './performanceTracking';
import { logger } from './logger';

/**
 * Fetch wrapper with automatic performance tracking
 */
export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const startTime = Date.now();
  const method = init?.method || 'GET';
  const url = typeof input === 'string' ? input : input.toString();

  // Extract endpoint (remove query params and base URL for cleaner tracking)
  const endpoint = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '');

  try {
    const response = await fetch(input, init);
    const duration = Date.now() - startTime;

    // Track performance
    await performanceTracker.trackApiCall(
      endpoint,
      method,
      duration,
      response.status
    );

    // Log API call
    logger.apiCall(endpoint, method, response.status, { duration });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track failed API call
    await performanceTracker.trackApiCall(endpoint, method, duration);

    // Log error
    logger.error(`API call failed: ${method} ${endpoint}`, error, {
      endpoint,
      method,
      duration,
    });

    throw error;
  }
}

/**
 * Tracked fetch for Supabase (with custom endpoint naming)
 */
export async function trackedSupabaseFetch(
  tableName: string,
  operation: string,
  fetchFn: () => Promise<any>
): Promise<any> {
  const startTime = Date.now();
  const endpoint = `/supabase/${tableName}/${operation}`;

  try {
    const result = await fetchFn();
    const duration = Date.now() - startTime;

    // Track performance
    await performanceTracker.trackApiCall(
      endpoint,
      operation.toUpperCase(),
      duration,
      result.error ? 500 : 200
    );

    // Log API call
    logger.apiCall(endpoint, operation.toUpperCase(), result.error ? 500 : 200, {
      duration,
      hasError: !!result.error,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track failed call
    await performanceTracker.trackApiCall(endpoint, operation.toUpperCase(), duration, 500);

    // Log error
    logger.error(`Supabase call failed: ${tableName}.${operation}`, error, {
      tableName,
      operation,
      duration,
    });

    throw error;
  }
}

export default trackedFetch;
