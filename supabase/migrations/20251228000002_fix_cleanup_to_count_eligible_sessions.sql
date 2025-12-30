-- ============================================
-- FIX: Cleanup function should count eligible sessions
-- Date: 2025-12-28
-- ============================================
--
-- PROBLEM:
-- When user ends call right after 5-minute mark, the markSimulationAsUsed RPC
-- may not complete before cleanup_orphaned_sessions_for_user runs.
-- The cleanup function was closing sessions WITHOUT counting them.
--
-- FIX:
-- Update cleanup_orphaned_sessions_for_user to:
-- 1. Check if session is >= 300 seconds (5 min)
-- 2. If so AND not already counted, mark as counted and increment quota
-- 3. Then close the session
--
-- NOTE: Removed 'status' column references as it doesn't exist in the simplified table
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_sessions_for_user(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_session RECORD;
  v_closed_count integer := 0;
  v_counted_count integer := 0;
  v_duration integer;
  v_start_time timestamptz;
BEGIN
  -- Loop directly over orphaned sessions (ended_at IS NULL)
  FOR v_session IN
    SELECT *
    FROM simulation_usage_logs
    WHERE user_id = p_user_id
      AND ended_at IS NULL
    FOR UPDATE SKIP LOCKED  -- Lock to prevent race conditions
  LOOP
    -- Use timer_started_at if available, otherwise started_at
    v_start_time := COALESCE(v_session.timer_started_at, v_session.started_at);

    -- Calculate duration from start to now
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_start_time))::integer;

    -- Cap duration at 1800 seconds (30 minutes)
    v_duration := LEAST(v_duration, 1800);

    -- ============================================
    -- Count session if eligible (>= 300 sec and not already counted)
    -- ============================================
    IF v_duration >= 300 AND v_session.counted_toward_usage = false THEN
      RAISE NOTICE 'Cleanup: Counting orphaned session % (duration: %s >= 300)',
        substring(v_session.session_token::text, 1, 16), v_duration;

      -- Update session: mark as counted (no status column)
      UPDATE simulation_usage_logs
      SET
        ended_at = NOW(),
        duration_seconds = v_duration,
        counted_toward_usage = true
      WHERE session_token = v_session.session_token;

      -- Increment user quota
      UPDATE user_simulation_quota
      SET simulations_used = simulations_used + 1
      WHERE user_id = p_user_id;

      v_counted_count := v_counted_count + 1;
    ELSE
      -- Just close without counting (duration < 300 or already counted)
      UPDATE simulation_usage_logs
      SET
        ended_at = NOW(),
        duration_seconds = v_duration
      WHERE session_token = v_session.session_token;
    END IF;

    v_closed_count := v_closed_count + 1;

    RAISE NOTICE 'Closed orphaned session: % (duration: %s, counted: %)',
      substring(v_session.session_token::text, 1, 16),
      v_duration,
      v_session.counted_toward_usage OR (v_duration >= 300 AND v_session.counted_toward_usage = false);
  END LOOP;

  -- If no sessions were closed
  IF v_closed_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'closed_count', 0,
      'counted_count', 0,
      'message', 'No orphaned sessions found'
    );
  END IF;

  -- Return success with counts
  RETURN json_build_object(
    'success', true,
    'closed_count', v_closed_count,
    'counted_count', v_counted_count,
    'message', format('Closed %s orphaned session(s), counted %s', v_closed_count, v_counted_count)
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Unique constraint on idx_unique_counted_session triggered (already counted)
    RETURN json_build_object(
      'success', true,
      'closed_count', v_closed_count,
      'counted_count', v_counted_count,
      'message', 'Session already counted (unique constraint prevented duplicate)'
    );
  WHEN OTHERS THEN
    RAISE WARNING 'Error in cleanup_orphaned_sessions_for_user: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_sessions_for_user IS
'ENHANCED: Cleans up orphaned sessions (ended_at IS NULL) for a specific user.
Now properly counts sessions >= 5 minutes (300 sec) that were not yet counted.
Prevents race condition where user ends call before markSimulationUsed RPC completes.
Uses row-level locking (FOR UPDATE SKIP LOCKED) for safety.';

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION cleanup_orphaned_sessions_for_user(uuid) TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP FUNCTION FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'cleanup_orphaned_sessions_for_user() NOW:';
  RAISE NOTICE '  1. Uses FOR UPDATE SKIP LOCKED for row locking';
  RAISE NOTICE '  2. Checks if session duration >= 300 seconds';
  RAISE NOTICE '  3. If >= 300s AND not counted, marks as counted';
  RAISE NOTICE '  4. Increments user quota for newly counted sessions';
  RAISE NOTICE '  5. Returns counted_count in response';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the race condition where user ends call';
  RAISE NOTICE 'right after 5-minute mark before RPC completes.';
  RAISE NOTICE '========================================';
END $$;
