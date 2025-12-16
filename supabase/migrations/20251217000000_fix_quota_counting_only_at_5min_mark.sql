-- ============================================
-- CRITICAL FIX: Quota should ONLY be counted at 5-minute mark, NOT at end time
-- Date: 2025-12-17
-- ============================================
--
-- ROOT CAUSE:
-- There are TWO places that count quota:
-- 1. mark_simulation_counted() at 5-minute mark (CORRECT)
-- 2. trigger_update_quota_on_simulation_end() when simulation ends (WRONG!)
--
-- This causes problems:
-- - Double counting if both trigger
-- - Wrong duration calculation (uses started_at instead of timer_started_at)
-- - Sessions created long before timer starts get counted even if short
--
-- SOLUTION:
-- - Disable the end-time quota counting trigger
-- - Keep only the 5-minute mark counting via mark_simulation_counted()
-- - End-time trigger should ONLY record duration for analytics, not count quota

-- ============================================
-- STEP 1: Disable the quota counting trigger at end time
-- ============================================

-- Drop the trigger that counts quota when simulation ends
DROP TRIGGER IF EXISTS trg_update_quota_on_simulation_end ON simulation_usage_logs;

RAISE NOTICE 'Dropped trigger: trg_update_quota_on_simulation_end';
RAISE NOTICE 'Quota will now ONLY be counted at 5-minute mark via mark_simulation_counted()';

-- ============================================
-- STEP 2: Update calculate_simulation_duration_and_counting to use timer_started_at
-- ============================================

-- This trigger still needs to exist for calculating duration
-- But it should NOT count quota - just record duration for analytics
CREATE OR REPLACE FUNCTION calculate_simulation_duration_and_counting()
RETURNS TRIGGER AS $$
DECLARE
  v_duration_seconds integer;
  v_start_time timestamptz;
BEGIN
  -- Only process when ended_at is being set (simulation ending)
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN

    -- CRITICAL FIX: Use timer_started_at if available, fallback to started_at
    -- This ensures we calculate duration from when timer ACTUALLY started
    v_start_time := COALESCE(NEW.timer_started_at, NEW.started_at);

    -- Calculate duration in seconds from correct start time
    v_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - v_start_time))::integer;

    -- Additional safety: Cap duration at 30 minutes (20 min normal + 10 min grace)
    IF v_duration_seconds > 1800 THEN
      RAISE NOTICE 'Duration capped: Calculated % seconds, capping at 1800', v_duration_seconds;
      v_duration_seconds := 1800;
    END IF;

    -- Set duration_seconds field for analytics
    NEW.duration_seconds := v_duration_seconds;

    -- IMPORTANT: We do NOT set counted_toward_usage here!
    -- That should ONLY be set by mark_simulation_counted() at the 5-minute mark
    -- We keep the existing value (don't change it)

    -- Log for debugging
    RAISE NOTICE 'Simulation ended: session=%, start_time=%, duration=%s, already_counted=%',
      NEW.session_token, v_start_time, v_duration_seconds, NEW.counted_toward_usage;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_simulation_duration_and_counting IS
'FIXED: Calculates simulation duration using timer_started_at (if available) for analytics.
Does NOT modify counted_toward_usage - that is ONLY set by mark_simulation_counted() at 5-min mark.';

-- Recreate the trigger (BEFORE UPDATE)
DROP TRIGGER IF EXISTS trg_calculate_duration_before_update ON simulation_usage_logs;
CREATE TRIGGER trg_calculate_duration_before_update
  BEFORE UPDATE ON simulation_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_simulation_duration_and_counting();

-- ============================================
-- STEP 3: Update end_simulation_session to not count quota
-- ============================================

CREATE OR REPLACE FUNCTION end_simulation_session(
  p_session_token uuid,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_session simulation_usage_logs;
  v_duration_seconds integer;
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

  -- Calculate duration using timer_started_at if available
  v_start_time := COALESCE(v_session.timer_started_at, v_session.started_at);
  v_duration_seconds := EXTRACT(EPOCH FROM (NOW() - v_start_time))::integer;

  -- Cap at 30 minutes
  IF v_duration_seconds > 1800 THEN
    v_duration_seconds := 1800;
  END IF;

  -- Update the session (this will trigger duration calculation)
  UPDATE simulation_usage_logs
  SET ended_at = NOW()
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  RAISE NOTICE 'Simulation ended: user=%, session=%, duration=%s, was_counted=%',
    p_user_id, p_session_token, v_duration_seconds, v_session.counted_toward_usage;

  -- Return info about whether it was counted
  -- NOTE: counted_toward_usage reflects whether mark_simulation_counted() was called at 5-min mark
  RETURN json_build_object(
    'success', true,
    'message', 'Simulation beendet',
    'session_token', p_session_token,
    'duration_seconds', v_duration_seconds,
    'counted_toward_usage', v_session.counted_toward_usage,
    'used_timer_start', v_session.timer_started_at IS NOT NULL,
    'message_detail', CASE
      WHEN v_session.counted_toward_usage THEN
        'Simulation was already counted at 5-minute mark'
      WHEN v_duration_seconds >= 300 THEN
        'Simulation was long enough but not counted (timer ended before 5-min mark)'
      ELSE
        format('Simulation too short (%s seconds), not counted', v_duration_seconds)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION end_simulation_session TO authenticated;

COMMENT ON FUNCTION end_simulation_session IS
'Ends a simulation session and records duration. Does NOT count quota.
Quota is ONLY counted at 5-minute mark via mark_simulation_counted().';

-- ============================================
-- STEP 4: Ensure timer_started_at function exists
-- ============================================

-- Verify the set_simulation_timer_start function exists (it should from 20251215000000)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_simulation_timer_start'
  ) THEN
    RAISE EXCEPTION 'set_simulation_timer_start function not found! Run migration 20251215000000 first.';
  END IF;
END $$;

-- ============================================
-- STEP 5: Verification and Cleanup
-- ============================================

DO $$
DECLARE
  v_trigger_exists boolean;
  v_double_counted integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'QUOTA COUNTING FIX VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check that the quota counting trigger is disabled
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_update_quota_on_simulation_end'
  ) INTO v_trigger_exists;

  IF v_trigger_exists THEN
    RAISE WARNING '❌ Trigger trg_update_quota_on_simulation_end still exists!';
  ELSE
    RAISE NOTICE '✅ Trigger trg_update_quota_on_simulation_end successfully disabled';
  END IF;

  -- Check for sessions that might have been double-counted
  SELECT COUNT(*) INTO v_double_counted
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true
    AND duration_seconds IS NOT NULL
    AND duration_seconds < 295
    AND ended_at IS NOT NULL
    AND created_at >= NOW() - INTERVAL '7 days';  -- Last 7 days

  IF v_double_counted > 0 THEN
    RAISE WARNING '⚠️ Found % short simulations that were incorrectly counted in last 7 days', v_double_counted;
    RAISE NOTICE 'These were likely counted due to the bug (using started_at instead of timer_started_at)';
  ELSE
    RAISE NOTICE '✅ No short simulations were incorrectly counted in last 7 days';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'QUOTA COUNTING LOGIC (FIXED):';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. User loads page → start_simulation_session()';
  RAISE NOTICE '   - Creates row with started_at (session creation time)';
  RAISE NOTICE '   - counted_toward_usage = false';
  RAISE NOTICE '';
  RAISE NOTICE '2. User starts timer → set_simulation_timer_start()';
  RAISE NOTICE '   - Sets timer_started_at (actual usage time)';
  RAISE NOTICE '';
  RAISE NOTICE '3. 5-minute mark → mark_simulation_counted()';
  RAISE NOTICE '   - Validates duration >= 295 seconds';
  RAISE NOTICE '   - Sets counted_toward_usage = true';
  RAISE NOTICE '   - Increments users.simulations_used_this_month';
  RAISE NOTICE '   - Trigger syncs to user_simulation_quota';
  RAISE NOTICE '';
  RAISE NOTICE '4. User ends → end_simulation_session()';
  RAISE NOTICE '   - Sets ended_at';
  RAISE NOTICE '   - Calculates duration using timer_started_at';
  RAISE NOTICE '   - Does NOT change quota (already counted at step 3)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'KEY POINT: Quota is ONLY counted once at 5-min mark!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMIT;
