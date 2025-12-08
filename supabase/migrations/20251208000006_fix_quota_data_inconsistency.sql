-- Migration: Fix quota data inconsistency
-- Date: 2025-12-08
-- Purpose: Reset user quota to match actual simulation usage

-- Problem: Database shows 3/3 simulations used, but UI shows 1/3
-- Root cause: Possible double-counting or stale data in quota table

-- Solution: Recalculate simulations_used from actual simulation_usage_logs

-- Update quota to match actual counted simulations
UPDATE user_simulation_quota uq
SET
  simulations_used = (
    SELECT COUNT(*)
    FROM simulation_usage_logs sul
    WHERE sul.user_id = uq.user_id
      AND sul.counted_toward_usage = true
      AND sul.ended_at >= uq.period_start
      AND sul.ended_at < uq.period_end
  ),
  updated_at = NOW()
WHERE period_start <= NOW()
  AND period_end > NOW();

-- Log the changes
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_simulation_quota WHERE period_start <= NOW() AND period_end > NOW();
  RAISE NOTICE 'Updated % active quota records to match actual simulation usage', v_count;
END $$;

COMMENT ON TABLE user_simulation_quota IS
'Quota recalculated from actual simulation_usage_logs where counted_toward_usage = true. Last updated: 2025-12-08';

COMMIT;
