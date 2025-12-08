-- Migration: Fix get_active_simulation duration calculation
-- Date: 2025-12-08
-- Purpose: Update hardcoded 900 seconds to 1200 seconds (20 minutes)

-- Problem: get_active_simulation uses 900 seconds (15 min) but simulation is 20 min
-- Solution: Update to 1200 seconds to match actual simulation duration

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

  -- Calculate elapsed time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_active_session.started_at))::integer;

  -- Calculate time remaining (20 minutes = 1200 seconds) ← FIXED!
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
'Returns information about a user active simulation including elapsed time and whether it will count. UPDATED: Now uses correct 20-minute (1200s) duration.';

COMMIT;
