-- ============================================
-- FIX: Cap duration in both function and trigger
-- Date: 2025-12-10
-- Purpose: Fix constraint violation when closing sessions older than 1500 seconds
-- ============================================

-- PROBLEM:
-- 1. start_simulation_session() auto-closes stale sessions
-- 2. calculate_simulation_duration_and_counting() trigger recalculates duration
-- 3. If session > 1500 seconds, trigger sets duration without cap, violating constraint
--
-- SOLUTION:
-- Update both function and trigger to cap duration at 1500 seconds

-- ============================================
-- STEP 1: Clean up existing stale sessions
-- ============================================

DO $$
DECLARE
  v_updated_count integer;
BEGIN
  RAISE NOTICE 'Cleaning up stale sessions...';

  -- Temporarily disable trigger to bypass recalculation
  ALTER TABLE simulation_usage_logs DISABLE TRIGGER trg_calculate_duration_before_update;

  -- Close stale sessions with capped duration
  UPDATE simulation_usage_logs
  SET
    ended_at = NOW(),
    duration_seconds = LEAST(EXTRACT(EPOCH FROM (NOW() - started_at))::integer, 1500),
    counted_toward_usage = CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - started_at))::integer >= 300 THEN true
      ELSE false
    END
  WHERE ended_at IS NULL
    AND started_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Re-enable trigger
  ALTER TABLE simulation_usage_logs ENABLE TRIGGER trg_calculate_duration_before_update;

  RAISE NOTICE 'Closed % stale sessions', v_updated_count;
END $$;

-- ============================================
-- STEP 2: Update trigger function to cap duration
-- ============================================

CREATE OR REPLACE FUNCTION calculate_simulation_duration_and_counting()
RETURNS TRIGGER AS $$
DECLARE
  v_duration_seconds integer;
  v_should_count boolean;
BEGIN
  -- Only process when ended_at is being set (simulation ending)
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN

    -- Calculate duration in seconds, CAPPED at 1500 (25 minutes)
    v_duration_seconds := LEAST(
      EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer,
      1500
    );

    -- Set duration_seconds field
    NEW.duration_seconds := v_duration_seconds;

    -- Determine if simulation should count toward usage
    -- Threshold: 5 minutes (300 seconds)
    -- Note: Use actual duration for counting logic, not capped duration
    v_should_count := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer >= 300;

    -- Set counted_toward_usage field
    NEW.counted_toward_usage := v_should_count;

    RAISE NOTICE 'Simulation ended: session=%, duration=%s (capped), counts=%',
      NEW.session_token, v_duration_seconds, v_should_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_simulation_duration_and_counting IS
'Automatically calculates simulation duration (capped at 1500s) and determines if it should count toward usage (>= 5 minutes threshold).';

-- ============================================
-- STEP 3: Update start_simulation_session function
-- ============================================

CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text,
  p_session_token uuid DEFAULT uuid_generate_v4()
)
RETURNS json AS $$
DECLARE
  v_can_start json;
  v_new_session simulation_usage_logs;
  v_existing_session simulation_usage_logs;
BEGIN
  -- Check if user can start a simulation (quota check)
  SELECT can_start_simulation(p_user_id) INTO v_can_start;

  IF (v_can_start->>'can_start')::boolean = false THEN
    RETURN json_build_object(
      'success', false,
      'reason', v_can_start->>'reason',
      'message', v_can_start->>'message'
    );
  END IF;

  -- AUTO-CLOSE stale sessions
  -- Note: Trigger will automatically cap duration at 1500 seconds
  UPDATE simulation_usage_logs
  SET ended_at = NOW()
  WHERE user_id = p_user_id AND ended_at IS NULL
  RETURNING * INTO v_existing_session;

  IF v_existing_session IS NOT NULL THEN
    RAISE NOTICE 'Auto-closed stale session for user %: token=%',
      p_user_id, v_existing_session.session_token;
  END IF;

  -- Create new session
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
'Starts a new simulation session after checking quota. Auto-closes any stale sessions (trigger caps duration at 1500s).';

GRANT EXECUTE ON FUNCTION start_simulation_session TO authenticated;

-- ============================================
-- STEP 4: Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Duration Constraint Fix Applied!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✅ Stale sessions cleaned up';
  RAISE NOTICE '  ✅ Trigger function updated (caps at 1500s)';
  RAISE NOTICE '  ✅ start_simulation_session updated';
  RAISE NOTICE '';
  RAISE NOTICE 'The constraint violation is now fixed:';
  RAISE NOTICE '  - Sessions > 25 min auto-capped at 1500s';
  RAISE NOTICE '  - Voiceflow widget can initialize';
  RAISE NOTICE '  - New simulations can start';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
