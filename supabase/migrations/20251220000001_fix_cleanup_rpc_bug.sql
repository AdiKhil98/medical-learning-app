-- Migration: Fix cleanup_orphaned_sessions_for_user RPC function bug
-- Date: 2025-12-20
-- Purpose: Fix array_agg/unnest bug causing "invalid input syntax for type uuid" errors

-- ============================================
-- FIXED CLEANUP ORPHANED SESSIONS RPC FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_sessions_for_user(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_session RECORD;
  v_closed_count integer := 0;
  v_duration integer;
  v_start_time timestamptz;
BEGIN
  -- Loop directly over orphaned sessions (no array_agg needed)
  FOR v_session IN
    SELECT *
    FROM simulation_usage_logs
    WHERE user_id = p_user_id
      AND ended_at IS NULL
  LOOP
    -- Use timer_started_at if available, otherwise started_at
    v_start_time := COALESCE(v_session.timer_started_at, v_session.started_at);

    -- Calculate duration from start to now
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_start_time))::integer;

    -- Cap duration at 1800 seconds (30 minutes)
    v_duration := LEAST(v_duration, 1800);

    -- Update the session
    -- NOTE: This will trigger trg_calculate_duration_before_update which will recalculate duration
    -- The trigger uses COALESCE(timer_started_at, started_at) same as we do, so it's consistent
    UPDATE simulation_usage_logs
    SET
      ended_at = NOW()
      -- Don't manually set duration_seconds - let the trigger handle it
      -- Don't set status - not needed for counting logic
    WHERE session_token = v_session.session_token;

    v_closed_count := v_closed_count + 1;

    RAISE NOTICE 'Closed orphaned session: % (calculated duration: %s)',
      substring(v_session.session_token::text, 1, 16), v_duration;
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_sessions_for_user IS
'Cleans up orphaned sessions (ended_at IS NULL) for a specific user.
Properly handles duration calculation via trigger execution.
Called before starting a new simulation to prevent unique constraint violations.
FIXED: Removed array_agg/unnest pattern that caused UUID parsing errors.';

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION cleanup_orphaned_sessions_for_user(uuid) TO authenticated;

COMMIT;
