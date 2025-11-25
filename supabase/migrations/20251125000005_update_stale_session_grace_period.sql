-- Migration: Update stale session grace period and fix N+1 query problem
-- Date: 2025-11-25
-- Changes:
--   1. Increase grace period from 25 to 40 minutes (better buffer for real-world scenarios)
--   2. Fix N+1 query problem by batching updates (performance optimization)
--
-- Grace Period Rationale:
-- - 20 min: Normal simulation duration
-- - 10 min: Buffer for network delays, device performance issues
-- - 10 min: Additional safety for edge cases (emergency calls, etc.)
-- = 40 min total

CREATE OR REPLACE FUNCTION cleanup_stale_simulation_sessions()
RETURNS json AS $$
DECLARE
  v_cleaned_count integer := 0;
  v_user_counter_updates jsonb;
BEGIN
  -- OPTIMIZATION: Use CTE and batch operations instead of FOR LOOP
  -- This reduces database round-trips from N to 2-3 queries total

  -- Step 1: Identify stale sessions and update them atomically
  WITH stale_sessions AS (
    SELECT
      id,
      user_id,
      session_token,
      started_at,
      counted_toward_usage
    FROM simulation_usage_logs
    WHERE ended_at IS NULL
      AND started_at < now() - INTERVAL '40 minutes'  -- Updated grace period
    FOR UPDATE  -- Lock rows to prevent race conditions
  ),
  updated_sessions AS (
    UPDATE simulation_usage_logs
    SET
      ended_at = started_at + INTERVAL '20 minutes',
      duration_seconds = 1200,  -- 20 minutes
      counted_toward_usage = true,  -- Stale sessions assumed to have run full duration
      updated_at = now()
    FROM stale_sessions
    WHERE simulation_usage_logs.id = stale_sessions.id
    RETURNING
      simulation_usage_logs.user_id,
      stale_sessions.counted_toward_usage as was_already_counted
  ),
  -- Step 2: Aggregate counter updates by user
  user_increments AS (
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE NOT was_already_counted) as sessions_to_count
    FROM updated_sessions
    GROUP BY user_id
  )
  -- Step 3: Get total cleaned count
  SELECT COUNT(*) INTO v_cleaned_count
  FROM updated_sessions;

  -- Step 4: Batch update user counters
  -- Only increment for sessions that weren't already counted
  UPDATE users u
  SET
    simulations_used_this_month = CASE
      WHEN u.subscription_tier IS NOT NULL AND u.subscription_tier != ''
      THEN u.simulations_used_this_month + ui.sessions_to_count
      ELSE u.simulations_used_this_month
    END,
    free_simulations_used = CASE
      WHEN u.subscription_tier IS NULL OR u.subscription_tier = ''
      THEN u.free_simulations_used + ui.sessions_to_count
      ELSE u.free_simulations_used
    END
  FROM (
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE NOT was_already_counted) as sessions_to_count
    FROM (
      SELECT
        s.user_id,
        s.counted_toward_usage as was_already_counted
      FROM simulation_usage_logs s
      WHERE s.id IN (
        SELECT id FROM simulation_usage_logs
        WHERE ended_at IS NOT NULL
          AND updated_at >= now() - INTERVAL '1 minute'  -- Recently updated by this function
          AND duration_seconds = 1200  -- Stale session marker
      )
    ) recent_updates
    GROUP BY user_id
  ) ui
  WHERE u.id = ui.user_id
    AND ui.sessions_to_count > 0;

  -- Log cleanup activity
  IF v_cleaned_count > 0 THEN
    RAISE LOG 'Cleaned up % stale session(s) with 40-minute grace period', v_cleaned_count;
  END IF;

  RETURN json_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'grace_period_minutes', 40,
    'message', format('Cleaned up %s stale session(s)', v_cleaned_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_stale_simulation_sessions IS 'Cleans up stale sessions (40-min grace period). Uses batch operations to avoid N+1 query problem.';

-- Note: Grace period increased from 25 to 40 minutes
-- This provides better buffer for:
-- - Network connectivity issues (slow connections, timeouts)
-- - Device performance problems (slow phones, background apps)
-- - User interruptions (emergency calls, brief breaks)
-- - Edge cases (timezone changes, DST transitions, etc.)
