-- ============================================
-- HOTFIX 2: Auto-end old active sessions before starting new one
-- Date: 2025-12-17
-- ============================================
--
-- PROBLEM: User has old active session that was never ended
-- Constraint "idx_one_active_session_per_user" prevents creating new session
--
-- SOLUTION: Automatically end any old active sessions before creating new one

CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text,
  p_session_token uuid DEFAULT uuid_generate_v4()
)
RETURNS json AS $$
DECLARE
  v_can_start json;
  v_new_session simulation_usage_logs;
  v_old_sessions_ended integer;
BEGIN
  -- STEP 0: Auto-end any old active sessions for this user
  -- This prevents the unique constraint violation
  UPDATE simulation_usage_logs
  SET ended_at = NOW()
  WHERE user_id = p_user_id
    AND ended_at IS NULL
    AND session_token != p_session_token;  -- Don't end the one we're about to create

  GET DIAGNOSTICS v_old_sessions_ended = ROW_COUNT;

  IF v_old_sessions_ended > 0 THEN
    RAISE NOTICE 'Auto-ended % old active session(s) for user %', v_old_sessions_ended, p_user_id;
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
    NULL,
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
    'old_sessions_ended', v_old_sessions_ended,
    'quota_info', v_can_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_simulation_session TO authenticated;

COMMENT ON FUNCTION start_simulation_session IS
'Starts a new simulation session. Automatically ends any old active sessions for the user to prevent constraint violations.';

-- Also clean up any existing orphaned sessions right now
DO $$
DECLARE
  v_cleaned integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANING UP ORPHANED SESSIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- End any sessions that have been active for more than 2 hours (definitely orphaned)
  UPDATE simulation_usage_logs
  SET ended_at = NOW()
  WHERE ended_at IS NULL
    AND started_at < NOW() - INTERVAL '2 hours';

  GET DIAGNOSTICS v_cleaned = ROW_COUNT;

  IF v_cleaned > 0 THEN
    RAISE NOTICE '✅ Cleaned up % orphaned session(s)', v_cleaned;
  ELSE
    RAISE NOTICE '✅ No orphaned sessions found';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'HOTFIX 2 APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ start_simulation_session now auto-ends old sessions';
  RAISE NOTICE '✅ Cleaned up any orphaned sessions';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now start simulations without constraint errors.';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
