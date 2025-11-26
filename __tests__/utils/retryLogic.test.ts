/**
 * Tests for retryLogic.ts
 */

import {
  withRetry,
  CircuitBreaker,
  RequestDeduplicator,
  fetchWithRetry,
} from '../../utils/retryLogic';

describe('Retry Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 1000 });

      // First attempt fails
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for retry delay
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(2);

      // Wait for second retry delay
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent error'));

      const promise = withRetry(fn, { maxRetries: 2, initialDelay: 100 });

      // First attempt
      await Promise.resolve();

      // First retry
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Second retry
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      await expect(promise).rejects.toThrow('persistent error');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should apply exponential backoff', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      const onRetry = jest.fn();

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        jitter: false,
        onRetry,
      });

      await Promise.resolve();

      // First retry - 1000ms
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry - 2000ms
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(3);

      // Third retry - 4000ms
      jest.advanceTimersByTime(4000);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(4);

      await expect(promise).rejects.toThrow();
    });

    it('should call onRetry callback', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      const onRetry = jest.fn();

      const promise = withRetry(fn, {
        maxRetries: 2,
        initialDelay: 100,
        onRetry,
      });

      await Promise.resolve();
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error));

      await expect(promise).rejects.toThrow();
    });

    it('should respect timeout', async () => {
      const fn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('too late'), 2000)));

      const promise = withRetry(fn, { timeout: 1000, maxRetries: 0 });

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Request timeout');
    });
  });

  describe('CircuitBreaker', () => {
    it('should execute normally in CLOSED state', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should open circuit after failure threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Trigger failures
      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();

      // Circuit should be OPEN now
      expect(breaker.getState().state).toBe('OPEN');
      expect(breaker.getState().failureCount).toBe(2);

      // Next call should fail immediately without executing function
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(fn).toHaveBeenCalledTimes(2); // Still 2, not 3
    });

    it('should enter HALF_OPEN state after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 1000,
      });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();

      expect(breaker.getState().state).toBe('OPEN');

      // Wait for timeout
      jest.advanceTimersByTime(1100);

      // Next call should enter HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);

      expect(breaker.getState().state).toBe('HALF_OPEN');
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });

      // Open the circuit
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(breaker.execute(failFn)).rejects.toThrow();
      await expect(breaker.execute(failFn)).rejects.toThrow();

      // Wait for timeout
      jest.advanceTimersByTime(1100);

      // Execute successful calls in HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      await breaker.execute(successFn);

      // Circuit should be CLOSED
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should reset circuit breaker', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });

      breaker.reset();

      const state = breaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });
  });

  describe('RequestDeduplicator', () => {
    it('should deduplicate concurrent requests', async () => {
      const deduplicator = new RequestDeduplicator();
      const fn = jest.fn().mockResolvedValue('result');

      // Make two concurrent requests with same key
      const promise1 = deduplicator.dedupe('key1', fn);
      const promise2 = deduplicator.dedupe('key1', fn);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should allow different keys to execute', async () => {
      const deduplicator = new RequestDeduplicator();
      const fn = jest.fn().mockResolvedValue('result');

      await Promise.all([
        deduplicator.dedupe('key1', fn),
        deduplicator.dedupe('key2', fn),
      ]);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle errors correctly', async () => {
      const deduplicator = new RequestDeduplicator();
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      const promise1 = deduplicator.dedupe('key1', fn);
      const promise2 = deduplicator.dedupe('key1', fn);

      await expect(promise1).rejects.toThrow('fail');
      await expect(promise2).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow clearing specific requests', async () => {
      const deduplicator = new RequestDeduplicator();

      const fn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('result'), 100)));

      const promise = deduplicator.dedupe('key1', fn);

      expect(deduplicator.isInFlight('key1')).toBe(true);

      deduplicator.clear('key1');

      expect(deduplicator.isInFlight('key1')).toBe(false);

      // Original promise should still resolve
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBe('result');
    });

    it('should allow clearing all requests', () => {
      const deduplicator = new RequestDeduplicator();
      const fn = jest.fn(() => new Promise(() => {}));

      deduplicator.dedupe('key1', fn);
      deduplicator.dedupe('key2', fn);

      expect(deduplicator.isInFlight('key1')).toBe(true);
      expect(deduplicator.isInFlight('key2')).toBe(true);

      deduplicator.clearAll();

      expect(deduplicator.isInFlight('key1')).toBe(false);
      expect(deduplicator.isInFlight('key2')).toBe(false);
    });
  });

  describe('fetchWithRetry', () => {
    it('should fetch and parse JSON', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'test' }),
        })
      ) as jest.Mock;

      const result = await fetchWithRetry('/api/test');

      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {});
    });

    it('should throw on HTTP error', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      ) as jest.Mock;

      await expect(fetchWithRetry('/api/test')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should retry on retryable errors', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' }),
        }) as jest.Mock;

      const promise = fetchWithRetry('/api/test', {
        maxRetries: 2,
        initialDelay: 100,
      });

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toEqual({ data: 'success' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
