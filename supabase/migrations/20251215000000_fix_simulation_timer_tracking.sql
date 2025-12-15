-- ============================================
-- MIGRATION: Fix Simulation Timer Tracking
-- Date: 2025-12-15
-- Purpose: Track actual timer start time to prevent premature quota deduction
-- ============================================

-- PROBLEM: Session created at page load, but timer starts later when user begins voice call
-- This causes simulations to be counted based on page load time, not actual usage time
--
-- SOLUTION: Add timer_started_at field to track when timer actually begins
-- Use this for duration calculation instead of started_at

-- ============================================
-- PART 1: ADD TIMER START TRACKING COLUMN
-- ============================================

-- Add new column to track when timer actually starts
ALTER TABLE simulation_usage_logs
ADD COLUMN IF NOT EXISTS timer_started_at timestamp with time zone;

COMMENT ON COLUMN simulation_usage_logs.timer_started_at IS
'Timestamp when the simulation timer actually started (voice call began).
If NULL, falls back to started_at for backward compatibility.';

-- ============================================
-- PART 2: UPDATE END SESSION FUNCTION
-- ============================================

-- Update the end_simulation_session function to use timer_started_at
CREATE OR REPLACE FUNCTION end_simulation_session(
  p_session_token uuid,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_session simulation_usage_logs;
  v_duration_seconds integer;
  v_will_count boolean;
  v_start_time timestamp with time zone;
BEGIN
  -- Get the session
  SELECT * INTO v_session
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND ended_at IS NULL;

  -- Session not found or already ended
  IF v_session IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Simulation nicht gefunden oder bereits beendet'
    );
  END IF;

  -- CRITICAL FIX: Use timer_started_at if available, otherwise fallback to started_at
  -- This ensures we only count time from when the timer actually started
  v_start_time := COALESCE(v_session.timer_started_at, v_session.started_at);

  -- Calculate duration from the correct start time
  v_duration_seconds := EXTRACT(EPOCH FROM (NOW() - v_start_time))::integer;

  -- Additional safety: Cap duration at 30 minutes (20 min normal + 10 min grace)
  -- This prevents counting if user left page open for hours
  IF v_duration_seconds > 1800 THEN
    RAISE NOTICE 'Duration capped: Calculated % seconds, capping at 1800', v_duration_seconds;
    v_duration_seconds := 1800;
  END IF;

  -- Determine if simulation should count (>= 5 minutes threshold)
  v_will_count := v_duration_seconds >= 300;

  -- Update the session (this will trigger the automatic duration calculation and quota update)
  UPDATE simulation_usage_logs
  SET ended_at = NOW()
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  RAISE NOTICE 'Simulation ended: user=%, session=%, start_time=%, duration=%s, counted=%',
    p_user_id, p_session_token, v_start_time, v_duration_seconds, v_will_count;

  RETURN json_build_object(
    'success', true,
    'message', 'Simulation beendet',
    'session_token', p_session_token,
    'duration_seconds', v_duration_seconds,
    'counted_toward_usage', v_will_count,
    'used_timer_start', v_session.timer_started_at IS NOT NULL,
    'message_detail', CASE
      WHEN v_will_count THEN 'Simulation wurde gezählt (>= 5 Minuten)'
      ELSE format('Simulation zu kurz (%s Sekunden), nicht gezählt', v_duration_seconds)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION end_simulation_session TO authenticated;

COMMENT ON FUNCTION end_simulation_session IS
'Ends a simulation session using timer_started_at for duration calculation (if available).
Falls back to started_at for backward compatibility with old sessions.';

-- ============================================
-- PART 3: UPDATE GET ACTIVE SIMULATION FUNCTION
-- ============================================

-- Update get_active_simulation to show correct elapsed time
CREATE OR REPLACE FUNCTION get_active_simulation(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_active_session simulation_usage_logs;
  v_elapsed_seconds integer;
  v_time_remaining integer;
  v_start_time timestamp with time zone;
BEGIN
  -- Find any active simulation (started but not ended)
  SELECT * INTO v_active_session
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  -- No active simulation
  IF v_active_session IS NULL THEN
    RETURN json_build_object(
      'has_active_simulation', false,
      'message', 'Keine aktive Simulation'
    );
  END IF;

  -- CRITICAL FIX: Use timer_started_at if available
  v_start_time := COALESCE(v_active_session.timer_started_at, v_active_session.started_at);

  -- Calculate elapsed time from correct start point
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_start_time))::integer;

  -- Calculate time remaining (20 minutes = 1200 seconds)
  v_time_remaining := 1200 - v_elapsed_seconds;

  -- Return active simulation info
  RETURN json_build_object(
    'has_active_simulation', true,
    'session_token', v_active_session.session_token,
    'simulation_type', v_active_session.simulation_type,
    'started_at', v_active_session.started_at,
    'timer_started_at', v_active_session.timer_started_at,
    'elapsed_seconds', v_elapsed_seconds,
    'time_remaining_seconds', GREATEST(v_time_remaining, 0),
    'will_count_toward_usage', v_elapsed_seconds >= 300,
    'message', CASE
      WHEN v_elapsed_seconds >= 300 THEN 'Simulation wird gezählt'
      ELSE format('Noch %s Sekunden bis die Simulation gezählt wird', 300 - v_elapsed_seconds)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_simulation TO authenticated;

COMMENT ON FUNCTION get_active_simulation IS
'Returns information about user active simulation using timer_started_at for accurate elapsed time.';

-- ============================================
-- PART 4: CREATE HELPER FUNCTION TO SET TIMER START
-- ============================================

-- New RPC function to update timer_started_at when timer actually begins
CREATE OR REPLACE FUNCTION set_simulation_timer_start(
  p_session_token uuid,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_updated boolean;
BEGIN
  -- Update timer_started_at for the session
  UPDATE simulation_usage_logs
  SET timer_started_at = NOW()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND ended_at IS NULL
    AND timer_started_at IS NULL; -- Only set if not already set

  -- Check if update was successful
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated THEN
    RAISE NOTICE 'Timer start time set: user=%, session=%', p_user_id, p_session_token;

    RETURN json_build_object(
      'success', true,
      'message', 'Timer-Startzeit erfolgreich gesetzt',
      'session_token', p_session_token,
      'timer_started_at', NOW()
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Simulation nicht gefunden oder bereits gestartet'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_simulation_timer_start TO authenticated;

COMMENT ON FUNCTION set_simulation_timer_start IS
'Sets timer_started_at timestamp when the simulation timer actually begins (voice call starts).
Only updates if not already set to prevent overwriting.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check timer start tracking
-- SELECT
--   session_token,
--   started_at,
--   timer_started_at,
--   EXTRACT(EPOCH FROM (timer_started_at - started_at)) as delay_seconds,
--   ended_at,
--   duration_seconds,
--   counted_toward_usage
-- FROM simulation_usage_logs
-- WHERE timer_started_at IS NOT NULL
-- ORDER BY started_at DESC
-- LIMIT 10;

COMMIT;
