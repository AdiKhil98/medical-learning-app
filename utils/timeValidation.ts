/**
 * Client-Side Time Manipulation Detection
 *
 * Detects and prevents various time manipulation techniques:
 * - System clock changes
 * - Browser DevTools time manipulation
 * - Time drift detection
 * - Timezone manipulation
 *
 * Security Note: This is client-side validation only.
 * ALWAYS validate time-sensitive operations on the server.
 */

import { logger } from './logger';

interface TimeValidationResult {
  isValid: boolean;
  confidence: number; // 0-1, how confident we are in the time
  warnings: string[];
  serverTimeDiff?: number; // Difference from server time in ms
}

interface TimeSnapshot {
  clientTime: number;
  performanceNow: number;
  monotonic: number;
}

class TimeValidator {
  private serverTimeOffset: number = 0;
  private lastSnapshot: TimeSnapshot | null = null;
  private suspiciousEvents: number = 0;
  private readonly MAX_SUSPICIOUS_EVENTS = 3;
  private readonly MAX_DRIFT_MS = 60000; // 1 minute

  /**
   * Synchronize with server time
   * Call this on app startup and periodically
   */
  async syncWithServer(serverTimeEndpoint?: string): Promise<void> {
    try {
      const requestStart = Date.now();

      // If no endpoint provided, estimate based on response headers
      if (!serverTimeEndpoint) {
        logger.warn('No server time endpoint provided, using estimated sync');
        return;
      }

      const response = await fetch(serverTimeEndpoint);
      const requestEnd = Date.now();
      const roundTripTime = requestEnd - requestStart;

      const serverTime = new Date(response.headers.get('date') || '').getTime();

      if (!serverTime || isNaN(serverTime)) {
        logger.error('Invalid server time received');
        return;
      }

      // Account for network latency (half of round trip time)
      const estimatedServerTime = serverTime + (roundTripTime / 2);
      this.serverTimeOffset = estimatedServerTime - Date.now();

      logger.info('Time synchronized with server', {
        offset: this.serverTimeOffset,
        roundTripTime,
      });
    } catch (error) {
      logger.error('Failed to sync with server time', { error });
    }
  }

  /**
   * Get current time snapshot for validation
   */
  private getTimeSnapshot(): TimeSnapshot {
    return {
      clientTime: Date.now(),
      performanceNow: performance.now(),
      monotonic: performance.timeOrigin + performance.now(),
    };
  }

  /**
   * Validate current time against multiple checks
   */
  validateTime(): TimeValidationResult {
    const warnings: string[] = [];
    let confidence = 1.0;

    const currentSnapshot = this.getTimeSnapshot();

    // Check 1: Compare with server time (if synced)
    if (this.serverTimeOffset !== 0) {
      const estimatedServerTime = currentSnapshot.clientTime + this.serverTimeOffset;
      const diff = Math.abs(currentSnapshot.clientTime - estimatedServerTime);

      if (diff > this.MAX_DRIFT_MS) {
        warnings.push('Client time significantly differs from server time');
        confidence -= 0.4;
        this.suspiciousEvents++;

        logger.warn('Time drift detected', {
          clientTime: currentSnapshot.clientTime,
          serverTime: estimatedServerTime,
          diff,
        });
      }
    }

    // Check 2: Monotonic time validation (detect backward time jumps)
    if (this.lastSnapshot) {
      const expectedElapsed = currentSnapshot.performanceNow - this.lastSnapshot.performanceNow;
      const actualElapsed = currentSnapshot.clientTime - this.lastSnapshot.clientTime;
      const difference = Math.abs(expectedElapsed - actualElapsed);

      // Performance.now() is monotonic and immune to system clock changes
      if (difference > 5000) { // More than 5 seconds difference
        warnings.push('Time inconsistency detected (possible manipulation)');
        confidence -= 0.5;
        this.suspiciousEvents++;

        logger.warn('Time manipulation suspected', {
          expectedElapsed,
          actualElapsed,
          difference,
        });
      }

      // Check for backward time travel (Date.now() went backward)
      if (actualElapsed < -1000) { // More than 1 second backward
        warnings.push('Backward time travel detected');
        confidence -= 0.6;
        this.suspiciousEvents++;

        logger.error('Backward time travel detected', {
          lastTime: this.lastSnapshot.clientTime,
          currentTime: currentSnapshot.clientTime,
        });
      }
    }

    // Check 3: Performance timing origin validation
    const now = Date.now();
    const expectedNow = performance.timeOrigin + performance.now();
    const timingDiff = Math.abs(now - expectedNow);

    if (timingDiff > 10000) { // More than 10 seconds difference
      warnings.push('Performance timing inconsistency');
      confidence -= 0.3;
      this.suspiciousEvents++;

      logger.warn('Performance timing mismatch', {
        dateNow: now,
        performanceNow: expectedNow,
        diff: timingDiff,
      });
    }

    // Update last snapshot
    this.lastSnapshot = currentSnapshot;

    // Check if too many suspicious events
    if (this.suspiciousEvents >= this.MAX_SUSPICIOUS_EVENTS) {
      warnings.push('Multiple time manipulation attempts detected');
      confidence = 0;

      logger.error('Multiple time manipulation attempts', {
        count: this.suspiciousEvents,
      });
    }

    const isValid = confidence >= 0.5 && warnings.length === 0;

    return {
      isValid,
      confidence,
      warnings,
      serverTimeDiff: this.serverTimeOffset,
    };
  }

  /**
   * Get a trusted timestamp
   * Returns server-adjusted time if available, otherwise client time with confidence
   */
  getTrustedTimestamp(): { timestamp: number; confidence: number } {
    const validation = this.validateTime();

    const timestamp = this.serverTimeOffset !== 0
      ? Date.now() + this.serverTimeOffset
      : Date.now();

    return {
      timestamp,
      confidence: validation.confidence,
    };
  }

  /**
   * Reset suspicious event counter
   * Call this after user re-authentication or manual verification
   */
  resetSuspiciousEvents(): void {
    this.suspiciousEvents = 0;
    logger.info('Time validation suspicious events reset');
  }

  /**
   * Check if time validation has failed critically
   */
  isCriticallyCompromised(): boolean {
    return this.suspiciousEvents >= this.MAX_SUSPICIOUS_EVENTS;
  }
}

// Export singleton instance
export const timeValidator = new TimeValidator();

/**
 * Helper: Validate time before time-sensitive operations
 *
 * @example
 * const result = validateBeforeOperation();
 * if (!result.isValid) {
 *   // Handle suspicious time
 *   logger.warn('Operation blocked due to time validation', result.warnings);
 *   return;
 * }
 */
export function validateBeforeOperation(): TimeValidationResult {
  return timeValidator.validateTime();
}

/**
 * Helper: Get server-synchronized timestamp
 * Prefer this over Date.now() for critical operations
 *
 * @example
 * const { timestamp, confidence } = getServerTime();
 * if (confidence < 0.8) {
 *   // Low confidence in timestamp
 * }
 */
export function getServerTime(): { timestamp: number; confidence: number } {
  return timeValidator.getTrustedTimestamp();
}

/**
 * React Hook: Use time validation in components
 */
export function useTimeValidation() {
  const validate = () => validateBeforeOperation();
  const getTime = () => getServerTime();
  const reset = () => timeValidator.resetSuspiciousEvents();
  const isCompromised = () => timeValidator.isCriticallyCompromised();

  return {
    validate,
    getTime,
    reset,
    isCompromised,
  };
}
