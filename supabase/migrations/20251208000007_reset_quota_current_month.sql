-- Migration: Reset quota to current month only
-- Date: 2025-12-08
-- Purpose: Clean up old simulation data and reset quota to current month

-- Problem: Database shows 42/3 simulations used due to old/test data
-- Solution: Only count simulations from current month, ignore old data

-- STEP 1: Delete simulation records older than current month
-- (Keep current month's data only)
DELETE FROM simulation_usage_logs
WHERE started_at < date_trunc('month', NOW());

-- STEP 2: Recalculate quota based on current month's simulations only
UPDATE user_simulation_quota uq
SET
  simulations_used = (
    SELECT COUNT(*)
    FROM simulation_usage_logs sul
    WHERE sul.user_id = uq.user_id
      AND sul.counted_toward_usage = true
      AND sul.started_at >= date_trunc('month', NOW())
  ),
  updated_at = NOW()
WHERE period_start = date_trunc('month', NOW())
  AND period_end = date_trunc('month', NOW()) + INTERVAL '1 month';

-- STEP 3: Log results
DO $$
DECLARE
  v_total_logs integer;
  v_counted_logs integer;
  v_quota_updated integer;
BEGIN
  SELECT COUNT(*) INTO v_total_logs FROM simulation_usage_logs;
  SELECT COUNT(*) INTO v_counted_logs FROM simulation_usage_logs WHERE counted_toward_usage = true;
  SELECT COUNT(*) INTO v_quota_updated FROM user_simulation_quota
    WHERE period_start = date_trunc('month', NOW());

  RAISE NOTICE 'Cleanup complete:';
  RAISE NOTICE '  - Total simulation logs remaining: %', v_total_logs;
  RAISE NOTICE '  - Counted simulations (>= 5 min): %', v_counted_logs;
  RAISE NOTICE '  - Quota records updated: %', v_quota_updated;
END $$;

COMMENT ON TABLE simulation_usage_logs IS
'Old simulation data cleaned up. Only current month data retained. Last cleanup: 2025-12-08';

COMMIT;
