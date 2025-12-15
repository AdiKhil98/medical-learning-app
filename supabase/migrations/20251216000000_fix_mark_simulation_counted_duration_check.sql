-- ============================================
-- CRITICAL FIX: mark_simulation_counted duration validation
-- Date: 2025-12-16
-- Bug: Duration check happens AFTER UPDATE, causing short simulations to be counted
-- ============================================

-- ROOT CAUSE:
-- The current function:
-- 1. UPDATEs counted_toward_usage = true (line 20-33)
-- 2. THEN checks if duration >= 295 seconds (line 63)
-- 3. If duration < 295, returns error BUT counted_toward_usage is already true!
-- 4. Later when simulation ends, trigger sees counted_toward_usage=true and counts it
--
-- RESULT: 3-second simulations get counted!
--
-- FIX: Check duration FIRST, then UPDATE only if valid

CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_started_at timestamptz;
  v_elapsed_seconds integer;
  v_already_counted boolean;
  v_subscription_tier text;
BEGIN
  -- STEP 1: Get session info and check if already counted
  -- Do NOT update anything yet
  SELECT
    started_at,
    EXTRACT(EPOCH FROM (now() - started_at))::integer,
    counted_toward_usage
  INTO
    v_started_at,
    v_elapsed_seconds,
    v_already_counted
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  -- Session not found
  IF v_started_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Already counted (idempotent - not an error)
  IF v_already_counted = true THEN
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted (prevented double-count)'
    );
  END IF;

  -- STEP 2: VALIDATE DURATION BEFORE ANY UPDATES
  -- This is the CRITICAL FIX - check duration FIRST
  IF v_elapsed_seconds < 295 THEN
    -- Simulation too short - DO NOT mark as counted
    RAISE NOTICE 'Simulation too short: %s < 295 seconds (session: %)',
      v_elapsed_seconds, p_session_token;

    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 295,
      'note', '5-second buffer for network latency'
    );
  END IF;

  -- STEP 3: Now that we know duration is valid, UPDATE
  -- ATOMIC TEST-AND-SET: Only update if not already counted
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = v_elapsed_seconds,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND counted_toward_usage = false;  -- Prevents race conditions

  -- Check if UPDATE succeeded
  IF NOT FOUND THEN
    -- Another request already counted it (race condition)
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted (race prevented)'
    );
  END IF;

  -- STEP 4: Get subscription tier and increment counter
  SELECT subscription_tier INTO v_subscription_tier
  FROM users
  WHERE id = p_user_id;

  -- Increment appropriate counter
  UPDATE users
  SET
    simulations_used_this_month = CASE
      WHEN v_subscription_tier IS NOT NULL AND v_subscription_tier != ''
      THEN simulations_used_this_month + 1
      ELSE simulations_used_this_month
    END,
    free_simulations_used = CASE
      WHEN v_subscription_tier IS NULL OR v_subscription_tier = ''
      THEN free_simulations_used + 1
      ELSE free_simulations_used
    END
  WHERE id = p_user_id;

  RAISE NOTICE 'Simulation counted: session=%, duration=%s', p_session_token, v_elapsed_seconds;

  RETURN json_build_object(
    'success', true,
    'counted', true,
    'elapsed_seconds', v_elapsed_seconds,
    'message', 'Simulation marked as counted'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_simulation_counted IS
'FIXED: Validates duration BEFORE updating counted_toward_usage.
Atomically marks simulation as counted and increments counter.
Requires >= 295 seconds (5 min with network buffer).
Prevents double-counting and prevents short simulations from being counted.';

-- ============================================
-- Verification: Check for any incorrectly counted short simulations
-- ============================================

DO $$
DECLARE
  v_short_counted_count integer;
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking for incorrectly counted short simulations...';
  RAISE NOTICE '========================================';

  -- Find simulations that were counted but are < 295 seconds
  SELECT COUNT(*) INTO v_short_counted_count
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true
    AND duration_seconds IS NOT NULL
    AND duration_seconds < 295
    AND ended_at IS NOT NULL;

  IF v_short_counted_count > 0 THEN
    RAISE WARNING 'Found % short simulations that were incorrectly counted!', v_short_counted_count;

    -- Show examples
    FOR r IN (
      SELECT user_id, session_token, simulation_type,
             duration_seconds, started_at, ended_at
      FROM simulation_usage_logs
      WHERE counted_toward_usage = true
        AND duration_seconds IS NOT NULL
        AND duration_seconds < 295
        AND ended_at IS NOT NULL
      ORDER BY started_at DESC
      LIMIT 10
    ) LOOP
      RAISE NOTICE '  Short counted: user=%, type=%, duration=%s, date=%',
        r.user_id, r.simulation_type, r.duration_seconds, r.started_at;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'These simulations were incorrectly counted due to the bug.';
    RAISE NOTICE 'Consider running a cleanup script to:';
    RAISE NOTICE '  1. Set counted_toward_usage = false for these sessions';
    RAISE NOTICE '  2. Decrement user quota counts accordingly';
  ELSE
    RAISE NOTICE 'No incorrectly counted short simulations found.';
  END IF;

  RAISE NOTICE '========================================';
END $$;
