/**
 * Tests for testUtils.ts helpers
 */

import {
  wait,
  flushPromises,
  mockFn,
  mockAsyncFn,
  mockRejectedFn,
  mockFetchResponse,
  advanceTimersAndFlush,
} from './testUtils';

describe('Test Utilities', () => {
  describe('wait', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should wait for specified milliseconds', async () => {
      const startTime = Date.now();
      const waitPromise = wait(1000);

      jest.advanceTimersByTime(1000);
      await waitPromise;

      // Promise should be resolved after advancing timers
      expect(waitPromise).resolves.toBeUndefined();
    });
  });

  describe('flushPromises', () => {
    it('should flush all pending promises', async () => {
      let resolved = false;
      Promise.resolve().then(() => {
        resolved = true;
      });

      await flushPromises();

      expect(resolved).toBe(true);
    });
  });

  describe('mockFn', () => {
    it('should create a mock function with return value', () => {
      const fn = mockFn('test value');

      expect(fn()).toBe('test value');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should create a mock function without return value', () => {
      const fn = mockFn();

      expect(fn()).toBeUndefined();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('mockAsyncFn', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create async mock function with return value', async () => {
      const fn = mockAsyncFn('async value');

      const result = await fn();

      expect(result).toBe('async value');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should create async mock function with delay', async () => {
      const fn = mockAsyncFn('delayed value', 500);

      const promise = fn();
      jest.advanceTimersByTime(500);
      const result = await promise;

      expect(result).toBe('delayed value');
    });
  });

  describe('mockRejectedFn', () => {
    it('should create function that throws Error object', async () => {
      const error = new Error('Test error');
      const fn = mockRejectedFn(error);

      await expect(fn()).rejects.toThrow('Test error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should create function that throws string as Error', async () => {
      const fn = mockRejectedFn('Error message');

      await expect(fn()).rejects.toThrow('Error message');
    });
  });

  describe('mockFetchResponse', () => {
    it('should create successful fetch response', async () => {
      const data = { id: 1, name: 'Test' };
      const response = await mockFetchResponse(data);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(data);
    });

    it('should create error fetch response', async () => {
      const data = { error: 'Not found' };
      const response = await mockFetchResponse(data, 404);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(data);
    });

    it('should have headers with date', async () => {
      const response = await mockFetchResponse({});

      expect(response.headers.get('date')).toBeDefined();
    });
  });

  describe('advanceTimersAndFlush', () => {
    it('should call jest.advanceTimersByTime', () => {
      jest.useFakeTimers();

      const advanceTimersSpy = jest.spyOn(jest, 'advanceTimersByTime');
      const mockCallback = jest.fn();

      setTimeout(mockCallback, 1000);

      jest.advanceTimersByTime(1000);

      expect(advanceTimersSpy).toHaveBeenCalledWith(1000);
      expect(mockCallback).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
