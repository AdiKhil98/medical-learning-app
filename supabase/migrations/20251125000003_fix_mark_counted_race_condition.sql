-- Migration: Fix race condition in mark_simulation_counted
-- Date: 2025-11-25
-- Issue: Double-counting when multiple requests call mark_simulation_counted simultaneously
--
-- VULNERABILITY (Before Fix):
-- Thread 1: SELECT counted_toward_usage → false
-- Thread 2: SELECT counted_toward_usage → false (concurrent read!)
-- Thread 1: UPDATE counted_toward_usage = true
-- Thread 1: INCREMENT counter (+1)
-- Thread 2: UPDATE counted_toward_usage = true (redundant)
-- Thread 2: INCREMENT counter (+1)  ← DOUBLE COUNT!
--
-- FIX: Use atomic UPDATE with WHERE clause to test-and-set in one operation

CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_started_at timestamptz;
  v_elapsed_seconds integer;
  v_subscription_tier text;
  v_updated_count integer;
BEGIN
  -- ATOMIC TEST-AND-SET: Update only if not already counted
  -- This prevents race conditions by combining the check and update in one operation
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND counted_toward_usage = false  -- CRITICAL: Only update if not already counted
  RETURNING
    started_at,
    EXTRACT(EPOCH FROM (now() - started_at))::integer
  INTO
    v_started_at,
    v_elapsed_seconds;

  -- Check if UPDATE succeeded (v_started_at will be NULL if no rows updated)
  IF v_started_at IS NULL THEN
    -- Either session not found OR already counted
    -- Try to get session info to determine which
    SELECT started_at, counted_toward_usage
    INTO v_started_at, v_updated_count
    FROM simulation_usage_logs
    WHERE session_token = p_session_token
      AND user_id = p_user_id;

    IF v_started_at IS NULL THEN
      -- Session not found
      RETURN json_build_object(
        'success', false,
        'error', 'Session not found'
      );
    ELSE
      -- Session exists but was already counted (race condition prevented!)
      RETURN json_build_object(
        'success', true,
        'already_counted', true,
        'message', 'Simulation already counted (prevented double-count)'
      );
    END IF;
  END IF;

  -- Verify elapsed time is at least 5 minutes (300 seconds)
  IF v_elapsed_seconds < 300 THEN
    -- This shouldn't happen if frontend is correct, but safety check
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 300
    );
  END IF;

  -- Get subscription tier for counter increment
  SELECT subscription_tier INTO v_subscription_tier
  FROM users
  WHERE id = p_user_id;

  -- ATOMIC: Increment user's counter
  -- Only reaches here if the UPDATE above succeeded (counted_toward_usage was false)
  UPDATE users
  SET
    simulations_used_this_month = CASE
      WHEN v_subscription_tier IS NOT NULL AND v_subscription_tier != ''
      THEN simulations_used_this_month + 1
      ELSE simulations_used_this_month
    END,
    free_simulations_used = CASE
      WHEN v_subscription_tier IS NULL OR v_subscription_tier = ''
      THEN free_simulations_used + 1
      ELSE free_simulations_used
    END
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'counted', true,
    'elapsed_seconds', v_elapsed_seconds,
    'message', 'Simulation marked as counted'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_simulation_counted IS 'Atomically marks simulation as counted and increments user counter. Prevents double-counting via test-and-set UPDATE.';

-- Similarly fix end_simulation_session to use atomic test-and-set
CREATE OR REPLACE FUNCTION end_simulation_session(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_started_at timestamptz;
  v_ended_at timestamptz := now();
  v_duration_seconds integer;
  v_should_count boolean;
  v_subscription_tier text;
  v_was_already_counted boolean;
BEGIN
  -- Get session info and check if already counted
  SELECT started_at, counted_toward_usage, ended_at
  INTO v_started_at, v_was_already_counted, v_ended_at
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  IF v_started_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- If session already ended, return success (idempotent)
  IF v_ended_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'already_ended', true,
      'message', 'Session already ended'
    );
  END IF;

  -- Calculate duration based on server time
  v_duration_seconds := EXTRACT(EPOCH FROM (now() - v_started_at))::integer;

  -- Determine if simulation should count (>= 5 minutes = 300 seconds)
  v_should_count := v_duration_seconds >= 300;

  -- Update session with end time and duration
  UPDATE simulation_usage_logs
  SET
    ended_at = now(),
    duration_seconds = v_duration_seconds,
    counted_toward_usage = v_should_count,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND ended_at IS NULL;  -- Only update if not already ended

  -- ATOMIC: Increment counter ONLY if:
  -- 1. Simulation should count (>= 5 min)
  -- 2. Was NOT already counted by mark_simulation_counted()
  IF v_should_count AND NOT v_was_already_counted THEN
    -- Get subscription tier
    SELECT subscription_tier INTO v_subscription_tier
    FROM users
    WHERE id = p_user_id;

    -- Increment the appropriate counter
    UPDATE users
    SET
      simulations_used_this_month = CASE
        WHEN v_subscription_tier IS NOT NULL AND v_subscription_tier != ''
        THEN simulations_used_this_month + 1
        ELSE simulations_used_this_month
      END,
      free_simulations_used = CASE
        WHEN v_subscription_tier IS NULL OR v_subscription_tier = ''
        THEN free_simulations_used + 1
        ELSE free_simulations_used
      END
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'duration_seconds', v_duration_seconds,
    'counted_toward_usage', v_should_count,
    'was_already_counted', v_was_already_counted,
    'message', CASE
      WHEN v_should_count AND NOT v_was_already_counted THEN 'Simulation completed and counted (>= 5 minutes)'
      WHEN v_should_count AND v_was_already_counted THEN 'Simulation completed (already counted at 5-min mark)'
      ELSE 'Simulation ended but not counted (< 5 minutes)'
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION end_simulation_session IS 'Ends simulation session and atomically increments counter if duration >= 5 min and not already counted.';
