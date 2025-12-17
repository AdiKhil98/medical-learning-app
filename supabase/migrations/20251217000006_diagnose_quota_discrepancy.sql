-- ============================================
-- DIAGNOSE QUOTA DISCREPANCY
-- Date: 2025-12-17
-- ============================================
--
-- ISSUE: Database shows simulations_used_this_month = 349
-- But user sees 8/60 on screen
--
-- This script will:
-- 1. Count ACTUAL simulations that should be counted
-- 2. Compare with stored value
-- 3. Fix any discrepancies

DO $$
DECLARE
  v_user_id uuid;
  v_actual_count integer;
  v_stored_count integer;
  v_this_month_count integer;
  v_old_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'QUOTA DISCREPANCY DIAGNOSIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Get the most recent user
  SELECT user_id INTO v_user_id
  FROM simulation_usage_logs
  ORDER BY created_at DESC
  LIMIT 1;

  RAISE NOTICE 'Checking user: %', v_user_id;
  RAISE NOTICE '';

  -- ============================================
  -- 1. COUNT ACTUAL SIMULATIONS THAT SHOULD BE COUNTED
  -- ============================================
  RAISE NOTICE '1. COUNTING ACTUAL SIMULATIONS:';
  RAISE NOTICE '----------------------------------------';

  -- Count all simulations marked as counted
  SELECT COUNT(*) INTO v_actual_count
  FROM simulation_usage_logs
  WHERE user_id = v_user_id
    AND counted_toward_usage = true;

  RAISE NOTICE '  Total simulations marked as counted: %', v_actual_count;

  -- Count simulations from THIS month only
  SELECT COUNT(*) INTO v_this_month_count
  FROM simulation_usage_logs
  WHERE user_id = v_user_id
    AND counted_toward_usage = true
    AND created_at >= date_trunc('month', CURRENT_DATE);

  RAISE NOTICE '  Simulations counted THIS MONTH: %', v_this_month_count;

  -- Count old simulations (from previous months)
  SELECT COUNT(*) INTO v_old_count
  FROM simulation_usage_logs
  WHERE user_id = v_user_id
    AND counted_toward_usage = true
    AND created_at < date_trunc('month', CURRENT_DATE);

  RAISE NOTICE '  Simulations from PREVIOUS MONTHS: %', v_old_count;
  RAISE NOTICE '';

  -- ============================================
  -- 2. GET STORED VALUE
  -- ============================================
  RAISE NOTICE '2. STORED VALUE IN DATABASE:';
  RAISE NOTICE '----------------------------------------';

  SELECT simulations_used_this_month INTO v_stored_count
  FROM users
  WHERE id = v_user_id;

  RAISE NOTICE '  users.simulations_used_this_month: %', v_stored_count;
  RAISE NOTICE '';

  -- ============================================
  -- 3. COMPARE AND FIX
  -- ============================================
  RAISE NOTICE '3. ANALYSIS:';
  RAISE NOTICE '----------------------------------------';

  IF v_stored_count != v_this_month_count THEN
    RAISE WARNING '  ❌ MISMATCH DETECTED!';
    RAISE WARNING '     Stored: %, Actual: %', v_stored_count, v_this_month_count;
    RAISE NOTICE '';
    RAISE NOTICE '  Possible causes:';
    RAISE NOTICE '    - Data corruption from testing';
    RAISE NOTICE '    - Trigger sync issues';
    RAISE NOTICE '    - Counted simulations from previous months';
    RAISE NOTICE '';
    RAISE NOTICE '  FIXING: Setting correct value...';

    -- Fix the stored value
    UPDATE users
    SET simulations_used_this_month = v_this_month_count
    WHERE id = v_user_id;

    RAISE NOTICE '  ✅ Updated users.simulations_used_this_month from % to %',
      v_stored_count, v_this_month_count;
  ELSE
    RAISE NOTICE '  ✅ Values match! No fix needed.';
  END IF;

  RAISE NOTICE '';

  -- ============================================
  -- 4. SHOW RECENT SIMULATIONS BREAKDOWN
  -- ============================================
  RAISE NOTICE '4. RECENT SIMULATIONS (Last 10):';
  RAISE NOTICE '----------------------------------------';

  FOR v_stored_count IN 1..10 LOOP
    DECLARE
      v_session RECORD;
    BEGIN
      SELECT
        substring(session_token::text, 1, 8) as token_short,
        simulation_type,
        created_at,
        started_at,
        timer_started_at,
        ended_at,
        duration_seconds,
        counted_toward_usage,
        CASE
          WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 'THIS MONTH'
          ELSE 'PREVIOUS MONTH'
        END as month_status
      INTO v_session
      FROM simulation_usage_logs
      WHERE user_id = v_user_id
      ORDER BY created_at DESC
      OFFSET v_stored_count - 1
      LIMIT 1;

      EXIT WHEN NOT FOUND;

      RAISE NOTICE '  %: % [%]',
        v_session.token_short,
        v_session.simulation_type,
        v_session.month_status;
      RAISE NOTICE '     Created: %, Counted: %, Duration: %s',
        v_session.created_at,
        v_session.counted_toward_usage,
        COALESCE(v_session.duration_seconds::text, 'NULL');
    END;
  END LOOP;

  RAISE NOTICE '';

  -- ============================================
  -- 5. FINAL STATUS
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Get the updated stored count
  SELECT simulations_used_this_month INTO v_stored_count
  FROM users
  WHERE id = v_user_id;

  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Simulations used THIS MONTH: %', v_stored_count;
  RAISE NOTICE 'Total all-time counted: %', v_actual_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Frontend should now show: %/60', v_stored_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Quota value corrected!';
  RAISE NOTICE '   User should refresh the page to see updated counter.';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
