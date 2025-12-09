-- Prevent race condition: Block new simulation if one just ended
-- Date: 2025-12-09
-- Purpose: Fix race condition where simulation starts at same moment previous one ends

CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text,
  p_session_token uuid DEFAULT uuid_generate_v4()
)
RETURNS json AS $$
DECLARE
  v_can_start json;
  v_new_session simulation_usage_logs;
  v_recent_end timestamptz;
BEGIN
  -- RACE CONDITION FIX: Check if a simulation just ended (within last 2 seconds)
  -- This prevents starting new simulation in same transaction as previous one ending
  SELECT MAX(ended_at) INTO v_recent_end
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND ended_at IS NOT NULL
    AND ended_at >= NOW() - INTERVAL '2 seconds';

  IF v_recent_end IS NOT NULL THEN
    RAISE NOTICE 'Simulation ended %.2f seconds ago, enforcing cooldown',
      EXTRACT(EPOCH FROM (NOW() - v_recent_end));

    RETURN json_build_object(
      'success', false,
      'reason', 'cooldown',
      'message', 'Bitte warten Sie einen Moment nach Beendigung der vorherigen Simulation.'
    );
  END IF;

  -- CONCURRENCY FIX: Check for active sessions (not ended)
  IF EXISTS (
    SELECT 1 FROM simulation_usage_logs
    WHERE user_id = p_user_id
      AND ended_at IS NULL
      AND started_at >= NOW() - INTERVAL '2 hours'  -- Grace period for stale sessions
  ) THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'concurrent_session',
      'message', 'Sie haben bereits eine aktive Simulation.'
    );
  END IF;

  -- Check if user can start a simulation (quota check)
  SELECT can_start_simulation(p_user_id) INTO v_can_start;

  -- If cannot start, return error
  IF (v_can_start->>'can_start')::boolean = false THEN
    RETURN json_build_object(
      'success', false,
      'reason', v_can_start->>'reason',
      'message', v_can_start->>'message'
    );
  END IF;

  -- Create new simulation session
  INSERT INTO simulation_usage_logs (
    session_token,
    user_id,
    simulation_type,
    started_at,
    ended_at,
    duration_seconds,
    counted_toward_usage
  ) VALUES (
    p_session_token,
    p_user_id,
    p_simulation_type,
    NOW(),
    NULL,
    0,
    false
  )
  RETURNING * INTO v_new_session;

  RAISE NOTICE 'New simulation started: user=%, type=%, session=%',
    p_user_id, p_simulation_type, p_session_token;

  RETURN json_build_object(
    'success', true,
    'message', 'Simulation gestartet',
    'session_token', v_new_session.session_token,
    'simulation_type', v_new_session.simulation_type,
    'started_at', v_new_session.started_at,
    'quota_info', v_can_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION start_simulation_session IS
'Starts a new simulation session after checking quota and preventing race conditions. Enforces 2-second cooldown after previous simulation ends.';

GRANT EXECUTE ON FUNCTION start_simulation_session TO authenticated;
