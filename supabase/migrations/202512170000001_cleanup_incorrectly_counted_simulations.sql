-- ============================================
-- CLEANUP: Fix users who were incorrectly charged for short simulations
-- Date: 2025-12-17
-- ============================================
--
-- This script identifies and fixes simulations that were incorrectly counted
-- due to the bug where duration was calculated from started_at instead of timer_started_at

-- ============================================
-- STEP 1: Identify incorrectly counted simulations
-- ============================================

DO $$
DECLARE
  v_incorrect_count integer;
  v_affected_users integer;
  r RECORD;
  v_user_refunds RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP: Incorrectly Counted Simulations';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Count incorrectly counted simulations
  SELECT COUNT(*)  INTO v_incorrect_count
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true
    AND duration_seconds IS NOT NULL
    AND duration_seconds < 295  -- Should not have been counted
    AND ended_at IS NOT NULL;

  -- Count affected users
  SELECT COUNT(DISTINCT user_id) INTO v_affected_users
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true
    AND duration_seconds IS NOT NULL
    AND duration_seconds < 295
    AND ended_at IS NOT NULL;

  RAISE NOTICE 'Found % incorrectly counted simulations', v_incorrect_count;
  RAISE NOTICE 'Affecting % users', v_affected_users;
  RAISE NOTICE '';

  IF v_incorrect_count = 0 THEN
    RAISE NOTICE '✅ No incorrectly counted simulations found. No cleanup needed.';
    RAISE NOTICE '========================================';
    RETURN;
  END IF;

  -- Show examples
  RAISE NOTICE 'Examples of incorrectly counted simulations:';
  RAISE NOTICE '----------------------------------------';
  FOR r IN (
    SELECT
      user_id,
      session_token,
      simulation_type,
      duration_seconds,
      started_at,
      timer_started_at,
      ended_at,
      EXTRACT(EPOCH FROM (ended_at - started_at))::integer as calc_from_started,
      CASE
        WHEN timer_started_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ended_at - timer_started_at))::integer
        ELSE NULL
      END as calc_from_timer
    FROM simulation_usage_logs
    WHERE counted_toward_usage = true
      AND duration_seconds IS NOT NULL
      AND duration_seconds < 295
      AND ended_at IS NOT NULL
    ORDER BY started_at DESC
    LIMIT 5
  ) LOOP
    RAISE NOTICE 'Session: %', r.session_token;
    RAISE NOTICE '  User: %', r.user_id;
    RAISE NOTICE '  Type: %', r.simulation_type;
    RAISE NOTICE '  Duration stored: %s', r.duration_seconds;
    RAISE NOTICE '  Calc from started_at: %s', r.calc_from_started;
    RAISE NOTICE '  Calc from timer_started_at: %s', COALESCE(r.calc_from_timer::text, 'NULL');
    RAISE NOTICE '  Started: %', r.started_at;
    RAISE NOTICE '  Timer started: %', COALESCE(r.timer_started_at::text, 'NULL');
    RAISE NOTICE '  Ended: %', r.ended_at;
    RAISE NOTICE '';
  END LOOP;

  -- ============================================
  -- STEP 2: Fix the simulation records
  -- ============================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixing simulation records...';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Mark these simulations as NOT counted
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = false,
    updated_at = NOW()
  WHERE counted_toward_usage = true
    AND duration_seconds IS NOT NULL
    AND duration_seconds < 295
    AND ended_at IS NOT NULL;

  RAISE NOTICE '✅ Marked % simulations as not counted', v_incorrect_count;

  -- ============================================
  -- STEP 3: Refund quota to affected users
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Refunding quota to affected users...';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- For each affected user, count how many simulations to refund
  FOR v_user_refunds IN (
    SELECT
      user_id,
      COUNT(*) as refund_count,
      subscription_tier
    FROM (
      SELECT
        logs.user_id,
        u.subscription_tier
      FROM simulation_usage_logs logs
      JOIN users u ON u.id = logs.user_id
      WHERE logs.counted_toward_usage = false  -- We just marked them false
        AND logs.duration_seconds IS NOT NULL
        AND logs.duration_seconds < 295
        AND logs.ended_at IS NOT NULL
    ) AS affected_sims
    GROUP BY user_id, subscription_tier
  ) LOOP
    -- Decrement the appropriate counter
    IF v_user_refunds.subscription_tier IS NULL OR v_user_refunds.subscription_tier = '' THEN
      -- Free tier
      UPDATE users
      SET free_simulations_used = GREATEST(0, free_simulations_used - v_user_refunds.refund_count)
      WHERE id = v_user_refunds.user_id;

      RAISE NOTICE '✅ Refunded % simulations to user % (free tier)',
        v_user_refunds.refund_count, v_user_refunds.user_id;
    ELSE
      -- Paid tier
      UPDATE users
      SET simulations_used_this_month = GREATEST(0, simulations_used_this_month - v_user_refunds.refund_count)
      WHERE id = v_user_refunds.user_id;

      RAISE NOTICE '✅ Refunded % simulations to user % (% tier)',
        v_user_refunds.refund_count, v_user_refunds.user_id, v_user_refunds.subscription_tier;
    END IF;
  END LOOP;

  -- The trigger will automatically sync users table to user_simulation_quota
  RAISE NOTICE '';
  RAISE NOTICE '✅ Quota refunds completed';
  RAISE NOTICE '✅ Trigger will automatically sync to user_simulation_quota table';

  -- ============================================
  -- STEP 4: Verification
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Fixed % simulation records', v_incorrect_count;
  RAISE NOTICE '  - Refunded quota to % users', v_affected_users;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Apply migration 20251217000000 to fix the root cause';
  RAISE NOTICE '  2. Test with short simulation (< 5 min) - should NOT count';
  RAISE NOTICE '  3. Test with long simulation (>= 5 min) - should count at 5-min mark';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMIT;
