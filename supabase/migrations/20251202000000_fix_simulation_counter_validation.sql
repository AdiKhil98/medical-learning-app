-- Migration: Fix simulation counter validation buffer
-- Date: 2025-12-02
-- Issue: Network delays cause server to see 298-299 seconds when client sends at 300 seconds
-- Fix: Add 5-second buffer to account for network latency (>= 295 instead of >= 300)

-- Update mark_simulation_counted function to use 295-second threshold
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

  -- FIX: Verify elapsed time is at least 295 seconds (5 minutes with 5-second buffer for network delay)
  -- Network latency means client sees 300s but server might see 298-299s
  IF v_elapsed_seconds < 295 THEN
    -- This shouldn't happen if frontend is correct, but safety check
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 295,
      'note', '5-second buffer for network latency'
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

COMMENT ON FUNCTION mark_simulation_counted IS 'Atomically marks simulation as counted and increments user counter. Uses 295-second threshold (5 min with network buffer). Prevents double-counting via test-and-set UPDATE.';
