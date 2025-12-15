-- ============================================
-- DEEP SYSTEM DIAGNOSTIC
-- Date: 2025-12-15
-- Purpose: Comprehensive investigation for data inconsistencies
-- ============================================

-- This migration performs read-only diagnostics and does NOT modify data
-- Run this to identify potential issues across the entire system

DO $$
DECLARE
  v_count integer;
  v_total_issues integer := 0;
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DEEP SYSTEM DIAGNOSTIC STARTING';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 1: Users without quota records
  -- ============================================
  RAISE NOTICE '📊 CHECK 1: Users without quota records';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM users u
  LEFT JOIN user_simulation_quota usq ON u.id = usq.user_id
  WHERE usq.user_id IS NULL;

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % users without quota records!', v_count;
    v_total_issues := v_total_issues + 1;

    -- Show details
    FOR r IN (
      SELECT u.id, u.email
      FROM users u
      LEFT JOIN user_simulation_quota usq ON u.id = usq.user_id
      WHERE usq.user_id IS NULL
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  User: % (email: %)', r.id, r.email;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All users have quota records';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 2: Orphaned quota records (users don't exist)
  -- ============================================
  RAISE NOTICE '📊 CHECK 2: Orphaned quota records';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM user_simulation_quota usq
  LEFT JOIN users u ON usq.user_id = u.id
  WHERE u.id IS NULL;

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % orphaned quota records!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT usq.user_id, usq.subscription_tier, usq.total_simulations
      FROM user_simulation_quota usq
      LEFT JOIN users u ON usq.user_id = u.id
      WHERE u.id IS NULL
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Orphaned quota: user_id=%, tier=%, total=%', r.user_id, r.subscription_tier, r.total_simulations;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No orphaned quota records';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 3: Expired subscriptions still marked as active
  -- ============================================
  RAISE NOTICE '📊 CHECK 3: Expired subscriptions still active';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM user_subscriptions
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % expired subscriptions still marked as active!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT user_id, tier, status, expires_at
      FROM user_subscriptions
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Expired subscription: user=%, tier=%, expired=%', r.user_id, r.tier, r.expires_at;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No expired subscriptions marked as active';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 4: Subscription vs quota tier mismatch
  -- ============================================
  RAISE NOTICE '📊 CHECK 4: Subscription vs quota tier mismatch';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM user_subscriptions us
  INNER JOIN user_simulation_quota usq ON us.user_id = usq.user_id
  WHERE us.tier != usq.subscription_tier
    AND us.status = 'active'
    AND usq.period_start = date_trunc('month', NOW());

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % users with mismatched subscription vs quota tier!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT us.user_id, us.tier as subscription_tier,
             usq.subscription_tier as quota_tier,
             usq.total_simulations as quota_limit
      FROM user_subscriptions us
      INNER JOIN user_simulation_quota usq ON us.user_id = usq.user_id
      WHERE us.tier != usq.subscription_tier
        AND us.status = 'active'
        AND usq.period_start = date_trunc('month', NOW())
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Mismatch: user=%, subscription.tier=%, quota.tier=%, quota.limit=%',
        r.user_id, r.subscription_tier, r.quota_tier, r.quota_limit;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Subscription and quota tiers are synced';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 5: Orphaned simulation sessions (never ended)
  -- ============================================
  RAISE NOTICE '📊 CHECK 5: Orphaned simulation sessions (never ended)';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM simulation_usage_logs
  WHERE ended_at IS NULL
    AND started_at < NOW() - INTERVAL '2 hours';

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % orphaned simulation sessions (started >2h ago, never ended)!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT user_id, session_token, simulation_type, started_at,
             NOW() - started_at as age
      FROM simulation_usage_logs
      WHERE ended_at IS NULL
        AND started_at < NOW() - INTERVAL '2 hours'
      ORDER BY started_at ASC
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Orphaned session: user=%, type=%, started=%, age=%',
        r.user_id, r.simulation_type, r.started_at, r.age;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No orphaned simulation sessions found';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 6: Negative simulation counts
  -- ============================================
  RAISE NOTICE '📊 CHECK 6: Negative or invalid simulation counts';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM user_simulation_quota
  WHERE simulations_remaining < 0
     OR simulations_used < 0
     OR total_simulations < 0
     OR simulations_used > total_simulations;

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % quota records with invalid counts!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT user_id, subscription_tier, total_simulations,
             simulations_used, simulations_remaining
      FROM user_simulation_quota
      WHERE simulations_remaining < 0
         OR simulations_used < 0
         OR total_simulations < 0
         OR simulations_used > total_simulations
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Invalid counts: user=%, tier=%, total=%, used=%, remaining=%',
        r.user_id, r.subscription_tier, r.total_simulations,
        r.simulations_used, r.simulations_remaining;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All simulation counts are valid';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 7: Users with multiple active subscriptions
  -- ============================================
  RAISE NOTICE '📊 CHECK 7: Users with multiple active subscriptions';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT user_id, COUNT(*) as sub_count
    FROM user_subscriptions
    WHERE status = 'active'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) multi_subs;

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % users with multiple active subscriptions!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT user_id, COUNT(*) as sub_count,
             string_agg(tier::text, ', ') as tiers
      FROM user_subscriptions
      WHERE status = 'active'
      GROUP BY user_id
      HAVING COUNT(*) > 1
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Multiple subs: user=%, count=%, tiers=%',
        r.user_id, r.sub_count, r.tiers;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No users with multiple active subscriptions';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 8: Quota periods in the past (not current month)
  -- ============================================
  RAISE NOTICE '📊 CHECK 8: Active users with quota for old periods';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM user_simulation_quota usq
  INNER JOIN users u ON usq.user_id = u.id
  WHERE usq.period_start != date_trunc('month', NOW())
    AND NOT EXISTS (
      SELECT 1 FROM user_simulation_quota usq2
      WHERE usq2.user_id = usq.user_id
        AND usq2.period_start = date_trunc('month', NOW())
    );

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % users with only old quota periods (no current month)!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT usq.user_id, usq.period_start, usq.subscription_tier
      FROM user_simulation_quota usq
      INNER JOIN users u ON usq.user_id = u.id
      WHERE usq.period_start != date_trunc('month', NOW())
        AND NOT EXISTS (
          SELECT 1 FROM user_simulation_quota usq2
          WHERE usq2.user_id = usq.user_id
            AND usq2.period_start = date_trunc('month', NOW())
        )
      ORDER BY usq.period_start DESC
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Old quota: user=%, period=%, tier=%',
        r.user_id, r.period_start, r.subscription_tier;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All active users have current month quota';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 9: Simulations counted but duration < 5 minutes
  -- ============================================
  RAISE NOTICE '📊 CHECK 9: Counted simulations with duration < 5 minutes';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true
    AND duration_seconds IS NOT NULL
    AND duration_seconds < 300
    AND ended_at IS NOT NULL;

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % simulations counted despite being < 5 minutes!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT user_id, session_token, simulation_type,
             duration_seconds, started_at, ended_at
      FROM simulation_usage_logs
      WHERE counted_toward_usage = true
        AND duration_seconds IS NOT NULL
        AND duration_seconds < 300
        AND ended_at IS NOT NULL
      ORDER BY started_at DESC
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Short counted sim: user=%, type=%, duration=%s, started=%',
        r.user_id, r.simulation_type, r.duration_seconds, r.started_at;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All counted simulations are >= 5 minutes';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- CHECK 10: Missing timer_started_at on recent sessions
  -- ============================================
  RAISE NOTICE '📊 CHECK 10: Recent sessions missing timer_started_at';
  RAISE NOTICE '---';

  SELECT COUNT(*) INTO v_count
  FROM simulation_usage_logs
  WHERE started_at > NOW() - INTERVAL '7 days'
    AND timer_started_at IS NULL
    AND ended_at IS NOT NULL;

  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % recent sessions without timer_started_at!', v_count;
    v_total_issues := v_total_issues + 1;

    FOR r IN (
      SELECT user_id, session_token, simulation_type,
             started_at, ended_at, duration_seconds, counted_toward_usage
      FROM simulation_usage_logs
      WHERE started_at > NOW() - INTERVAL '7 days'
        AND timer_started_at IS NULL
        AND ended_at IS NOT NULL
      ORDER BY started_at DESC
      LIMIT 5
    ) LOOP
      RAISE NOTICE '  Missing timer_started_at: user=%, type=%, duration=%s, counted=%',
        r.user_id, r.simulation_type, r.duration_seconds, r.counted_toward_usage;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All recent sessions have timer_started_at';
  END IF;
  RAISE NOTICE '';

  -- ============================================
  -- SUMMARY
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 DIAGNOSTIC SUMMARY';
  RAISE NOTICE '========================================';

  IF v_total_issues = 0 THEN
    RAISE NOTICE '✅ No issues found - system is healthy!';
  ELSE
    RAISE WARNING '⚠️  Found % potential issue(s) - review above for details', v_total_issues;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Checks performed:';
  RAISE NOTICE '  1. Users without quota records';
  RAISE NOTICE '  2. Orphaned quota records';
  RAISE NOTICE '  3. Expired but active subscriptions';
  RAISE NOTICE '  4. Subscription vs quota tier mismatches';
  RAISE NOTICE '  5. Orphaned simulation sessions';
  RAISE NOTICE '  6. Invalid simulation counts';
  RAISE NOTICE '  7. Multiple active subscriptions';
  RAISE NOTICE '  8. Old quota periods';
  RAISE NOTICE '  9. Short counted simulations';
  RAISE NOTICE '  10. Missing timer_started_at';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSTIC COMPLETE';
  RAISE NOTICE '========================================';

END $$;
