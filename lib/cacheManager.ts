/**
 * Cache Manager with TTL and Size Limits
 *
 * Provides a memory-efficient caching solution with:
 * - Time-to-live (TTL) for automatic expiration
 * - Maximum size limits to prevent memory leaks
 * - LRU (Least Recently Used) eviction policy
 * - Automatic cleanup
 */

import { SecureLogger } from './security';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessTime: number;
}

export interface CacheConfig {
  maxSize: number;        // Maximum number of entries
  ttl: number;           // Time to live in milliseconds
  cleanupInterval: number; // How often to run cleanup (ms)
}

export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = {
      maxSize: config.maxSize || 100,
      ttl: config.ttl || 10 * 60 * 1000, // 10 minutes default
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000, // 5 minutes default
    };

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get item from cache
   * Returns null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > this.config.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessTime = now;
    this.hits++;

    return entry.data;
  }

  /**
   * Set item in cache
   * Enforces size limits using LRU eviction
   */
  set(key: string, data: T): void {
    const now = Date.now();

    // If cache is at max size, evict least recently used item
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessTime: now,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > this.config.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(2) + '%'
        : '0%',
      ttl: this.config.ttl,
    };
  }

  /**
   * Remove expired entries
   * Returns number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;

      if (age > this.config.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      SecureLogger.log(`Cache cleanup removed ${removedCount} expired entries`);
    }

    return removedCount;
  }

  /**
   * Evict least recently used item
   * Uses lastAccessTime to determine LRU
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessTime < oldestTime) {
        oldestTime = entry.lastAccessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      SecureLogger.log(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup timer
   * Call this when shutting down to prevent memory leaks
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  /**
   * Get all cache keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Create a cache manager with specific config
 */
export function createCache<T>(config: Partial<CacheConfig> = {}): CacheManager<T> {
  return new CacheManager<T>(config);
}

/**
 * Global cache instances for common use cases
 */
export const globalCaches = {
  sections: createCache<any>({
    maxSize: 100,
    ttl: 10 * 60 * 1000, // 10 minutes
    cleanupInterval: 5 * 60 * 1000,
  }),

  lists: createCache<any[]>({
    maxSize: 50,
    ttl: 10 * 60 * 1000,
    cleanupInterval: 5 * 60 * 1000,
  }),

  content: createCache<any>({
    maxSize: 50,
    ttl: 10 * 60 * 1000,
    cleanupInterval: 5 * 60 * 1000,
  }),
};

/**
 * Cleanup all global caches
 * Call this on app shutdown or when needed
 */
export function cleanupAllCaches(): void {
  Object.values(globalCaches).forEach(cache => cache.cleanup());
}

/**
 * Destroy all global caches
 * Call this on app shutdown
 */
export function destroyAllCaches(): void {
  Object.values(globalCaches).forEach(cache => cache.destroy());
}
