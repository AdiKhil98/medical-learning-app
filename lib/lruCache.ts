/**
 * LRU (Least Recently Used) Cache implementation
 * Automatically evicts least recently used items when max size is reached
 * Prevents unbounded memory growth
 */

export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;
  private accessOrder: K[];

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  /**
   * Get value from cache
   * Updates access order (moves item to end of queue)
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);

    if (value !== undefined) {
      // Move to end of access order (most recently used)
      this.updateAccessOrder(key);
    }

    return value;
  }

  /**
   * Set value in cache
   * Evicts least recently used item if cache is full
   */
  set(key: K, value: V): void {
    // If key already exists, update it
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.updateAccessOrder(key);
      return;
    }

    // If cache is full, evict least recently used item
    if (this.cache.size >= this.maxSize) {
      const leastRecentlyUsed = this.accessOrder.shift();
      if (leastRecentlyUsed !== undefined) {
        this.cache.delete(leastRecentlyUsed);
      }
    }

    // Add new item
    this.cache.set(key, value);
    this.accessOrder.push(key);
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete specific key from cache
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get max cache size
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Update access order - move key to end (most recently used)
   */
  private updateAccessOrder(key: K): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  /**
   * Get all keys in access order (least recently used first)
   */
  keys(): K[] {
    return [...this.accessOrder];
  }

  /**
   * Get cache statistics for debugging/monitoring
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: ((this.cache.size / this.maxSize) * 100).toFixed(1) + '%',
      oldestKey: this.accessOrder[0],
      newestKey: this.accessOrder[this.accessOrder.length - 1]
    };
  }
}

/**
 * Create a timed cache entry with expiration
 */
export interface TimedCacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * LRU Cache with automatic expiration
 * Combines LRU eviction with time-based expiration
 */
export class TimedLRUCache<K, V> extends LRUCache<K, TimedCacheEntry<V>> {
  private readonly ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    super(maxSize);
    this.ttl = ttl;
  }

  /**
   * Get value from cache
   * Returns undefined if expired
   */
  getValue(key: K): V | undefined {
    const entry = this.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Set value in cache with current timestamp
   */
  setValue(key: K, value: V): void {
    const entry: TimedCacheEntry<V> = {
      data: value,
      timestamp: Date.now()
    };
    this.set(key, entry);
  }

  /**
   * Check if entry exists and is not expired
   */
  hasValue(key: K): boolean {
    return this.getValue(key) !== undefined;
  }

  /**
   * Clean up expired entries
   * Call this periodically to remove stale data
   */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const key of this.keys()) {
      const entry = super.get(key);
      if (entry && (now - entry.timestamp > this.ttl)) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get TTL in milliseconds
   */
  getTTL(): number {
    return this.ttl;
  }
}
