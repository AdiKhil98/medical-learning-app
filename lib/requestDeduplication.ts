/**
 * Request Deduplication Utility
 *
 * Prevents duplicate simultaneous requests by tracking in-flight requests
 * and returning the same promise for identical requests.
 *
 * Benefits:
 * - Reduces unnecessary network requests
 * - Prevents race conditions
 * - Improves performance
 * - Reduces server load
 */

import { SecureLogger } from './security';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private requestTimeout = 30000; // 30 seconds timeout for requests

  /**
   * Execute a request with deduplication
   * If an identical request is already in flight, return the existing promise
   *
   * @param key - Unique identifier for the request
   * @param requestFn - Function that returns a promise
   * @returns Promise that resolves with the request result
   */
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    const pending = this.pendingRequests.get(key);

    if (pending) {
      const age = Date.now() - pending.timestamp;

      // If request is still fresh, return existing promise
      if (age < this.requestTimeout) {
        SecureLogger.log(`Request deduplicated: ${key}`);
        return pending.promise as Promise<T>;
      } else {
        // Request timed out, remove it
        SecureLogger.warn(`Request timeout: ${key}`);
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = requestFn()
      .then(result => {
        // Clean up after successful completion
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        // Clean up after error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Cancel a pending request
   * Useful when component unmounts or navigation changes
   */
  cancel(key: string): void {
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.delete(key);
      SecureLogger.log(`Request cancelled: ${key}`);
    }
  }

  /**
   * Cancel all pending requests
   * Useful for cleanup or route changes
   */
  cancelAll(): void {
    const count = this.pendingRequests.size;
    this.pendingRequests.clear();
    if (count > 0) {
      SecureLogger.log(`Cancelled ${count} pending requests`);
    }
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get all pending request keys (for debugging)
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * Clean up old pending requests (timeout check)
   * Should be called periodically
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, pending] of this.pendingRequests.entries()) {
      const age = now - pending.timestamp;
      if (age >= this.requestTimeout) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.pendingRequests.delete(key);
      SecureLogger.warn(`Cleaned up timed out request: ${key}`);
    });

    if (keysToDelete.length > 0) {
      SecureLogger.log(`Cleaned up ${keysToDelete.length} timed out requests`);
    }
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Decorator/wrapper function for easy deduplication
 *
 * Usage:
 * ```ts
 * const result = await withDeduplication(
 *   'user-profile-123',
 *   () => fetchUserProfile(123)
 * );
 * ```
 */
export async function withDeduplication<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  return requestDeduplicator.deduplicate(key, requestFn);
}

/**
 * Generate a deduplication key from request parameters
 *
 * Usage:
 * ```ts
 * const key = generateRequestKey('getSectionBySlug', slug);
 * ```
 */
export function generateRequestKey(method: string, ...params: any[]): string {
  const paramString = params
    .map(p => {
      if (p === null || p === undefined) return 'null';
      if (typeof p === 'object') return JSON.stringify(p);
      return String(p);
    })
    .join('|');

  return `${method}:${paramString}`;
}

// Periodic cleanup of timed out requests
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    requestDeduplicator.cleanup();
  }, 60000); // Cleanup every minute
}
