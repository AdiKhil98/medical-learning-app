import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  SIMULATION_DURATION_SECONDS,
  USAGE_THRESHOLD_SECONDS,
  WARNING_5_MIN_REMAINING,
} from '@/constants/simulationConstants';

/**
 * Timer warning levels for visual feedback
 */
export type TimerWarningLevel = 'normal' | 'yellow' | 'orange' | 'red';

/**
 * Configuration options for the simulation timer
 */
export interface UseSimulationTimerConfig {
  /** Total duration in seconds (default: 1200 = 20 min) */
  durationSeconds?: number;
  /** Threshold in seconds for marking as "used" (default: 300 = 5 min) */
  usageThresholdSeconds?: number;
  /** Callback when timer reaches 0 */
  onTimeUp?: () => void;
  /** Callback when usage threshold is reached (5-minute mark) */
  onUsageThresholdReached?: (elapsedSeconds: number) => void;
  /** Callback for warning messages */
  onWarning?: (message: string, level: TimerWarningLevel) => void;
  /** Whether the timer should be active */
  isActive?: boolean;
}

/**
 * Return type for the useSimulationTimer hook
 */
export interface SimulationTimerState {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Formatted time string (MM:SS) */
  formattedTime: string;
  /** Elapsed time in seconds */
  elapsedTime: number;
  /** Whether timer is currently active */
  isActive: boolean;
  /** Whether timer has reached 0 */
  isTimeUp: boolean;
  /** Whether usage threshold has been reached */
  usageThresholdReached: boolean;
  /** Current warning level for styling */
  warningLevel: TimerWarningLevel;
  /** Start the timer */
  start: () => void;
  /** Stop the timer */
  stop: () => void;
  /** Reset the timer to initial duration */
  reset: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume from paused state */
  resume: () => void;
}

/**
 * Enhanced simulation timer hook with absolute timestamp-based timing
 *
 * Features:
 * - Uses Date.now() for drift-free timing
 * - 5-minute threshold detection for quota counting
 * - Warning system at multiple time thresholds
 * - Background/foreground handling for mobile
 * - Pause/resume support
 *
 * @example
 * ```tsx
 * const timer = useSimulationTimer({
 *   onTimeUp: () => handleSimulationEnd(),
 *   onUsageThresholdReached: (elapsed) => markSimulationAsUsed(elapsed),
 *   onWarning: (msg, level) => showWarning(msg, level),
 * });
 *
 * // In your component
 * <Text style={{ color: getWarningColor(timer.warningLevel) }}>
 *   {timer.formattedTime}
 * </Text>
 *
 * // Start when ready
 * timer.start();
 * ```
 */
export function useSimulationTimer(config: UseSimulationTimerConfig = {}): SimulationTimerState {
  const {
    durationSeconds = SIMULATION_DURATION_SECONDS,
    usageThresholdSeconds = USAGE_THRESHOLD_SECONDS,
    onTimeUp,
    onUsageThresholdReached,
    onWarning,
    isActive: externalIsActive,
  } = config;

  // State
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(false);
  const [usageThresholdReached, setUsageThresholdReached] = useState(false);
  const [warningLevel, setWarningLevel] = useState<TimerWarningLevel>('normal');

  // Refs for closure-safe access
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number>(0);
  const pausedTimeRemainingRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number>(durationSeconds);
  const usageThresholdReachedRef = useRef(false);
  const isActiveRef = useRef(false);

  // Sync external isActive prop
  useEffect(() => {
    if (externalIsActive !== undefined) {
      if (externalIsActive && !isActiveRef.current) {
        start();
      } else if (!externalIsActive && isActiveRef.current) {
        stop();
      }
    }
  }, [externalIsActive]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Clear interval helper
  const clearTimerInterval = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  // Start the timer
  const start = useCallback(() => {
    if (isActiveRef.current) {
      console.log('[Timer] Already active, ignoring start');
      return;
    }

    console.log('[Timer] Starting simulation timer');

    // Calculate end time (absolute timestamp)
    const startTime = Date.now();
    const duration =
      pausedTimeRemainingRef.current !== null ? pausedTimeRemainingRef.current * 1000 : durationSeconds * 1000;
    const endTime = startTime + duration;

    endTimeRef.current = endTime;
    pausedTimeRemainingRef.current = null;
    isActiveRef.current = true;
    setIsActive(true);

    // Clear any existing interval
    clearTimerInterval();

    // Create new interval (1 second for mobile compatibility)
    timerInterval.current = setInterval(() => {
      const now = Date.now();
      const remaining = endTimeRef.current - now;
      const remainingSeconds = Math.max(0, Math.floor(remaining / 1000));
      const prev = previousTimeRef.current;

      // Calculate elapsed time
      const elapsedSeconds = durationSeconds - remainingSeconds;

      // Update state
      setTimeRemaining(remainingSeconds);
      previousTimeRef.current = remainingSeconds;

      // Check for timer end
      if (remaining <= 0) {
        console.log('[Timer] Time is up!');
        clearTimerInterval();
        isActiveRef.current = false;
        setIsActive(false);
        setTimeRemaining(0);
        onTimeUp?.();
        return;
      }

      // Check for usage threshold (5-minute mark)
      if (elapsedSeconds >= usageThresholdSeconds && !usageThresholdReachedRef.current) {
        console.log(`[Timer] Usage threshold reached at ${elapsedSeconds} seconds`);
        usageThresholdReachedRef.current = true;
        setUsageThresholdReached(true);
        onUsageThresholdReached?.(elapsedSeconds);
      }

      // Warning thresholds (only trigger once per threshold)
      if (prev > WARNING_5_MIN_REMAINING && remainingSeconds <= WARNING_5_MIN_REMAINING) {
        setWarningLevel('yellow');
        onWarning?.('5 Minuten verbleibend', 'yellow');
      }
      if (prev > 120 && remainingSeconds <= 120) {
        setWarningLevel('orange');
        onWarning?.('2 Minuten verbleibend', 'orange');
      }
      if (prev > 60 && remainingSeconds <= 60) {
        setWarningLevel('red');
        onWarning?.('Nur noch 1 Minute!', 'red');
      }
      if (prev > 30 && remainingSeconds <= 30) {
        onWarning?.('30 Sekunden verbleibend', 'red');
      }
      if (prev > 10 && remainingSeconds <= 10) {
        onWarning?.('Simulation endet in 10 Sekunden', 'red');
      }
    }, 1000);
  }, [durationSeconds, usageThresholdSeconds, onTimeUp, onUsageThresholdReached, onWarning, clearTimerInterval]);

  // Stop the timer
  const stop = useCallback(() => {
    console.log('[Timer] Stopping timer');
    clearTimerInterval();
    isActiveRef.current = false;
    setIsActive(false);
    pausedTimeRemainingRef.current = null;
  }, [clearTimerInterval]);

  // Pause the timer
  const pause = useCallback(() => {
    if (!isActiveRef.current) return;

    console.log('[Timer] Pausing timer');
    clearTimerInterval();
    pausedTimeRemainingRef.current = timeRemaining;
    isActiveRef.current = false;
    setIsActive(false);
  }, [timeRemaining, clearTimerInterval]);

  // Resume from paused state
  const resume = useCallback(() => {
    if (pausedTimeRemainingRef.current === null) {
      console.log('[Timer] Cannot resume - not paused');
      return;
    }
    console.log('[Timer] Resuming timer');
    start();
  }, [start]);

  // Reset the timer
  const reset = useCallback(() => {
    console.log('[Timer] Resetting timer');
    clearTimerInterval();
    isActiveRef.current = false;
    setIsActive(false);
    setTimeRemaining(durationSeconds);
    setUsageThresholdReached(false);
    setWarningLevel('normal');
    previousTimeRef.current = durationSeconds;
    pausedTimeRemainingRef.current = null;
    usageThresholdReachedRef.current = false;
  }, [durationSeconds, clearTimerInterval]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && isActiveRef.current) {
        // Timer continues in background (by design)
        console.log('[Timer] App went to background - timer continues');
      } else if (nextAppState === 'active' && isActiveRef.current) {
        // Recalculate remaining time when coming back
        const remaining = endTimeRef.current - Date.now();
        const remainingSeconds = Math.max(0, Math.floor(remaining / 1000));
        setTimeRemaining(remainingSeconds);
        console.log(`[Timer] App returned to foreground - ${remainingSeconds}s remaining`);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    elapsedTime: durationSeconds - timeRemaining,
    isActive,
    isTimeUp: timeRemaining === 0,
    usageThresholdReached,
    warningLevel,
    start,
    stop,
    reset,
    pause,
    resume,
  };
}

/**
 * Helper function to get color based on warning level
 */
export function getWarningColor(level: TimerWarningLevel): string {
  switch (level) {
    case 'yellow':
      return '#f59e0b'; // Amber
    case 'orange':
      return '#f97316'; // Orange
    case 'red':
      return '#ef4444'; // Red
    default:
      return '#10b981'; // Green
  }
}
