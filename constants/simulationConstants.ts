/**
 * Simulation Constants
 *
 * Centralized constants for simulation timing, thresholds, and limits
 * to ensure consistency across KP and FSP simulations
 */

// ===== SIMULATION DURATION =====

/** Total simulation duration in seconds (20 minutes) */
export const SIMULATION_DURATION_SECONDS = 1200;

/** Total simulation duration in milliseconds (20 minutes) */
export const SIMULATION_DURATION_MS = 1200000;

// ===== USAGE THRESHOLDS =====

/**
 * Threshold for marking simulation as "used" and counting toward limits
 * If simulation runs for this duration or longer, it counts as used (5 minutes)
 */
export const USAGE_THRESHOLD_SECONDS = 300;

/**
 * Threshold in milliseconds (5 minutes)
 */
export const USAGE_THRESHOLD_MS = 300000;

// ===== TIMER WARNING LEVELS =====

/** Warning at 5 minutes remaining (15 minutes elapsed) */
export const WARNING_5_MIN_REMAINING = 300;

/** Warning at 2 minutes remaining (18 minutes elapsed) */
export const WARNING_2_MIN_REMAINING = 120;

/** Warning at 1 minute remaining (19 minutes elapsed) */
export const WARNING_1_MIN_REMAINING = 60;

/** Final warning at 30 seconds remaining */
export const WARNING_30_SEC_REMAINING = 30;

/** Critical warning at 10 seconds remaining (start countdown) */
export const WARNING_10_SEC_REMAINING = 10;

// ===== GRACE PERIODS AND TIMEOUTS =====

/** Grace period for stale session cleanup (25 minutes) */
export const STALE_SESSION_GRACE_PERIOD_MINUTES = 25;

/** Heartbeat interval in milliseconds (30 seconds) */
export const HEARTBEAT_INTERVAL_MS = 30000;

/** Widget script load timeout in milliseconds (30 seconds) */
export const WIDGET_LOAD_TIMEOUT_MS = 30000;

/** Final countdown duration for graceful end (10 seconds) */
export const FINAL_COUNTDOWN_SECONDS = 10;

// ===== SUBSCRIPTION LIMITS =====

/** Free tier simulation limit */
export const FREE_TIER_LIMIT = 5;

/** Basis tier simulation limit */
export const BASIS_TIER_LIMIT = 20;

/** Profi tier simulation limit */
export const PROFI_TIER_LIMIT = 100;

/** Unlimited tier has no limit (represented as -1) */
export const UNLIMITED_TIER_LIMIT = -1;

// ===== HELPER FUNCTIONS =====

/**
 * Convert seconds to MM:SS format for display
 */
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if simulation has reached usage threshold
 */
export function hasReachedUsageThreshold(elapsedSeconds: number): boolean {
  return elapsedSeconds >= USAGE_THRESHOLD_SECONDS;
}

/**
 * Get warning level based on remaining time
 */
export function getWarningLevel(remainingSeconds: number): 'normal' | 'yellow' | 'orange' | 'red' {
  if (remainingSeconds <= WARNING_1_MIN_REMAINING) return 'red';
  if (remainingSeconds <= WARNING_2_MIN_REMAINING) return 'orange';
  if (remainingSeconds <= WARNING_5_MIN_REMAINING) return 'yellow';
  return 'normal';
}
