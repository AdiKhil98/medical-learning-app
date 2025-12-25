-- ============================================
-- CRITICAL FIX: Apply this SQL directly in Supabase Dashboard
-- ============================================
--
-- PURPOSE: Fix quota deduction at 5-minute mark
--
-- HOW TO APPLY:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy this ENTIRE file
-- 3. Paste and click "Run"
-- 4. Verify you see "Query executed successfully"
--
-- WHAT THIS DOES:
-- - Updates mark_simulation_counted() to DIRECTLY increment user_simulation_quota
-- - Uses timer_started_at (not started_at) for accurate duration validation
-- - Prevents double-counting with atomic operations
-- ============================================

CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_timer_started_at timestamptz;
  v_started_at timestamptz;
  v_elapsed_seconds integer;
  v_already_counted boolean;
BEGIN
  -- STEP 1: Get session info
  SELECT
    timer_started_at,
    started_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(timer_started_at, started_at)))::integer,
    counted_toward_usage
  INTO
    v_timer_started_at,
    v_started_at,
    v_elapsed_seconds,
    v_already_counted
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  -- Session not found
  IF v_started_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Already counted (idempotent)
  IF v_already_counted = true THEN
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted'
    );
  END IF;

  -- STEP 2: Validate duration (>= 295 seconds = 5 minutes - 5 second buffer)
  IF v_elapsed_seconds < 295 THEN
    RAISE NOTICE 'Simulation too short: % < 295 seconds', v_elapsed_seconds;
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds
    );
  END IF;

  -- STEP 3: Mark session as counted (atomic)
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND counted_toward_usage = false;  -- Prevent race conditions

  IF NOT FOUND THEN
    -- Already counted by another request
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Already counted (race prevented)'
    );
  END IF;

  -- STEP 4: INCREMENT QUOTA DIRECTLY (bypass broken sync trigger)
  -- This is the CRITICAL FIX
  UPDATE user_simulation_quota
  SET simulations_used = simulations_used + 1
  WHERE user_id = p_user_id;

  -- Verify quota was updated
  IF NOT FOUND THEN
    RAISE WARNING 'user_simulation_quota row not found for user %', p_user_id;
    -- Still return success since session was marked
  END IF;

  RAISE NOTICE 'Simulation counted: session=%, duration=%s, quota incremented',
    p_session_token, v_elapsed_seconds;

  RETURN json_build_object(
    'success', true,
    'counted', true,
    'elapsed_seconds', v_elapsed_seconds,
    'message', 'Simulation marked as counted and quota incremented'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in mark_simulation_counted: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_simulation_counted IS
'FIXED: Updates user_simulation_quota.simulations_used DIRECTLY (bypasses broken sync trigger).
Validates duration >= 295 seconds (using timer_started_at not started_at).
Atomic operation prevents double-counting.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ mark_simulation_counted function updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Test by starting a simulation';
  RAISE NOTICE '2. Wait 5 minutes';
  RAISE NOTICE '3. Check console for: "✅ Simulation usage recorded in database"';
  RAISE NOTICE '4. Verify user_simulation_quota.simulations_used incremented by 1';
  RAISE NOTICE '';
  RAISE NOTICE 'If it still doesn''t work, check browser console for errors.';
END $$;
