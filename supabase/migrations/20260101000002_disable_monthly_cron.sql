-- ============================================
-- DISABLE MONTHLY CRON JOB
-- Date: 2026-01-01
-- ============================================
--
-- REASON:
-- - We now reset based on individual user billing cycles
-- - No longer need a global "1st of month" reset
-- - Webhook + lazy reset handle this per-user
--
-- OLD BEHAVIOR: All users reset on 1st of month (WRONG)
-- NEW BEHAVIOR: Each user resets on their billing date (CORRECT)

-- Unschedule the cron job
SELECT cron.unschedule('reset-monthly-simulation-counters');

-- Log that it was removed
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MONTHLY CRON JOB DISABLED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ℹ️  Quota resets now happen per-user based on billing cycles';
  RAISE NOTICE 'ℹ️  Reset mechanisms:';
  RAISE NOTICE '   1. Webhook (subscription_updated) - Primary';
  RAISE NOTICE '   2. Lazy check (can_start_simulation) - Fallback';
  RAISE NOTICE '';
  RAISE NOTICE 'ℹ️  The reset_monthly_simulation_counters() function';
  RAISE NOTICE '   has been deprecated but kept for reference';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Verify it's gone
DO $$
DECLARE
  v_cron_count integer;
BEGIN
  SELECT COUNT(*) INTO v_cron_count
  FROM cron.job
  WHERE jobname = 'reset-monthly-simulation-counters';

  IF v_cron_count = 0 THEN
    RAISE NOTICE '✅ Cron job successfully removed';
  ELSE
    RAISE WARNING '⚠️  Cron job still exists! Manual removal may be required.';
  END IF;
END $$;

-- Mark the old function as deprecated
COMMENT ON FUNCTION reset_monthly_simulation_counters IS
'[DEPRECATED 2026-01-01] No longer used. Quota resets happen per-user based on Lemon Squeezy billing cycles. See migrations 20260101000001 (lazy reset) and lemonsqueezy.js webhook (renewal detection).';

-- Optionally show all remaining cron jobs
SELECT
  jobname,
  schedule,
  active,
  'Cron jobs remaining in system' as note
FROM cron.job
ORDER BY jobname;
