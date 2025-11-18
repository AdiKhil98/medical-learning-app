-- CRITICAL SECURITY FIX: Add row locks and authorization to mark_simulation_counted
-- Migration: fix_mark_simulation_counted
-- Date: 2025-11-18
-- Issue: Race conditions and missing auth checks in mark_simulation_counted function

-- ============================================
-- VULNERABILITIES (Before Fix)
-- ============================================
-- 1. No row lock on simulation_usage_logs SELECT
--    → Two concurrent calls could both see counted_toward_usage = false
--    → Both would increment counter (double counting!)
-- 2. No row lock on users SELECT
--    → Race condition when updating counters
-- 3. No authorization check
--    → User A could mark User B's simulation as counted
-- 4. Separate SELECT and UPDATE queries
--    → Not atomic, vulnerable to concurrent modifications

-- ============================================
-- Fix: Add row locks and authorization
-- ============================================
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
  v_subscription_status text;
BEGIN
  -- CRITICAL: Verify caller owns this user_id
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot mark other users simulations as counted'
      USING HINT = 'You can only mark your own simulations';
  END IF;

  -- CRITICAL: Lock the row to prevent concurrent calls from double-counting
  -- This ensures only ONE transaction can proceed past this point
  SELECT started_at, counted_toward_usage
  INTO v_started_at, v_already_counted
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id
  FOR UPDATE;  -- ⚡ ROW LOCK: Prevents race condition

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

  -- Mark as counted in simulation_usage_logs
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = v_elapsed_seconds,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND user_id = auth.uid();  -- Double-check authorization

  -- CRITICAL: Lock user row AND get subscription info atomically
  SELECT subscription_tier, subscription_status
  INTO v_subscription_tier, v_subscription_status
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;  -- ⚡ ROW LOCK: Prevents race condition in counter updates

  -- Determine which counter to increment based on subscription status
  -- Active statuses: active, on_trial, past_due
  IF v_subscription_tier IS NOT NULL
     AND v_subscription_tier != ''
     AND v_subscription_status IN ('active', 'on_trial', 'past_due') THEN
    -- Paid tier: increment monthly counter
    UPDATE users
    SET simulations_used_this_month = simulations_used_this_month + 1
    WHERE id = p_user_id
      AND id = auth.uid();  -- Double-check authorization
  ELSE
    -- Free tier: increment free counter
    UPDATE users
    SET free_simulations_used = free_simulations_used + 1
    WHERE id = p_user_id
      AND id = auth.uid();  -- Double-check authorization
  END IF;

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

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION mark_simulation_counted(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_simulation_counted(text, uuid) TO authenticated;

COMMENT ON FUNCTION mark_simulation_counted(text, uuid) IS
'Securely marks a simulation as counted after 10 minutes. Includes authorization checks and row locks to prevent race conditions and double-counting.';

-- ============================================
-- Verification Query
-- ============================================
-- Check function security mode
SELECT
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as security_mode
FROM pg_proc p
WHERE p.proname = 'mark_simulation_counted';
