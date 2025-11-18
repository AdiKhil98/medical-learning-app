-- CRITICAL FIX: Counter Reconciliation System
-- Migration: create_counter_reconciliation
-- Date: 2025-11-18
-- Issue: Counters in users table can get out of sync with simulation_usage_logs

-- ============================================
-- PROBLEM
-- ============================================
-- Simulation_usage_logs is the source of truth for simulation counts
-- But users table has cached counters that can drift due to:
-- 1. Race conditions (before row locks were added)
-- 2. Failed transactions that rolled back
-- 3. Manual database updates
-- 4. Bugs in increment functions
-- 5. Data migration issues

-- ============================================
-- Solution: Reconciliation System
-- ============================================

-- ============================================
-- Step 1: Create discrepancy detection view
-- ============================================
CREATE OR REPLACE VIEW counter_discrepancies AS
WITH actual_counts AS (
  -- Count actual simulations from logs (source of truth)
  SELECT
    user_id,
    -- Free simulations: count where subscription_tier is NULL/empty
    COUNT(*) FILTER (
      WHERE counted_toward_usage = true
        AND (
          -- Check user's tier at time of simulation
          (SELECT subscription_tier FROM users u WHERE u.id = simulation_usage_logs.user_id) IS NULL
          OR
          (SELECT subscription_tier FROM users u WHERE u.id = simulation_usage_logs.user_id) = ''
          OR
          (SELECT subscription_status FROM users u WHERE u.id = simulation_usage_logs.user_id) NOT IN ('active', 'on_trial', 'past_due')
        )
    ) as actual_free_count,

    -- Monthly simulations: count where subscription is active
    COUNT(*) FILTER (
      WHERE counted_toward_usage = true
        AND (SELECT subscription_tier FROM users u WHERE u.id = simulation_usage_logs.user_id) IS NOT NULL
        AND (SELECT subscription_tier FROM users u WHERE u.id = simulation_usage_logs.user_id) != ''
        AND (SELECT subscription_status FROM users u WHERE u.id = simulation_usage_logs.user_id) IN ('active', 'on_trial', 'past_due')
        -- Only count this billing period
        AND started_at >= COALESCE(
          (SELECT subscription_period_start FROM users u WHERE u.id = simulation_usage_logs.user_id),
          date_trunc('month', now())
        )
    ) as actual_monthly_count
  FROM simulation_usage_logs
  GROUP BY user_id
)
SELECT
  u.id as user_id,
  u.email,
  u.subscription_tier,
  u.subscription_status,

  -- Free tier discrepancy
  COALESCE(ac.actual_free_count, 0) as actual_free_simulations,
  u.free_simulations_used as recorded_free_simulations,
  COALESCE(ac.actual_free_count, 0) - u.free_simulations_used as free_difference,

  -- Monthly tier discrepancy
  COALESCE(ac.actual_monthly_count, 0) as actual_monthly_simulations,
  u.simulations_used_this_month as recorded_monthly_simulations,
  COALESCE(ac.actual_monthly_count, 0) - u.simulations_used_this_month as monthly_difference,

  -- Overall status
  CASE
    WHEN COALESCE(ac.actual_free_count, 0) = u.free_simulations_used
         AND COALESCE(ac.actual_monthly_count, 0) = u.simulations_used_this_month
    THEN '✅ Synced'
    ELSE '❌ Out of sync'
  END as sync_status
FROM users u
LEFT JOIN actual_counts ac ON u.id = ac.user_id
WHERE
  -- Only show rows with discrepancies
  COALESCE(ac.actual_free_count, 0) != u.free_simulations_used
  OR COALESCE(ac.actual_monthly_count, 0) != u.simulations_used_this_month
ORDER BY
  ABS(COALESCE(ac.actual_free_count, 0) - u.free_simulations_used) +
  ABS(COALESCE(ac.actual_monthly_count, 0) - u.simulations_used_this_month) DESC;

COMMENT ON VIEW counter_discrepancies IS
'Shows users whose counters do not match simulation_usage_logs (source of truth). Use reconcile_user_counter() to fix.';

-- ============================================
-- Step 2: Create reconciliation log table
-- ============================================
CREATE TABLE IF NOT EXISTS counter_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  reconciled_by UUID, -- auth.uid() of admin who ran reconciliation

  -- Before values
  old_free_count INTEGER NOT NULL,
  old_monthly_count INTEGER NOT NULL,

  -- After values (actual counts from logs)
  new_free_count INTEGER NOT NULL,
  new_monthly_count INTEGER NOT NULL,

  -- Differences
  free_difference INTEGER NOT NULL,
  monthly_difference INTEGER NOT NULL,

  -- Metadata
  reconciliation_source TEXT, -- 'manual', 'scheduled', 'auto'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_log_user ON counter_reconciliation_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_log_reconciled_by ON counter_reconciliation_log(reconciled_by, created_at);

COMMENT ON TABLE counter_reconciliation_log IS
'Audit log of all counter reconciliation actions. Tracks before/after values.';

-- ============================================
-- Step 3: Create reconciliation function for single user
-- ============================================
CREATE OR REPLACE FUNCTION reconcile_user_counter(
  p_user_id UUID,
  p_source TEXT DEFAULT 'manual'
)
RETURNS JSON AS $$
DECLARE
  v_old_free INTEGER;
  v_old_monthly INTEGER;
  v_new_free INTEGER := 0;
  v_new_monthly INTEGER := 0;
  v_subscription_tier TEXT;
  v_subscription_status TEXT;
  v_period_start TIMESTAMPTZ;
BEGIN
  -- Lock user row to prevent concurrent updates
  SELECT
    free_simulations_used,
    simulations_used_this_month,
    subscription_tier,
    subscription_status,
    COALESCE(subscription_period_start, date_trunc('month', now()))
  INTO
    v_old_free,
    v_old_monthly,
    v_subscription_tier,
    v_subscription_status,
    v_period_start
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_old_free IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Count actual free simulations from logs
  -- Free = no active subscription OR status not active
  SELECT COUNT(*)
  INTO v_new_free
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND counted_toward_usage = true
    AND (
      v_subscription_tier IS NULL
      OR v_subscription_tier = ''
      OR v_subscription_status NOT IN ('active', 'on_trial', 'past_due')
    );

  -- Count actual monthly simulations from logs (current billing period only)
  SELECT COUNT(*)
  INTO v_new_monthly
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND counted_toward_usage = true
    AND v_subscription_tier IS NOT NULL
    AND v_subscription_tier != ''
    AND v_subscription_status IN ('active', 'on_trial', 'past_due')
    AND started_at >= v_period_start;

  -- Update user counters with actual counts
  UPDATE users
  SET
    free_simulations_used = v_new_free,
    simulations_used_this_month = v_new_monthly
  WHERE id = p_user_id;

  -- Log the reconciliation
  INSERT INTO counter_reconciliation_log (
    user_id,
    reconciled_by,
    old_free_count,
    old_monthly_count,
    new_free_count,
    new_monthly_count,
    free_difference,
    monthly_difference,
    reconciliation_source
  ) VALUES (
    p_user_id,
    auth.uid(),
    v_old_free,
    v_old_monthly,
    v_new_free,
    v_new_monthly,
    v_new_free - v_old_free,
    v_new_monthly - v_old_monthly,
    p_source
  );

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_free_count', v_old_free,
    'new_free_count', v_new_free,
    'free_difference', v_new_free - v_old_free,
    'old_monthly_count', v_old_monthly,
    'new_monthly_count', v_new_monthly,
    'monthly_difference', v_new_monthly - v_old_monthly,
    'message', 'Counter reconciled successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to service_role and admins only
REVOKE ALL ON FUNCTION reconcile_user_counter(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reconcile_user_counter(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION reconcile_user_counter(UUID, TEXT) IS
'Reconciles a single user counter by recounting from simulation_usage_logs. Admins and service_role only.';

-- ============================================
-- Step 4: Create bulk reconciliation function
-- ============================================
CREATE OR REPLACE FUNCTION reconcile_all_counters(
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
  v_user_record RECORD;
  v_reconciled_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Loop through all users with discrepancies
  FOR v_user_record IN
    SELECT user_id FROM counter_discrepancies
  LOOP
    BEGIN
      IF p_dry_run THEN
        -- Just count, don't actually reconcile
        v_reconciled_count := v_reconciled_count + 1;
      ELSE
        -- Actually reconcile
        v_result := reconcile_user_counter(v_user_record.user_id, 'bulk_reconciliation');

        IF (v_result->>'success')::boolean THEN
          v_reconciled_count := v_reconciled_count + 1;
        ELSE
          v_error_count := v_error_count + 1;
          RAISE NOTICE 'Failed to reconcile user %: %', v_user_record.user_id, v_result->>'error';
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE NOTICE 'Error reconciling user %: %', v_user_record.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'reconciled_count', v_reconciled_count,
    'error_count', v_error_count,
    'message', CASE
      WHEN p_dry_run THEN format('Dry run: Would reconcile %s users', v_reconciled_count)
      ELSE format('Reconciled %s users, %s errors', v_reconciled_count, v_error_count)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to service_role only
REVOKE ALL ON FUNCTION reconcile_all_counters(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reconcile_all_counters(BOOLEAN) TO service_role;

COMMENT ON FUNCTION reconcile_all_counters(BOOLEAN) IS
'Reconciles all user counters that have discrepancies. Use p_dry_run=true to preview. Service role only.';

-- ============================================
-- Step 5: Create health check view
-- ============================================
CREATE OR REPLACE VIEW counter_health_check AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM counter_discrepancies cd WHERE cd.user_id = users.id
    )
  ) as users_with_discrepancies,
  COUNT(*) - COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM counter_discrepancies cd WHERE cd.user_id = users.id
    )
  ) as users_in_sync,
  ROUND(
    100.0 * (COUNT(*) - COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM counter_discrepancies cd WHERE cd.user_id = users.id
      )
    )) / NULLIF(COUNT(*), 0),
    2
  ) as sync_percentage
FROM users;

COMMENT ON VIEW counter_health_check IS
'Overall health check: shows how many users have counter discrepancies.';

-- ============================================
-- Verification Queries
-- ============================================

-- Test 1: View all discrepancies
-- SELECT * FROM counter_discrepancies;

-- Test 2: View health check
-- SELECT * FROM counter_health_check;

-- Test 3: Dry run bulk reconciliation
-- SELECT reconcile_all_counters(true);

-- Test 4: Actually run bulk reconciliation
-- SELECT reconcile_all_counters(false);

-- Test 5: View reconciliation log
-- SELECT * FROM counter_reconciliation_log ORDER BY created_at DESC LIMIT 10;
