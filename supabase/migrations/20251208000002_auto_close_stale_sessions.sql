-- Migration: Auto-close stale sessions before starting new ones
-- Date: 2025-12-08
-- Purpose: Fix "duplicate key violates unique constraint" error
--
-- Problem: Users can't start new simulations if they have unclosed sessions
-- Solution: Auto-close any existing active sessions before starting a new one

-- Update start_simulation_session to auto-close stale sessions
CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text, -- 'kp' or 'fsp'
  p_session_token uuid DEFAULT uuid_generate_v4()
)
RETURNS json AS $$
DECLARE
  v_can_start json;
  v_new_session simulation_usage_logs;
  v_existing_session simulation_usage_logs;
  v_closed_count integer;
BEGIN
  -- STEP 1: Check if user can start a simulation (quota check)
  SELECT can_start_simulation(p_user_id) INTO v_can_start;

  -- If cannot start, return error
  IF (v_can_start->>'can_start')::boolean = false THEN
    RETURN json_build_object(
      'success', false,
      'reason', v_can_start->>'reason',
      'message', v_can_start->>'message'
    );
  END IF;

  -- STEP 2: AUTO-CLOSE any existing active sessions for this user
  -- This prevents the unique constraint violation
  -- We close sessions that were started but never ended (likely due to browser crash, etc.)
  UPDATE simulation_usage_logs
  SET
    ended_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::integer,
    counted_toward_usage = CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - started_at))::integer >= 300 THEN true
      ELSE false
    END
  WHERE user_id = p_user_id
    AND ended_at IS NULL -- Only close active sessions
  RETURNING * INTO v_existing_session;

  -- Log if we closed a stale session
  IF v_existing_session IS NOT NULL THEN
    GET DIAGNOSTICS v_closed_count = ROW_COUNT;
    RAISE NOTICE 'Auto-closed % stale session(s) for user % before starting new session',
      v_closed_count, p_user_id;
  END IF;

  -- STEP 3: Create new simulation session
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
    NULL, -- Not ended yet
    0, -- Duration will be calculated when ended
    false -- Will be determined when ended
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
    'quota_info', v_can_start,
    'stale_session_closed', v_existing_session IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_simulation_session TO authenticated;

COMMENT ON FUNCTION start_simulation_session IS
'Starts a new simulation session after checking quota. Auto-closes any stale active sessions to prevent constraint violations. Returns session info.';

COMMIT;
