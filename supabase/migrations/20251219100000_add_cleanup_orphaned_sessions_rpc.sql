-- Migration: Add RPC function for cleaning up orphaned sessions
-- Date: 2025-12-19
-- Purpose: Replace direct UPDATE with proper RPC function to avoid trigger conflicts

-- ============================================
-- CLEANUP ORPHANED SESSIONS RPC FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_sessions_for_user(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_orphaned_sessions simulation_usage_logs[];
  v_session simulation_usage_logs;
  v_closed_count integer := 0;
  v_duration integer;
  v_start_time timestamptz;
BEGIN
  -- Find all orphaned sessions for this user
  SELECT array_agg(s.*) INTO v_orphaned_sessions
  FROM simulation_usage_logs s
  WHERE s.user_id = p_user_id
    AND s.ended_at IS NULL;

  -- If no orphaned sessions, return early
  IF v_orphaned_sessions IS NULL OR array_length(v_orphaned_sessions, 1) = 0 THEN
    RETURN json_build_object(
      'success', true,
      'closed_count', 0,
      'message', 'No orphaned sessions found'
    );
  END IF;

  -- Close each orphaned session
  FOR v_session IN SELECT unnest(v_orphaned_sessions)
  LOOP
    -- Use timer_started_at if available, otherwise started_at
    v_start_time := COALESCE(v_session.timer_started_at, v_session.started_at);

    -- Calculate duration from start to now
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_start_time))::integer;

    -- Cap duration at 1800 seconds (30 minutes)
    v_duration := LEAST(v_duration, 1800);

    -- Update the session (this will trigger the duration calculation trigger)
    UPDATE simulation_usage_logs
    SET
      ended_at = NOW(),
      duration_seconds = v_duration,
      status = CASE
        WHEN v_duration < 300 THEN 'incomplete'::text
        ELSE 'aborted'::text
      END
    WHERE session_token = v_session.session_token;

    v_closed_count := v_closed_count + 1;

    RAISE NOTICE 'Closed orphaned session: % (duration: %s)',
      substring(v_session.session_token::text, 1, 16), v_duration;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'closed_count', v_closed_count,
    'message', format('Closed %s orphaned session(s)', v_closed_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_sessions_for_user IS
'Cleans up orphaned sessions (ended_at IS NULL) for a specific user.
Properly handles duration calculation and trigger execution.
Called before starting a new simulation to prevent unique constraint violations.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_orphaned_sessions_for_user(uuid) TO authenticated;

COMMIT;
