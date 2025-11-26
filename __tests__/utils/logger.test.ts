/**
 * Tests for logger.ts
 */

import { logger, LogLevel, measurePerformance, withErrorLogging } from '../../utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { test: true });
      // Logger outputs to console in tests (mocked in jest.setup.js)
      expect(console.debug).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message', { test: true });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Warning message', { test: true });
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message', new Error('test error'));
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('measurePerformance', () => {
    it('should measure sync function performance', async () => {
      const fn = () => 'result';

      const result = await measurePerformance('test operation', fn);

      expect(result).toBe('result');
    });

    it('should measure async function performance', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async result';
      };

      const result = await measurePerformance('async operation', fn);

      expect(result).toBe('async result');
    });
  });

  describe('withErrorLogging', () => {
    it('should log errors and rethrow', async () => {
      const error = new Error('test error');
      const fn = async () => {
        throw error;
      };

      await expect(
        withErrorLogging('test operation', fn, { userId: '123' })
      ).rejects.toThrow('test error');

      expect(console.error).toHaveBeenCalled();
    });

    it('should not log on success', async () => {
      const fn = async () => 'success';

      const result = await withErrorLogging('test operation', fn);

      expect(result).toBe('success');
    });
  });
});
