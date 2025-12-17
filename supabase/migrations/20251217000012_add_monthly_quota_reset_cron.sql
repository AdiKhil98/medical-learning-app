-- ============================================
-- MONTHLY QUOTA RESET - Prevent counter accumulation
-- Date: 2025-12-17
-- ============================================
--
-- PROBLEM:
-- - simulations_used_this_month keeps incrementing forever
-- - No automatic monthly reset
-- - Counter accumulates to 349 instead of resetting each month
--
-- SOLUTION:
-- - Create cron job that runs on 1st of each month
-- - Resets counter to count only current month's simulations
-- - Prevents accumulation issue from happening again

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create monthly reset function
CREATE OR REPLACE FUNCTION reset_monthly_simulation_counters()
RETURNS json AS $$
DECLARE
  v_users_updated integer := 0;
  v_total_users integer := 0;
  v_user_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MONTHLY QUOTA RESET';
  RAISE NOTICE 'Date: %', NOW();
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Count total users
  SELECT COUNT(*) INTO v_total_users FROM users;
  RAISE NOTICE 'Processing % users...', v_total_users;

  -- Temporarily disable the sync trigger to avoid conflicts
  ALTER TABLE users DISABLE TRIGGER trigger_sync_monthly_counter;

  -- Reset each user's counter to their actual current month count
  FOR v_user_record IN
    SELECT
      u.id,
      u.email,
      u.simulations_used_this_month as old_count,
      COALESCE((
        SELECT COUNT(*)
        FROM simulation_usage_logs sul
        WHERE sul.user_id = u.id
          AND sul.counted_toward_usage = true
          AND sul.created_at >= date_trunc('month', CURRENT_DATE)
      ), 0) as correct_count
    FROM users u
    WHERE u.simulations_used_this_month > 0  -- Only update users with non-zero counts
  LOOP
    -- Only update if the counts differ
    IF v_user_record.old_count != v_user_record.correct_count THEN
      UPDATE users
      SET simulations_used_this_month = v_user_record.correct_count
      WHERE id = v_user_record.id;

      v_users_updated := v_users_updated + 1;

      RAISE NOTICE 'Reset user %: % → %',
        v_user_record.email,
        v_user_record.old_count,
        v_user_record.correct_count;
    END IF;
  END LOOP;

  -- Re-enable the sync trigger
  ALTER TABLE users ENABLE TRIGGER trigger_sync_monthly_counter;

  -- Also sync to user_simulation_quota for current period
  UPDATE user_simulation_quota uq
  SET
    simulations_used = (
      SELECT COALESCE(u.simulations_used_this_month, 0)
      FROM users u
      WHERE u.id = uq.user_id
    ),
    updated_at = NOW()
  WHERE uq.period_start <= NOW()
    AND uq.period_end > NOW();

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESET COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', v_total_users;
  RAISE NOTICE 'Users updated: %', v_users_updated;
  RAISE NOTICE 'Users unchanged: %', v_total_users - v_users_updated;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  RETURN json_build_object(
    'success', true,
    'total_users', v_total_users,
    'users_updated', v_users_updated,
    'users_unchanged', v_total_users - v_users_updated,
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-enable trigger even if error occurs
    ALTER TABLE users ENABLE TRIGGER trigger_sync_monthly_counter;

    RAISE WARNING 'Error during monthly reset: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_monthly_simulation_counters IS
'Resets simulation counters on the 1st of each month. Ensures counters only reflect current month, not accumulated history.';

-- Grant execute to postgres superuser only (cron runs as superuser)
REVOKE ALL ON FUNCTION reset_monthly_simulation_counters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_monthly_simulation_counters() TO postgres;

-- Step 3: Schedule cron job to run on 1st of each month at 12:01 AM
-- Cron syntax: minute hour day month weekday
-- '1 0 1 * *' = At 00:01 on day 1 of every month
SELECT cron.schedule(
  'reset-monthly-simulation-counters',  -- Job name
  '1 0 1 * *',                          -- 1st of each month at 12:01 AM
  $$SELECT reset_monthly_simulation_counters();$$
);

-- Step 4: Verify cron job was created
SELECT
  jobid,
  schedule,
  command,
  nodename,
  database,
  active,
  'Runs on 1st of each month at 12:01 AM' as description
FROM cron.job
WHERE jobname = 'reset-monthly-simulation-counters';

-- ============================================
-- ONE-TIME EXECUTION (for current month)
-- ============================================
-- Run the reset function once now to fix current state
DO $$
BEGIN
  RAISE NOTICE 'Running one-time reset to fix current state...';
  PERFORM reset_monthly_simulation_counters();
END $$;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check when the cron job will next run
/*
SELECT
  j.jobname,
  j.schedule,
  j.active,
  r.run_start as last_run,
  r.status as last_status
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT run_start, status
  FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY run_start DESC
  LIMIT 1
) r ON true
WHERE j.jobname = 'reset-monthly-simulation-counters';
*/

-- ============================================
-- MANUAL EXECUTION (if needed)
-- ============================================
-- To manually trigger reset:
-- SELECT reset_monthly_simulation_counters();

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- To remove the cron job:
-- SELECT cron.unschedule('reset-monthly-simulation-counters');
-- To drop the function:
-- DROP FUNCTION IF EXISTS reset_monthly_simulation_counters();

COMMIT;
