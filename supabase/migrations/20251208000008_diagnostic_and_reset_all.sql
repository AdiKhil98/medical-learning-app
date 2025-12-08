-- Migration: Diagnostic and complete reset
-- Date: 2025-12-08
-- Purpose: Investigate why 41 simulations are still counted, then reset everything

-- STEP 1: Diagnostic - Show what's actually in the database
DO $$
DECLARE
  v_user_id uuid;
  v_total_logs integer;
  v_current_month_logs integer;
  v_counted_logs integer;
  v_oldest_log timestamp;
  v_newest_log timestamp;
BEGIN
  -- Get the first user_id (assuming single user for testing)
  SELECT user_id INTO v_user_id FROM user_simulation_quota LIMIT 1;

  -- Count total logs
  SELECT COUNT(*) INTO v_total_logs FROM simulation_usage_logs;

  -- Count current month logs
  SELECT COUNT(*) INTO v_current_month_logs
  FROM simulation_usage_logs
  WHERE started_at >= date_trunc('month', NOW());

  -- Count logs that should be counted toward usage
  SELECT COUNT(*) INTO v_counted_logs
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true;

  -- Get date range
  SELECT MIN(started_at), MAX(started_at) INTO v_oldest_log, v_newest_log
  FROM simulation_usage_logs;

  RAISE NOTICE '=== DIAGNOSTIC REPORT ===';
  RAISE NOTICE 'User ID being checked: %', v_user_id;
  RAISE NOTICE 'Total simulation logs: %', v_total_logs;
  RAISE NOTICE 'Current month logs (Dec 2025): %', v_current_month_logs;
  RAISE NOTICE 'Logs with counted_toward_usage=true: %', v_counted_logs;
  RAISE NOTICE 'Oldest log date: %', v_oldest_log;
  RAISE NOTICE 'Newest log date: %', v_newest_log;
  RAISE NOTICE 'Current month start: %', date_trunc('month', NOW());

  -- Show detailed breakdown by date
  RAISE NOTICE '--- Logs by month ---';
  FOR v_oldest_log IN
    SELECT date_trunc('month', started_at) as month, COUNT(*) as count
    FROM simulation_usage_logs
    GROUP BY date_trunc('month', started_at)
    ORDER BY month
  LOOP
    RAISE NOTICE 'Month %, Count: %', date_trunc('month', v_oldest_log),
      (SELECT COUNT(*) FROM simulation_usage_logs WHERE date_trunc('month', started_at) = date_trunc('month', v_oldest_log));
  END LOOP;
END $$;

-- STEP 2: Nuclear option - Delete ALL simulation logs
-- This gives us a clean slate since we have corrupted test data
DO $$
BEGIN
  RAISE NOTICE '=== DELETING ALL SIMULATION LOGS ===';
  DELETE FROM simulation_usage_logs;

  -- Reset ALL quota records to 0
  RAISE NOTICE '=== RESETTING ALL QUOTA RECORDS ===';
  UPDATE user_simulation_quota
  SET
    simulations_used = 0,
    updated_at = NOW();
END $$;

-- STEP 4: Verify the reset
DO $$
DECLARE
  v_remaining_logs integer;
  v_quota_sum integer;
BEGIN
  SELECT COUNT(*) INTO v_remaining_logs FROM simulation_usage_logs;
  SELECT SUM(simulations_used) INTO v_quota_sum FROM user_simulation_quota;

  RAISE NOTICE '=== RESET COMPLETE ===';
  RAISE NOTICE 'Remaining simulation logs: % (should be 0)', v_remaining_logs;
  RAISE NOTICE 'Total simulations_used across all quotas: % (should be 0)', v_quota_sum;

  IF v_remaining_logs = 0 AND v_quota_sum = 0 THEN
    RAISE NOTICE '✅ Database successfully reset! Fresh start.';
  ELSE
    RAISE WARNING '⚠️  Reset incomplete. Manual intervention may be needed.';
  END IF;
END $$;

COMMENT ON TABLE simulation_usage_logs IS
'All simulation logs deleted and quota reset to 0. Clean slate as of 2025-12-08';

COMMENT ON TABLE user_simulation_quota IS
'All quota records reset to 0 simulations used. Clean slate as of 2025-12-08';

COMMIT;
