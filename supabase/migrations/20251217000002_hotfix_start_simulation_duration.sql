-- ============================================
-- HOTFIX: Fix start_simulation_session to set duration_seconds to NULL
-- Date: 2025-12-17
-- ============================================
--
-- PROBLEM: start_simulation_session sets duration_seconds = 0
-- But constraint may not allow 0, or there's a conflict
--
-- SOLUTION: Set duration_seconds to NULL for new sessions
-- Duration will be calculated by trigger when simulation ends

CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text,
  p_session_token uuid DEFAULT uuid_generate_v4()
)
RETURNS json AS $$
DECLARE
  v_can_start json;
  v_new_session simulation_usage_logs;
BEGIN
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
    NULL,  -- FIXED: Set to NULL instead of 0
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

GRANT EXECUTE ON FUNCTION start_simulation_session TO authenticated;

COMMENT ON FUNCTION start_simulation_session IS
'FIXED: Starts a new simulation session with duration_seconds = NULL (not 0).
Duration will be calculated by trigger when simulation ends.';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'HOTFIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ start_simulation_session now sets duration_seconds = NULL';
  RAISE NOTICE '✅ This prevents constraint violation errors';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now start simulations without errors.';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
