-- ============================================
-- CRITICAL FIX: Cleanup should NOT increment quota
-- Date: 2026-01-03
-- ============================================
--
-- PROBLEM:
-- The cleanup_orphaned_sessions_for_user function was incrementing quota
-- when cleaning up orphaned sessions. This races with mark_simulation_counted,
-- causing DOUBLE COUNTING of simulations.
--
-- Evidence: "CLEANUP: Closed 1 orphaned session(s), counted 1" appearing
-- in logs when counter was auto-incrementing.
--
-- FIX:
-- - Cleanup should ONLY close sessions, NOT increment quota
-- - Only mark_simulation_counted RPC should increment quota
-- - This ensures single source of truth for quota increments
--
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_sessions_for_user(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_session RECORD;
  v_closed_count integer := 0;
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
    -- CRITICAL: Just close the session WITHOUT incrementing quota
    -- The mark_simulation_counted RPC is the ONLY place that increments quota
    -- ============================================
    UPDATE simulation_usage_logs
    SET
      ended_at = NOW(),
      duration_seconds = v_duration
      -- NOTE: Do NOT touch counted_toward_usage here
      -- Let mark_simulation_counted handle that
    WHERE session_token = v_session.session_token;

    v_closed_count := v_closed_count + 1;

    RAISE NOTICE 'Closed orphaned session: % (duration: %s, was_counted: %)',
      substring(v_session.session_token::text, 1, 16),
      v_duration,
      v_session.counted_toward_usage;
  END LOOP;

  -- If no sessions were closed
  IF v_closed_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'closed_count', 0,
      'message', 'No orphaned sessions found'
    );
  END IF;

  -- Return success with count
  RETURN json_build_object(
    'success', true,
    'closed_count', v_closed_count,
    'message', format('Closed %s orphaned session(s)', v_closed_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in cleanup_orphaned_sessions_for_user: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_sessions_for_user IS
'FIXED: Cleans up orphaned sessions (ended_at IS NULL) for a specific user.
NO LONGER increments quota - that is handled ONLY by mark_simulation_counted RPC.
This prevents double-counting race conditions.';

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION cleanup_orphaned_sessions_for_user(uuid) TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRITICAL FIX: CLEANUP NO LONGER COUNTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'cleanup_orphaned_sessions_for_user() NOW:';
  RAISE NOTICE '  1. ONLY closes sessions (sets ended_at)';
  RAISE NOTICE '  2. Does NOT increment quota';
  RAISE NOTICE '  3. Does NOT mark counted_toward_usage';
  RAISE NOTICE '';
  RAISE NOTICE 'QUOTA INCREMENTS ONLY HAPPEN IN:';
  RAISE NOTICE '  - mark_simulation_counted() RPC';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the double-counting bug.';
  RAISE NOTICE '========================================';
END $$;
