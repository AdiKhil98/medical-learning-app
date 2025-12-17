-- ============================================
-- COMPLETE SYSTEM DIAGNOSIS
-- Date: 2025-12-17
-- ============================================

DO $$
DECLARE
  v_trigger RECORD;
  v_function RECORD;
  v_session RECORD;
  v_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPLETE QUOTA SYSTEM DIAGNOSIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ============================================
  -- 1. CHECK ALL FUNCTIONS
  -- ============================================
  RAISE NOTICE '1. CHECKING CRITICAL FUNCTIONS:';
  RAISE NOTICE '----------------------------------------';

  FOR v_function IN (
    SELECT
      proname as name,
      CASE WHEN proname IN (
        'start_simulation_session',
        'end_simulation_session',
        'mark_simulation_counted',
        'set_simulation_timer_start',
        'can_start_simulation'
      ) THEN 'FOUND' ELSE 'UNKNOWN' END as status
    FROM pg_proc
    WHERE proname IN (
      'start_simulation_session',
      'end_simulation_session',
      'mark_simulation_counted',
      'set_simulation_timer_start',
      'can_start_simulation'
    )
  ) LOOP
    RAISE NOTICE '  % : %', v_function.name, v_function.status;
  END LOOP;

  RAISE NOTICE '';

  -- ============================================
  -- 2. CHECK ALL TRIGGERS ON simulation_usage_logs
  -- ============================================
  RAISE NOTICE '2. ACTIVE TRIGGERS:';
  RAISE NOTICE '----------------------------------------';

  FOR v_trigger IN (
    SELECT
      tgname as trigger_name,
      proname as function_name,
      CASE
        WHEN tgname = 'trg_update_quota_on_simulation_end' THEN 'PROBLEM - Should be disabled!'
        ELSE 'OK'
      END as assessment
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'simulation_usage_logs'::regclass
      AND NOT t.tgisinternal
  ) LOOP
    RAISE NOTICE '  % -> % [%]',
      v_trigger.trigger_name,
      v_trigger.function_name,
      v_trigger.assessment;
  END LOOP;

  RAISE NOTICE '';

  -- ============================================
  -- 3. CHECK RECENT SESSION DETAILS
  -- ============================================
  RAISE NOTICE '3. RECENT SESSIONS (Last 3):';
  RAISE NOTICE '----------------------------------------';

  FOR v_session IN (
    SELECT
      substring(session_token::text, 1, 8) as token_short,
      simulation_type,
      started_at,
      timer_started_at,
      ended_at,
      duration_seconds,
      counted_toward_usage,
      CASE
        WHEN ended_at IS NULL THEN 'ACTIVE (orphaned?)'
        WHEN timer_started_at IS NULL THEN 'NEVER STARTED TIMER'
        WHEN counted_toward_usage = false AND duration_seconds >= 295 THEN 'SHOULD HAVE BEEN COUNTED!'
        WHEN counted_toward_usage = true AND duration_seconds < 295 THEN 'INCORRECTLY COUNTED!'
        ELSE 'OK'
      END as analysis
    FROM simulation_usage_logs
    ORDER BY created_at DESC
    LIMIT 3
  ) LOOP
    RAISE NOTICE '';
    RAISE NOTICE '  Session: %...', v_session.token_short;
    RAISE NOTICE '    Type: %', v_session.simulation_type;
    RAISE NOTICE '    Started: %', v_session.started_at;
    RAISE NOTICE '    Timer Started: %', COALESCE(v_session.timer_started_at::text, 'NULL - TIMER NEVER STARTED!');
    RAISE NOTICE '    Ended: %', COALESCE(v_session.ended_at::text, 'NULL - Still Active');
    RAISE NOTICE '    Duration: %s', COALESCE(v_session.duration_seconds::text, 'NULL');
    RAISE NOTICE '    Counted: %', v_session.counted_toward_usage;
    RAISE NOTICE '    ANALYSIS: %', v_session.analysis;
  END LOOP;

  RAISE NOTICE '';

  -- ============================================
  -- 4. COUNT SESSIONS BY STATUS
  -- ============================================
  RAISE NOTICE '4. SESSION STATISTICS:';
  RAISE NOTICE '----------------------------------------';

  SELECT COUNT(*) INTO v_count FROM simulation_usage_logs WHERE ended_at IS NULL;
  RAISE NOTICE '  Active (not ended): %', v_count;

  SELECT COUNT(*) INTO v_count FROM simulation_usage_logs WHERE timer_started_at IS NULL;
  RAISE NOTICE '  Timer never started: %', v_count;

  SELECT COUNT(*) INTO v_count
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true AND duration_seconds < 295;
  RAISE NOTICE '  Incorrectly counted (<5 min): %', v_count;

  SELECT COUNT(*) INTO v_count
  FROM simulation_usage_logs
  WHERE counted_toward_usage = false AND duration_seconds >= 295 AND ended_at IS NOT NULL;
  RAISE NOTICE '  Should have been counted but werent: %', v_count;

  RAISE NOTICE '';

  -- ============================================
  -- 5. CHECK mark_simulation_counted FUNCTION LOGIC
  -- ============================================
  RAISE NOTICE '5. MARK_SIMULATION_COUNTED FUNCTION:';
  RAISE NOTICE '----------------------------------------';

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_simulation_counted') THEN
    RAISE NOTICE '  Function exists: YES';

    -- Check if it validates duration
    IF EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'mark_simulation_counted'
        AND pg_get_functiondef(oid) LIKE '%295%'
    ) THEN
      RAISE NOTICE '  Validates 5-min duration: YES';
    ELSE
      RAISE NOTICE '  Validates 5-min duration: NO - PROBLEM!';
    END IF;

    -- Check if it increments counter
    IF EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'mark_simulation_counted'
        AND pg_get_functiondef(oid) LIKE '%simulations_used%'
    ) THEN
      RAISE NOTICE '  Increments counter: YES';
    ELSE
      RAISE NOTICE '  Increments counter: NO - PROBLEM!';
    END IF;
  ELSE
    RAISE NOTICE '  Function exists: NO - CRITICAL PROBLEM!';
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- FINAL DIAGNOSIS
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check for critical issues
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_update_quota_on_simulation_end'
      AND tgrelid = 'simulation_usage_logs'::regclass
  ) THEN
    RAISE NOTICE 'CRITICAL: Old quota trigger still exists - causing immediate counting';
    RAISE NOTICE 'FIX: Run Migration 1 (20251217000000)';
    RAISE NOTICE '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_simulation_counted') THEN
    RAISE NOTICE 'CRITICAL: mark_simulation_counted function missing';
    RAISE NOTICE 'FIX: Create mark_simulation_counted function';
    RAISE NOTICE '';
  END IF;

  SELECT COUNT(*) INTO v_count FROM simulation_usage_logs WHERE timer_started_at IS NULL;
  IF v_count > 0 THEN
    RAISE NOTICE 'WARNING: % session(s) never started timer', v_count;
    RAISE NOTICE 'This means set_simulation_timer_start was not called by frontend';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
