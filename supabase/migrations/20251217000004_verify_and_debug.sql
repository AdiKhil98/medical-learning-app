-- ============================================
-- VERIFICATION & DEBUG SCRIPT
-- Date: 2025-12-17
-- ============================================
--
-- Run this script to verify all migrations were applied correctly
-- and identify what's causing the immediate quota counting

DO $$
DECLARE
  v_trigger_exists boolean;
  v_function_version text;
  v_active_sessions integer;
  v_recent_sessions RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE STATE VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 1: Verify quota counting trigger is disabled
  -- ============================================
  RAISE NOTICE '1. Checking quota counting trigger...';
  RAISE NOTICE '----------------------------------------';

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_update_quota_on_simulation_end'
      AND tgrelid = 'simulation_usage_logs'::regclass
  ) INTO v_trigger_exists;

  IF v_trigger_exists THEN
    RAISE WARNING '❌ CRITICAL: trg_update_quota_on_simulation_end STILL EXISTS!';
    RAISE WARNING '   This trigger is causing immediate quota counting!';
    RAISE WARNING '   Migration 1 did not fully apply!';
  ELSE
    RAISE NOTICE '✅ trg_update_quota_on_simulation_end successfully disabled';
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- CHECK 2: Show all active triggers on simulation_usage_logs
  -- ============================================
  RAISE NOTICE '2. Active triggers on simulation_usage_logs:';
  RAISE NOTICE '----------------------------------------';

  FOR v_recent_sessions IN (
    SELECT
      t.tgname as trigger_name,
      t.tgenabled as enabled,
      p.proname as function_name,
      CASE t.tgtype::int & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
      END as timing,
      CASE t.tgtype::int & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 20 THEN 'INSERT OR UPDATE'
        WHEN 24 THEN 'DELETE OR UPDATE'
        WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
      END as event
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'simulation_usage_logs'::regclass
      AND NOT t.tgisinternal
    ORDER BY t.tgname
  ) LOOP
    RAISE NOTICE '  Trigger: %', v_recent_sessions.trigger_name;
    RAISE NOTICE '    Function: %', v_recent_sessions.function_name;
    RAISE NOTICE '    Timing: % %', v_recent_sessions.timing, v_recent_sessions.event;
    RAISE NOTICE '    Enabled: %', v_recent_sessions.enabled;
    RAISE NOTICE '';
  END LOOP;

  -- ============================================
  -- CHECK 3: Verify start_simulation_session function
  -- ============================================
  RAISE NOTICE '3. Checking start_simulation_session function...';
  RAISE NOTICE '----------------------------------------';

  SELECT pg_get_functiondef('start_simulation_session'::regproc) INTO v_function_version;

  IF v_function_version LIKE '%duration_seconds, 0%' THEN
    RAISE WARNING '❌ CRITICAL: start_simulation_session still sets duration_seconds = 0!';
    RAISE WARNING '   Hotfix 1 was not applied correctly!';
  ELSIF v_function_version LIKE '%duration_seconds, NULL%' OR v_function_version LIKE '%NULL,%' THEN
    RAISE NOTICE '✅ start_simulation_session correctly sets duration_seconds = NULL';
  ELSE
    RAISE WARNING '⚠️ Could not verify duration_seconds value in start_simulation_session';
  END IF;

  IF v_function_version LIKE '%Auto-end any old active sessions%' OR v_function_version LIKE '%v_old_sessions_ended%' THEN
    RAISE NOTICE '✅ start_simulation_session includes auto-end logic for old sessions';
  ELSE
    RAISE WARNING '❌ CRITICAL: start_simulation_session missing auto-end logic!';
    RAISE WARNING '   Hotfix 2 was not applied correctly!';
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- CHECK 4: Look for orphaned active sessions
  -- ============================================
  RAISE NOTICE '4. Checking for orphaned active sessions...';
  RAISE NOTICE '----------------------------------------';

  SELECT COUNT(*) INTO v_active_sessions
  FROM simulation_usage_logs
  WHERE ended_at IS NULL;

  IF v_active_sessions > 0 THEN
    RAISE WARNING '⚠️ Found % active session(s) that may be orphaned', v_active_sessions;

    FOR v_recent_sessions IN (
      SELECT
        session_token,
        user_id,
        simulation_type,
        started_at,
        timer_started_at,
        NOW() - started_at as age
      FROM simulation_usage_logs
      WHERE ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Session: %', v_recent_sessions.session_token;
      RAISE NOTICE '    User: %', v_recent_sessions.user_id;
      RAISE NOTICE '    Type: %', v_recent_sessions.simulation_type;
      RAISE NOTICE '    Started: %', v_recent_sessions.started_at;
      RAISE NOTICE '    Timer started: %', COALESCE(v_recent_sessions.timer_started_at::text, 'NULL');
      RAISE NOTICE '    Age: %', v_recent_sessions.age;
      RAISE NOTICE '';
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No active sessions found (all sessions properly closed)';
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- CHECK 5: Analyze recent simulation counting
  -- ============================================
  RAISE NOTICE '5. Recent simulation counting behavior:';
  RAISE NOTICE '----------------------------------------';

  FOR v_recent_sessions IN (
    SELECT
      session_token,
      user_id,
      simulation_type,
      started_at,
      timer_started_at,
      ended_at,
      duration_seconds,
      counted_toward_usage,
      CASE
        WHEN timer_started_at IS NOT NULL AND ended_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ended_at - timer_started_at))::integer
        WHEN ended_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer
        ELSE NULL
      END as actual_duration_calc
    FROM simulation_usage_logs
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 10
  ) LOOP
    RAISE NOTICE '  Session: % (Type: %)',
      substring(v_recent_sessions.session_token::text, 1, 8),
      v_recent_sessions.simulation_type;
    RAISE NOTICE '    Started: %', v_recent_sessions.started_at;
    RAISE NOTICE '    Timer started: %', COALESCE(v_recent_sessions.timer_started_at::text, 'NULL');
    RAISE NOTICE '    Ended: %', COALESCE(v_recent_sessions.ended_at::text, 'Still active');
    RAISE NOTICE '    Duration (stored): %s', COALESCE(v_recent_sessions.duration_seconds::text, 'NULL');
    RAISE NOTICE '    Duration (calculated): %s', COALESCE(v_recent_sessions.actual_duration_calc::text, 'NULL');
    RAISE NOTICE '    Counted: %', v_recent_sessions.counted_toward_usage;

    -- Check for suspicious counting
    IF v_recent_sessions.counted_toward_usage = true AND v_recent_sessions.duration_seconds < 295 THEN
      RAISE WARNING '    ❌ SUSPICIOUS: Session counted but duration < 5 minutes!';
    ELSIF v_recent_sessions.counted_toward_usage = true AND v_recent_sessions.ended_at IS NOT NULL THEN
      IF v_recent_sessions.actual_duration_calc < 295 THEN
        RAISE WARNING '    ❌ SUSPICIOUS: Session counted but actual duration < 5 minutes!';
      END IF;
    END IF;

    RAISE NOTICE '';
  END LOOP;

  -- ============================================
  -- CHECK 6: Verify calculate_simulation_duration_and_counting
  -- ============================================
  RAISE NOTICE '6. Checking calculate_simulation_duration_and_counting...';
  RAISE NOTICE '----------------------------------------';

  SELECT pg_get_functiondef('calculate_simulation_duration_and_counting'::regproc) INTO v_function_version;

  IF v_function_version LIKE '%counted_toward_usage%' AND v_function_version NOT LIKE '%NEW.counted_toward_usage :=%' THEN
    RAISE NOTICE '✅ calculate_simulation_duration_and_counting does NOT modify counted_toward_usage';
  ELSE
    RAISE WARNING '❌ CRITICAL: calculate_simulation_duration_and_counting may still be modifying counted_toward_usage!';
  END IF;

  IF v_function_version LIKE '%timer_started_at%' THEN
    RAISE NOTICE '✅ calculate_simulation_duration_and_counting uses timer_started_at';
  ELSE
    RAISE WARNING '❌ CRITICAL: calculate_simulation_duration_and_counting not using timer_started_at!';
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- FINAL VERDICT
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL VERDICT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  IF NOT v_trigger_exists THEN
    RAISE NOTICE '✅ All migrations appear to be applied correctly';
    RAISE NOTICE '';
    RAISE NOTICE 'If quota is still being counted immediately:';
    RAISE NOTICE '  1. Check frontend code calling mark_simulation_counted()';
    RAISE NOTICE '  2. Clear browser cache and reload';
    RAISE NOTICE '  3. Check Supabase logs for unexpected function calls';
    RAISE NOTICE '  4. Verify frontend is calling set_simulation_timer_start()';
  ELSE
    RAISE NOTICE '❌ MIGRATIONS NOT FULLY APPLIED';
    RAISE NOTICE '';
    RAISE NOTICE 'ACTION REQUIRED:';
    RAISE NOTICE '  1. Re-run migration 20251217000000 (main fix)';
    RAISE NOTICE '  2. Verify trigger is dropped with: SELECT * FROM pg_trigger WHERE tgname LIKE ''%quota%''';
    RAISE NOTICE '  3. Run this verification script again';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
