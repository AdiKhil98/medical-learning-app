// Simulation timing constants
// These values control the simulation duration and usage tracking

/**
 * Total simulation duration in seconds
 * IMPORTANT: This should be 20 minutes (1200 seconds) according to system docs
 */
export const SIMULATION_DURATION_SECONDS = 1200; // 20 minutes = 1200 seconds

/**
 * Threshold for marking simulation as "used" (counted toward quota)
 * When elapsed time reaches this value, increment the user's counter
 * IMPORTANT: This is 5 minutes (300 seconds)
 */
export const USAGE_THRESHOLD_SECONDS = 300; // 5 minutes = 300 seconds

/**
 * Warning threshold - show warning when this many seconds REMAINING
 * 5 minutes remaining = 15 minutes elapsed
 */
export const WARNING_5_MIN_REMAINING = 300; // 5 minutes

/**
 * Grace period for considering a session "stale" (in minutes)
 * Sessions older than this won't be automatically resumed
 */
export const STALE_SESSION_GRACE_PERIOD_MINUTES = 30; // 30 minutes

/**
 * Validation: Ensure constants are correct
 */
if (SIMULATION_DURATION_SECONDS !== 1200) {
  console.error('❌ SIMULATION_DURATION_SECONDS should be 1200 (20 minutes)');
}

if (USAGE_THRESHOLD_SECONDS !== 300) {
  console.error('❌ USAGE_THRESHOLD_SECONDS should be 300 (5 minutes)');
}

// Log constants on module load for debugging
console.log('📊 Simulation Constants Loaded:', {
  SIMULATION_DURATION_SECONDS,
  USAGE_THRESHOLD_SECONDS,
  WARNING_5_MIN_REMAINING,
  STALE_SESSION_GRACE_PERIOD_MINUTES,
  'Duration (minutes)': SIMULATION_DURATION_SECONDS / 60,
  'Usage threshold (minutes)': USAGE_THRESHOLD_SECONDS / 60,
});
