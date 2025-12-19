-- Migration: Fix get_active_simulation to use timer_started_at for accurate session recovery
-- Date: 2025-12-19
-- Purpose: Use timer_started_at instead of started_at for elapsed time calculation

-- Problem: get_active_simulation uses started_at but should use timer_started_at for accurate recovery
-- Solution: Update to use COALESCE(timer_started_at, started_at) for backwards compatibility

CREATE OR REPLACE FUNCTION get_active_simulation(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_active_session simulation_usage_logs;
  v_elapsed_seconds integer;
  v_time_remaining integer;
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

  -- Calculate elapsed time using timer_started_at (falls back to started_at if null)
  -- This ensures accurate session recovery when timer was paused/resumed
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_active_session.timer_started_at, v_active_session.started_at)))::integer;

  -- Calculate time remaining (20 minutes = 1200 seconds)
  v_time_remaining := 1200 - v_elapsed_seconds;

  -- Return active simulation info
  RETURN json_build_object(
    'has_active_simulation', true,
    'session_token', v_active_session.session_token,
    'simulation_type', v_active_session.simulation_type,
    'started_at', v_active_session.started_at,
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

COMMENT ON FUNCTION get_active_simulation IS
'Returns information about a user active simulation including elapsed time and whether it will count. UPDATED: Now uses timer_started_at for accurate session recovery (falls back to started_at if null).';

COMMIT;
