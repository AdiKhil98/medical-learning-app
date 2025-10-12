-- Emergency fix: Update existing database functions to use 5-minute threshold
-- Run this in your Supabase SQL Editor

-- Update the validate_simulation_usage function to use 300 seconds (5 minutes) instead of 600
CREATE OR REPLACE FUNCTION validate_simulation_usage(
  p_session_token text,
  p_user_id uuid,
  p_min_elapsed_seconds integer DEFAULT 300 -- Changed from 600 to 300 (5 minutes)
)
RETURNS json AS $$
DECLARE
  v_session simulation_usage_logs%ROWTYPE;
  v_elapsed_seconds integer;
  v_now timestamptz := now();
BEGIN
  -- Get the session
  SELECT * INTO v_session
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
  AND user_id = p_user_id
  AND status = 'started';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'session_not_found',
      'message', 'Session not found or not in started state'
    );
  END IF;

  -- Calculate elapsed time based on server time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_session.started_at));

  -- Check if minimum time has elapsed
  IF v_elapsed_seconds < p_min_elapsed_seconds THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'insufficient_time',
      'message', format('Only %s seconds elapsed, need %s seconds', v_elapsed_seconds, p_min_elapsed_seconds),
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', p_min_elapsed_seconds
    );
  END IF;

  -- Valid - can mark as used
  RETURN json_build_object(
    'valid', true,
    'elapsed_seconds', v_elapsed_seconds,
    'session_id', v_session.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the silent_refund_simulation function to use 300 seconds (5 minutes) threshold
CREATE OR REPLACE FUNCTION silent_refund_simulation(
  p_session_token TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_duration INTEGER;
  v_status TEXT;
  v_marked_used_at TIMESTAMP;
  v_started_at TIMESTAMP;
  v_simulation_type TEXT;
  v_subscription_tier TEXT;
  v_was_refunded BOOLEAN := false;
  v_refund_reason TEXT := 'not_eligible';
BEGIN
  -- Get session details
  SELECT
    status,
    started_at,
    marked_used_at,
    simulation_type
  INTO
    v_status,
    v_started_at,
    v_marked_used_at,
    v_simulation_type
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  -- If session not found, return error
  IF v_status IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'refunded', false,
      'reason', 'session_not_found',
      'message', 'Session not found'
    );
  END IF;

  -- Calculate actual duration from database timestamps
  IF v_marked_used_at IS NOT NULL THEN
    v_duration := EXTRACT(EPOCH FROM (v_marked_used_at - v_started_at))::INTEGER;
  ELSE
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER;
  END IF;

  -- REFUND CONDITIONS (updated to 5-minute threshold):
  -- 1. Session was marked as 'used' (meaning counter was incremented)
  -- 2. Session ended as 'aborted' or 'incomplete'
  -- 3. Duration was less than 300 seconds (5 minutes)

  IF v_status = 'used' AND v_duration < 300 THEN
    -- This case: Session was marked as used but shouldn't have been
    v_was_refunded := true;
    v_refund_reason := 'used_but_under_threshold';

  ELSIF v_status IN ('aborted', 'incomplete', 'expired') AND v_marked_used_at IS NOT NULL THEN
    -- This case: Session was aborted after being marked as used
    -- Check if it was marked used too early (< 4.5 minutes = 270 seconds)
    IF v_duration < 270 THEN
      v_was_refunded := true;
      v_refund_reason := 'marked_too_early';
    ELSE
      -- Session legitimately reached 5-minute mark, don't refund
      v_refund_reason := 'reached_threshold';
    END IF;

  ELSE
    -- Session was never marked as used, nothing to refund
    v_refund_reason := 'never_marked_used';
  END IF;

  -- Perform refund if eligible
  IF v_was_refunded THEN
    -- Get user's subscription tier
    SELECT subscription_tier INTO v_subscription_tier
    FROM users
    WHERE id = p_user_id;

    IF v_subscription_tier IS NULL OR v_subscription_tier = '' THEN
      -- Free tier - refund to free simulations counter
      UPDATE users
      SET free_simulations_used = GREATEST(0, free_simulations_used - 1)
      WHERE id = p_user_id;

      RAISE LOG 'Refunded free simulation for user % (session: %)', p_user_id, p_session_token;

    ELSE
      -- Paid tier - refund to monthly counter
      UPDATE users
      SET simulations_used_this_month = GREATEST(0, simulations_used_this_month - 1)
      WHERE id = p_user_id;

      RAISE LOG 'Refunded paid simulation for user % (session: %, tier: %)',
        p_user_id, p_session_token, v_subscription_tier;
    END IF;

    -- Update session status for analytics
    UPDATE simulation_usage_logs
    SET
      status = 'refunded_early_abort',
      completed_at = COALESCE(completed_at, NOW()),
      duration_seconds = v_duration,
      metadata = COALESCE(metadata, '{}'::jsonb) ||
        jsonb_build_object(
          'refund_reason', v_refund_reason,
          'refunded_at', NOW(),
          'original_status', v_status
        )
    WHERE session_token = p_session_token;

  END IF;

  -- Return result
  RETURN json_build_object(
    'success', true,
    'refunded', v_was_refunded,
    'reason', v_refund_reason,
    'duration_seconds', v_duration,
    'original_status', v_status,
    'message', CASE
      WHEN v_was_refunded THEN 'Simulation refunded successfully'
      WHEN v_refund_reason = 'reached_threshold' THEN 'Simulation legitimately reached 5-minute threshold'
      WHEN v_refund_reason = 'never_marked_used' THEN 'Simulation was never marked as used'
      ELSE 'No refund necessary'
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in silent_refund_simulation: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'refunded', false,
      'reason', 'error',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification query - Run this to confirm the update worked
SELECT
  'validate_simulation_usage' as function_name,
  prokind as function_type,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'validate_simulation_usage'
LIMIT 1;

SELECT
  'silent_refund_simulation' as function_name,
  prokind as function_type,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'silent_refund_simulation'
LIMIT 1;
