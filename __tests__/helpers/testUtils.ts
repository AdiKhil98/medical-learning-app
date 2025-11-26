/**
 * Test Utilities and Helpers
 *
 * Common utilities for writing tests
 */

/**
 * Wait for a specific amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Flush all pending promises
 */
export const flushPromises = (): Promise<void> => {
  return new Promise(resolve => setImmediate(resolve));
};

/**
 * Create a mock function with return value
 */
export const mockFn = <T = any>(returnValue?: T) => {
  return jest.fn(() => returnValue);
};

/**
 * Create a mock async function
 */
export const mockAsyncFn = <T = any>(returnValue?: T, delay: number = 0) => {
  return jest.fn(async () => {
    if (delay > 0) await wait(delay);
    return returnValue;
  });
};

/**
 * Create a mock function that throws
 */
export const mockRejectedFn = (error: Error | string) => {
  return jest.fn(async () => {
    throw typeof error === 'string' ? new Error(error) : error;
  });
};

/**
 * Mock Date.now() with a specific timestamp
 */
export const mockDateNow = (timestamp: number) => {
  const originalDateNow = Date.now;

  beforeEach(() => {
    Date.now = jest.fn(() => timestamp);
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });
};

/**
 * Mock Math.random() with a specific value
 */
export const mockMathRandom = (value: number) => {
  const originalRandom = Math.random;

  beforeEach(() => {
    Math.random = jest.fn(() => value);
  });

  afterEach(() => {
    Math.random = originalRandom;
  });
};

/**
 * Spy on console methods
 */
export const spyConsole = () => {
  const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
  };

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  return consoleSpy;
};

/**
 * Create a mock fetch response
 */
export const mockFetchResponse = (data: any, status: number = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Map([['date', new Date().toISOString()]]),
  });
};

/**
 * Advance timers and flush promises
 */
export const advanceTimersAndFlush = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  await flushPromises();
};
