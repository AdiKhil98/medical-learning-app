-- ============================================
-- MIGRATION: Fix Quota/Subscription Sync Issue
-- Date: 2025-12-15
-- Purpose: Diagnose and fix inconsistencies between user_subscriptions and user_simulation_quota
-- ============================================

-- PROBLEM IDENTIFIED:
-- User ID: 66da816e-844c-4e8a-85af-e7e286124133
-- - user_subscriptions shows: tier='premium', Unlimited-Plan, status='active'
-- - user_simulation_quota shows: tier='free', total_simulations=3
--
-- ROOT CAUSE:
-- The initialize_user_quota function uses ON CONFLICT (user_id, period_start)
-- If the period_start doesn't match, a new record is created instead of updating the old one
-- This can happen when:
-- 1. Subscription created in a different month than the quota record
-- 2. Manual subscription insertion bypassing the atomic webhook function
-- 3. Old quota records not being updated during subscription changes

-- ============================================
-- PART 1: DIAGNOSTIC QUERY
-- ============================================

DO $$
DECLARE
  v_inconsistent_count integer;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSING QUOTA/SUBSCRIPTION SYNC ISSUES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Find users with mismatched tiers
  SELECT COUNT(*) INTO v_inconsistent_count
  FROM user_subscriptions us
  INNER JOIN user_simulation_quota usq ON us.user_id = usq.user_id
  WHERE us.tier != usq.subscription_tier
    AND us.status = 'active';

  RAISE NOTICE 'Found % users with mismatched subscription tiers', v_inconsistent_count;
  RAISE NOTICE '';

  -- Show details of inconsistent users
  FOR r IN (
    SELECT
      us.user_id,
      us.tier as subscription_tier,
      us.status as subscription_status,
      us.simulation_limit as subscription_limit,
      usq.subscription_tier as quota_tier,
      usq.total_simulations as quota_limit,
      usq.simulations_used,
      usq.simulations_remaining,
      usq.period_start,
      usq.period_end
    FROM user_subscriptions us
    INNER JOIN user_simulation_quota usq ON us.user_id = usq.user_id
    WHERE us.tier != usq.subscription_tier
      AND us.status = 'active'
    ORDER BY us.updated_at DESC
    LIMIT 10
  ) LOOP
    RAISE NOTICE 'User: %', r.user_id;
    RAISE NOTICE '  Subscription: tier=%, status=%, limit=%', r.subscription_tier, r.subscription_status, r.subscription_limit;
    RAISE NOTICE '  Quota: tier=%, limit=%, used=%, remaining=%', r.quota_tier, r.quota_limit, r.simulations_used, r.simulations_remaining;
    RAISE NOTICE '  Period: % to %', r.period_start, r.period_end;
    RAISE NOTICE '';
  END LOOP;

END $$;

-- ============================================
-- PART 2: FIX FUNCTION - Sync Quota with Active Subscription
-- ============================================

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
  INSERT INTO user_simulation_quota (
    user_id,
    subscription_tier,
    total_simulations,
    simulations_used,
    simulations_remaining,
    period_start,
    period_end
  ) VALUES (
    p_user_id,
    v_subscription.tier,
    v_subscription.simulation_limit,
    COALESCE(v_quota_before.simulations_used, 0),
    v_subscription.simulation_limit - COALESCE(v_quota_before.simulations_used, 0),
    v_current_period_start,
    v_current_period_end
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
  SET
    subscription_tier = EXCLUDED.subscription_tier,
    total_simulations = EXCLUDED.total_simulations,
    simulations_remaining = EXCLUDED.total_simulations - user_simulation_quota.simulations_used,
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
'Manually syncs a user''s quota record with their active subscription.
Use this to fix inconsistencies between user_subscriptions and user_simulation_quota tables.';

GRANT EXECUTE ON FUNCTION sync_quota_with_subscription TO service_role;
GRANT EXECUTE ON FUNCTION sync_quota_with_subscription TO authenticated;

-- ============================================
-- PART 3: FIX ALL INCONSISTENT USERS
-- ============================================

DO $$
DECLARE
  v_user_id uuid;
  v_result json;
  v_fixed_count integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING INCONSISTENT QUOTA RECORDS';
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
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Fixed % user quota records', v_fixed_count;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PART 4: CREATE TRIGGER TO PREVENT FUTURE ISSUES
-- ============================================

-- Trigger function to auto-sync quota when subscription is updated
CREATE OR REPLACE FUNCTION trigger_sync_quota_on_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  v_result json;
BEGIN
  -- Only sync if subscription becomes active or tier changes
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR
     (TG_OP = 'UPDATE' AND
      (OLD.status != 'active' AND NEW.status = 'active' OR
       OLD.tier != NEW.tier OR
       OLD.simulation_limit != NEW.simulation_limit)) THEN

    -- Sync quota with subscription
    SELECT sync_quota_with_subscription(NEW.user_id) INTO v_result;

    IF NOT (v_result->>'success')::boolean THEN
      RAISE WARNING 'Failed to auto-sync quota for user %: %',
        NEW.user_id, v_result->>'error';
    ELSE
      RAISE NOTICE 'Auto-synced quota for user % after subscription change', NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS auto_sync_quota_on_subscription_change ON user_subscriptions;

CREATE TRIGGER auto_sync_quota_on_subscription_change
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_quota_on_subscription_change();

COMMENT ON TRIGGER auto_sync_quota_on_subscription_change ON user_subscriptions IS
'Automatically syncs user_simulation_quota when subscription is activated or tier changes.
This prevents future quota/subscription inconsistencies.';

-- ============================================
-- PART 5: VERIFICATION QUERY
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
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - sync_quota_with_subscription() function';
  RAISE NOTICE '  - auto_sync_quota_on_subscription_change trigger';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  - Fixes existing quota/subscription inconsistencies';
  RAISE NOTICE '  - Prevents future sync issues via trigger';
  RAISE NOTICE '  - Can be called manually if needed';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
