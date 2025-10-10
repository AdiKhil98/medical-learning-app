-- Migration: Add silent refund function for early-aborted simulations
-- Created: 2025-01-10
-- Purpose: Automatically refund simulations aborted before 10-minute threshold

-- ============================================================================
-- FUNCTION: silent_refund_simulation
-- ============================================================================
-- Refunds a simulation if it was aborted/incomplete before 10-minute mark
-- This function:
-- 1. Checks if session was aborted before 10 minutes
-- 2. Checks if usage was actually recorded (status = 'used')
-- 3. Decrements appropriate counter (free or paid tier)
-- 4. Updates session status for analytics
-- ============================================================================

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

  -- REFUND CONDITIONS:
  -- 1. Session was marked as 'used' (meaning counter was incremented)
  -- 2. Session ended as 'aborted' or 'incomplete'
  -- 3. Duration was less than 600 seconds (10 minutes)

  IF v_status = 'used' AND v_duration < 600 THEN
    -- This case: Session was marked as used but shouldn't have been
    -- (possible timing bug or manual database manipulation)
    v_was_refunded := true;
    v_refund_reason := 'used_but_under_threshold';

  ELSIF v_status IN ('aborted', 'incomplete', 'expired') AND v_marked_used_at IS NOT NULL THEN
    -- This case: Session was aborted after being marked as used
    -- Check if it was marked used too early (< 9.5 minutes)
    IF v_duration < 570 THEN
      v_was_refunded := true;
      v_refund_reason := 'marked_too_early';
    ELSE
      -- Session legitimately reached 10-minute mark, don't refund
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
      WHEN v_refund_reason = 'reached_threshold' THEN 'Simulation legitimately reached 10-minute threshold'
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION silent_refund_simulation(TEXT, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION silent_refund_simulation(TEXT, UUID) IS
'Silently refunds simulations that were aborted before 10-minute threshold.
Returns JSON with refund status and reason. Automatically called on simulation abort.';

-- ============================================================================
-- HELPER FUNCTION: check_refund_eligibility (for admin/debugging)
-- ============================================================================
-- Check if a session is eligible for refund WITHOUT actually refunding

CREATE OR REPLACE FUNCTION check_refund_eligibility(
  p_session_token TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_duration INTEGER;
  v_status TEXT;
  v_marked_used_at TIMESTAMP;
  v_started_at TIMESTAMP;
  v_is_eligible BOOLEAN := false;
  v_reason TEXT;
BEGIN
  SELECT
    status,
    started_at,
    marked_used_at
  INTO
    v_status,
    v_started_at,
    v_marked_used_at
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  IF v_status IS NULL THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'session_not_found'
    );
  END IF;

  IF v_marked_used_at IS NOT NULL THEN
    v_duration := EXTRACT(EPOCH FROM (v_marked_used_at - v_started_at))::INTEGER;
  ELSE
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_started_at))::INTEGER;
  END IF;

  IF v_status = 'used' AND v_duration < 600 THEN
    v_is_eligible := true;
    v_reason := 'marked_used_but_under_threshold';
  ELSIF v_status IN ('aborted', 'incomplete') AND v_marked_used_at IS NOT NULL AND v_duration < 570 THEN
    v_is_eligible := true;
    v_reason := 'aborted_after_premature_marking';
  ELSE
    v_reason := 'not_eligible';
  END IF;

  RETURN json_build_object(
    'eligible', v_is_eligible,
    'reason', v_reason,
    'status', v_status,
    'duration', v_duration,
    'marked_used_at', v_marked_used_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_refund_eligibility(TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION check_refund_eligibility(TEXT, UUID) IS
'Check if a simulation session is eligible for refund without actually refunding.
Useful for debugging and admin tools.';
