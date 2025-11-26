/**
 * Tests for timeValidation.ts
 */

import { timeValidator, validateBeforeOperation, getServerTime } from '../../utils/timeValidation';

describe('Time Validation', () => {
  beforeEach(() => {
    // Reset time validator state
    timeValidator.resetSuspiciousEvents();
    jest.clearAllMocks();
  });

  describe('validateTime', () => {
    it('should pass validation with no drift', () => {
      const result = timeValidator.validateTime();

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect backward time travel', () => {
      // First snapshot
      timeValidator.validateTime();

      // Mock Date.now() to go backward
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() - 5000);

      const result = timeValidator.validateTime();

      expect(result.warnings.some(w => w.includes('Backward'))).toBe(true);
      expect(result.confidence).toBeLessThan(0.5);

      Date.now = originalDateNow;
    });

    it('should detect time inconsistency', () => {
      // First snapshot
      timeValidator.validateTime();

      // Wait a bit
      jest.advanceTimersByTime(1000);

      // Mock a huge jump in Date.now()
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 10000);

      const result = timeValidator.validateTime();

      expect(result.warnings.some(w => w.includes('inconsistency'))).toBe(true);

      Date.now = originalDateNow;
    });

    it('should track suspicious events', () => {
      const originalDateNow = Date.now;

      // Trigger multiple suspicious events
      for (let i = 0; i < 3; i++) {
        Date.now = jest.fn(() => originalDateNow() - 5000 * (i + 1));
        timeValidator.validateTime();
      }

      const result = timeValidator.validateTime();

      expect(result.confidence).toBe(0);
      expect(result.warnings.some(w => w.includes('Multiple'))).toBe(true);
      expect(timeValidator.isCriticallyCompromised()).toBe(true);

      Date.now = originalDateNow;
    });

    it('should allow resetting suspicious events', () => {
      const originalDateNow = Date.now;

      // Trigger suspicious events
      for (let i = 0; i < 3; i++) {
        Date.now = jest.fn(() => originalDateNow() - 5000 * (i + 1));
        timeValidator.validateTime();
      }

      expect(timeValidator.isCriticallyCompromised()).toBe(true);

      timeValidator.resetSuspiciousEvents();

      expect(timeValidator.isCriticallyCompromised()).toBe(false);

      Date.now = originalDateNow;
    });
  });

  describe('getTrustedTimestamp', () => {
    it('should return timestamp with confidence', () => {
      const result = timeValidator.getTrustedTimestamp();

      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have lower confidence after suspicious events', () => {
      const originalDateNow = Date.now;

      // Normal confidence
      const result1 = timeValidator.getTrustedTimestamp();
      expect(result1.confidence).toBeGreaterThan(0.5);

      // Trigger suspicious event
      Date.now = jest.fn(() => originalDateNow() - 5000);
      timeValidator.validateTime();

      const result2 = timeValidator.getTrustedTimestamp();
      expect(result2.confidence).toBeLessThan(result1.confidence);

      Date.now = originalDateNow;
    });
  });

  describe('validateBeforeOperation', () => {
    it('should validate before operations', () => {
      const result = validateBeforeOperation();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('getServerTime', () => {
    it('should return server timestamp', () => {
      const result = getServerTime();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('confidence');
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('syncWithServer', () => {
    it('should sync with server time', async () => {
      const serverTime = Date.now() + 1000;

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          headers: new Map([['date', new Date(serverTime).toISOString()]]),
        })
      ) as jest.Mock;

      await timeValidator.syncWithServer('https://api.example.com/time');

      // Server time should be set
      const result = timeValidator.validateTime();
      expect(result.serverTimeDiff).toBeDefined();
    });

    it('should handle sync errors gracefully', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

      await expect(
        timeValidator.syncWithServer('https://api.example.com/time')
      ).resolves.not.toThrow();
    });
  });
});
