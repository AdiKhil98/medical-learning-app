-- ============================================
-- FIX: sync_quota_with_subscription function
-- Date: 2025-12-15
-- Purpose: Fix function to work with GENERATED column simulations_remaining
-- ============================================

-- ROOT CAUSE: simulations_remaining is a GENERATED column
-- The original function tried to INSERT into it, causing all sync operations to fail
-- This migration recreates the function without inserting into generated columns

CREATE OR REPLACE FUNCTION sync_quota_with_subscription(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_subscription RECORD;
  v_quota_before RECORD;
  v_quota_after RECORD;
  v_current_period_start timestamptz;
  v_current_period_end timestamptz;
BEGIN
  -- Get the current month period
  v_current_period_start := date_trunc('month', NOW());
  v_current_period_end := v_current_period_start + INTERVAL '1 month';

  -- Get active subscription
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_subscription IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No active subscription found for user'
    );
  END IF;

  -- Get current quota state
  SELECT * INTO v_quota_before
  FROM user_simulation_quota
  WHERE user_id = p_user_id
  ORDER BY period_start DESC
  LIMIT 1;

  -- Update or create quota record for current period
  -- ✅ FIX: Do NOT insert into simulations_remaining (it's a GENERATED column)
  INSERT INTO user_simulation_quota (
    user_id,
    subscription_tier,
    total_simulations,
    simulations_used,
    period_start,
    period_end
  ) VALUES (
    p_user_id,
    v_subscription.tier,
    v_subscription.simulation_limit,
    COALESCE(v_quota_before.simulations_used, 0),
    v_current_period_start,
    v_current_period_end
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
  SET
    subscription_tier = EXCLUDED.subscription_tier,
    total_simulations = EXCLUDED.total_simulations,
    -- simulations_remaining is auto-calculated by database
    updated_at = NOW()
  RETURNING * INTO v_quota_after;

  RAISE NOTICE 'Synced quota for user %', p_user_id;
  RAISE NOTICE '  Before: tier=%, total=%, used=%, remaining=%',
    v_quota_before.subscription_tier, v_quota_before.total_simulations,
    v_quota_before.simulations_used, v_quota_before.simulations_remaining;
  RAISE NOTICE '  After: tier=%, total=%, used=%, remaining=%',
    v_quota_after.subscription_tier, v_quota_after.total_simulations,
    v_quota_after.simulations_used, v_quota_after.simulations_remaining;

  RETURN json_build_object(
    'success', true,
    'message', 'Quota synced with subscription',
    'subscription', row_to_json(v_subscription),
    'quota_before', row_to_json(v_quota_before),
    'quota_after', row_to_json(v_quota_after)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to sync quota with subscription'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_quota_with_subscription IS
'Fixed version: Works with GENERATED column simulations_remaining.
Manually syncs a user''s quota record with their active subscription.';

-- ============================================
-- Now fix all inconsistent users
-- ============================================

DO $$
DECLARE
  v_user_id uuid;
  v_result json;
  v_fixed_count integer := 0;
  v_failed_count integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING INCONSISTENT QUOTA RECORDS (RETRY)';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Loop through all users with inconsistent quotas
  FOR v_user_id IN (
    SELECT DISTINCT us.user_id
    FROM user_subscriptions us
    LEFT JOIN user_simulation_quota usq ON us.user_id = usq.user_id
      AND usq.period_start = date_trunc('month', NOW())
    WHERE us.status = 'active'
      AND (usq.subscription_tier IS NULL OR us.tier != usq.subscription_tier)
  ) LOOP
    -- Sync quota for this user
    SELECT sync_quota_with_subscription(v_user_id) INTO v_result;

    IF (v_result->>'success')::boolean THEN
      v_fixed_count := v_fixed_count + 1;
    ELSE
      v_failed_count := v_failed_count + 1;
      RAISE WARNING 'Failed to sync user %: %', v_user_id, v_result->>'error';
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed % user quota records', v_fixed_count;
  IF v_failed_count > 0 THEN
    RAISE WARNING '⚠️  Failed to fix % users', v_failed_count;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_consistent_count integer;
  v_total_active_count integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Count total active subscriptions
  SELECT COUNT(*) INTO v_total_active_count
  FROM user_subscriptions
  WHERE status = 'active';

  -- Count users with consistent quotas
  SELECT COUNT(*) INTO v_consistent_count
  FROM user_subscriptions us
  INNER JOIN user_simulation_quota usq ON us.user_id = usq.user_id
    AND usq.period_start = date_trunc('month', NOW())
  WHERE us.tier = usq.subscription_tier
    AND us.status = 'active';

  RAISE NOTICE 'Total active subscriptions: %', v_total_active_count;
  RAISE NOTICE 'Subscriptions with synced quotas: %', v_consistent_count;

  IF v_consistent_count = v_total_active_count THEN
    RAISE NOTICE '✅ All quotas are now in sync!';
  ELSE
    RAISE WARNING '⚠️  Still have % inconsistent records', v_total_active_count - v_consistent_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX COMPLETE';
  RAISE NOTICE '========================================';
END $$;
