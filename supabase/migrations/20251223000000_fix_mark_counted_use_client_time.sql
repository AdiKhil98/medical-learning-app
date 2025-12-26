-- ============================================
-- CRITICAL FIX: Use client elapsed time for quota counting
-- Date: 2025-12-23
-- ============================================
--
-- PROBLEM:
-- Client correctly calculates "5 minutes elapsed" (300 seconds)
-- But mark_simulation_counted() IGNORES client time and calculates from server timestamps
-- This causes failures when timer_started_at is NULL or timestamps are out of sync
--
-- SOLUTION:
-- Accept client_elapsed_seconds parameter
-- Validate it's reasonable (>= 295, <= 1800)
-- Use client time as source of truth (client timer is accurate)
--
-- This removes dependency on timer_started_at and async timestamp synchronization
-- ============================================

-- STEP 1: Drop the old function signature (2 parameters)
-- This prevents the "function name is not unique" error
DROP FUNCTION IF EXISTS mark_simulation_counted(text, uuid);

-- STEP 2: Create the new function with 3 parameters (added client_elapsed_seconds)
CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid,
  p_client_elapsed_seconds integer DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_session_exists boolean;
  v_already_counted boolean;
  v_elapsed_seconds integer;
  v_timer_started_at timestamptz;
  v_started_at timestamptz;
  v_server_elapsed integer;
BEGIN
  -- STEP 1: Get session info
  SELECT
    true,
    counted_toward_usage,
    timer_started_at,
    started_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(timer_started_at, started_at)))::integer
  INTO
    v_session_exists,
    v_already_counted,
    v_timer_started_at,
    v_started_at,
    v_server_elapsed
  FROM simulation_usage_logs
  WHERE session_token = p_session_token::uuid
    AND user_id = p_user_id;

  -- Session not found
  IF v_session_exists IS NULL OR v_session_exists = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Already counted (idempotent - not an error)
  IF v_already_counted = true THEN
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted (prevented double-count)'
    );
  END IF;

  -- STEP 2: DETERMINE ELAPSED TIME
  -- PRIORITY: Use client time if provided, fallback to server calculation
  IF p_client_elapsed_seconds IS NOT NULL THEN
    v_elapsed_seconds := p_client_elapsed_seconds;
    RAISE NOTICE 'Using client elapsed time: %s seconds', v_elapsed_seconds;
  ELSE
    v_elapsed_seconds := v_server_elapsed;
    RAISE NOTICE 'Using server calculated time: %s seconds (timer_started_at: %)',
      v_elapsed_seconds, v_timer_started_at;
  END IF;

  -- STEP 3: VALIDATE ELAPSED TIME
  -- Minimum: 295 seconds (5 minutes - 5 second network buffer)
  -- Maximum: 1800 seconds (30 minutes - prevents abuse)
  IF v_elapsed_seconds < 295 THEN
    RAISE NOTICE 'Simulation too short: %s < 295 seconds (session: %)',
      v_elapsed_seconds, p_session_token;
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 295
    );
  END IF;

  IF v_elapsed_seconds > 1800 THEN
    RAISE WARNING 'Elapsed time exceeds maximum: %s seconds, capping at 1800', v_elapsed_seconds;
    v_elapsed_seconds := 1800;
  END IF;

  -- STEP 4: MARK SESSION AS COUNTED (atomic test-and-set)
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = v_elapsed_seconds,  -- Record the elapsed time used
    updated_at = now()
  WHERE session_token = p_session_token::uuid
    AND user_id = p_user_id
    AND counted_toward_usage = false;  -- Prevents race conditions

  -- Check if UPDATE succeeded
  IF NOT FOUND THEN
    -- Another request already counted it (race condition prevented)
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted (race prevented)'
    );
  END IF;

  -- STEP 5: INCREMENT QUOTA DIRECTLY
  -- Update user_simulation_quota.simulations_used directly (bypasses sync trigger issues)
  UPDATE user_simulation_quota
  SET simulations_used = simulations_used + 1
  WHERE user_id = p_user_id;

  -- Verify quota was updated
  IF NOT FOUND THEN
    RAISE WARNING 'user_simulation_quota row not found for user %', p_user_id;
    -- Still return success since session was marked
  END IF;

  RAISE NOTICE 'Simulation counted: session=%, elapsed=%ss (source: %s), quota incremented',
    p_session_token,
    v_elapsed_seconds,
    CASE WHEN p_client_elapsed_seconds IS NOT NULL THEN 'client' ELSE 'server' END;

  RETURN json_build_object(
    'success', true,
    'counted', true,
    'elapsed_seconds', v_elapsed_seconds,
    'source', CASE WHEN p_client_elapsed_seconds IS NOT NULL THEN 'client' ELSE 'server' END,
    'message', 'Simulation marked as counted'
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

GRANT EXECUTE ON FUNCTION mark_simulation_counted TO authenticated;

COMMENT ON FUNCTION mark_simulation_counted IS
'FIXED: Uses client elapsed time as source of truth (with validation).
Accepts optional p_client_elapsed_seconds parameter (300 = 5 minutes).
Validates: 295 <= elapsed <= 1800 seconds.
Updates user_simulation_quota.simulations_used directly.
Atomic operation prevents double-counting.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'QUOTA COUNTING FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'mark_simulation_counted() now accepts client elapsed time:';
  RAISE NOTICE '  - Client sends exact elapsed seconds (e.g., 300 at 5-min mark)';
  RAISE NOTICE '  - Database validates: 295 <= elapsed <= 1800';
  RAISE NOTICE '  - Database trusts client time (client timer is accurate)';
  RAISE NOTICE '  - Removes dependency on timer_started_at timestamps';
  RAISE NOTICE '';
  RAISE NOTICE 'Function signature:';
  RAISE NOTICE '  mark_simulation_counted(session_token, user_id, client_elapsed_seconds)';
  RAISE NOTICE '';
  RAISE NOTICE 'Example:';
  RAISE NOTICE '  SELECT mark_simulation_counted(';
  RAISE NOTICE '    ''uuid-here'',';
  RAISE NOTICE '    ''user-uuid'',';
  RAISE NOTICE '    300  -- 5 minutes elapsed';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
