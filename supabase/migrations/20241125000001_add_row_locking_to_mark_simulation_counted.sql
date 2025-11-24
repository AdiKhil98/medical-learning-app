-- Migration: Add row locking to mark_simulation_counted to prevent double-counting
-- Purpose: Ensure atomic counter increments even with concurrent requests
-- Date: 2024-11-25

-- Update mark_simulation_counted function with row locking
CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_started_at timestamptz;
  v_elapsed_seconds integer;
  v_already_counted boolean;
  v_subscription_tier text;
BEGIN
  -- Get session details WITH ROW LOCK to prevent concurrent updates
  SELECT started_at, counted_toward_usage
  INTO v_started_at, v_already_counted
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id
  FOR UPDATE; -- ← CRITICAL: Lock this row until transaction completes

  IF v_started_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Already counted? Don't double-count
  IF v_already_counted THEN
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted'
    );
  END IF;

  -- Calculate elapsed time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_started_at))::integer;

  -- Must be at least 5 minutes (300 seconds)
  IF v_elapsed_seconds < 300 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 300
    );
  END IF;

  -- Mark as counted WITH ROW LOCK
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = v_elapsed_seconds,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  -- Get subscription tier WITH ROW LOCK to prevent concurrent tier changes
  SELECT subscription_tier INTO v_subscription_tier
  FROM users
  WHERE id = p_user_id
  FOR UPDATE; -- ← CRITICAL: Lock user row until transaction completes

  -- Increment user's counter (atomic operation)
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

-- Add comment
COMMENT ON FUNCTION mark_simulation_counted IS 'Marks simulation as counted at 5-minute mark with row-level locking to prevent double-counting';
