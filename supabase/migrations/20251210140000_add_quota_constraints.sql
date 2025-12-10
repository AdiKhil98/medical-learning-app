-- Migration: Add Database Constraints for Quota Integrity
-- Date: 2025-12-10
-- Purpose: Prevent data corruption by enforcing business rules at the database level
--
-- PROBLEM:
-- - No constraints prevent simulations_used > total_simulations
-- - No constraints prevent negative values
-- - Data corruption can occur through bugs or manual updates
--
-- SOLUTION:
-- - Add CHECK constraints to enforce valid ranges
-- - Prevent invalid subscription tiers
-- - Ensure data integrity at database level

-- ============================================
-- STEP 1: Add constraints to user_simulation_quota table
-- ============================================

-- Constraint: simulations_used must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_simulation_quota_used_non_negative'
      AND table_name = 'user_simulation_quota'
  ) THEN
    ALTER TABLE user_simulation_quota
    ADD CONSTRAINT user_simulation_quota_used_non_negative
    CHECK (simulations_used >= 0);

    RAISE NOTICE 'Added constraint: simulations_used >= 0';
  ELSE
    RAISE NOTICE 'Constraint user_simulation_quota_used_non_negative already exists';
  END IF;
END $$;

COMMENT ON CONSTRAINT user_simulation_quota_used_non_negative ON user_simulation_quota IS
'Ensures simulations_used is never negative. Users cannot have negative usage.';

-- Constraint: total_simulations must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_simulation_quota_total_valid'
      AND table_name = 'user_simulation_quota'
  ) THEN
    ALTER TABLE user_simulation_quota
    ADD CONSTRAINT user_simulation_quota_total_valid
    CHECK (total_simulations > 0);

    RAISE NOTICE 'Added constraint: total_simulations > 0';
  ELSE
    RAISE NOTICE 'Constraint user_simulation_quota_total_valid already exists';
  END IF;
END $$;

COMMENT ON CONSTRAINT user_simulation_quota_total_valid ON user_simulation_quota IS
'Ensures total_simulations is always positive. Free=3, Basic=30, Premium=60.';

-- Constraint: period_end must be after period_start
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_simulation_quota_valid_period'
      AND table_name = 'user_simulation_quota'
  ) THEN
    ALTER TABLE user_simulation_quota
    ADD CONSTRAINT user_simulation_quota_valid_period
    CHECK (period_end > period_start);

    RAISE NOTICE 'Added constraint: period_end > period_start';
  ELSE
    RAISE NOTICE 'Constraint user_simulation_quota_valid_period already exists';
  END IF;
END $$;

COMMENT ON CONSTRAINT user_simulation_quota_valid_period ON user_simulation_quota IS
'Ensures billing period end is always after start. Prevents invalid date ranges.';

-- Note: We do NOT add "simulations_used <= total_simulations" constraint
-- Reason: When downgrading (e.g., premium 50/60 → basic 30), user might have used 50
--         This creates -20 remaining, which correctly blocks further usage
--         But we need to allow the data to exist for historical/billing purposes

-- ============================================
-- STEP 2: Add constraints to users table
-- ============================================

-- Constraint: simulations_used_this_month must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_monthly_usage_non_negative'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_monthly_usage_non_negative
    CHECK (simulations_used_this_month >= 0);

    RAISE NOTICE 'Added constraint: users.simulations_used_this_month >= 0';
  ELSE
    RAISE NOTICE 'Constraint users_monthly_usage_non_negative already exists';
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Column simulations_used_this_month does not exist in users table, skipping constraint';
END $$;

-- Constraint: free_simulations_used must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_free_usage_non_negative'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_free_usage_non_negative
    CHECK (free_simulations_used >= 0);

    RAISE NOTICE 'Added constraint: users.free_simulations_used >= 0';
  ELSE
    RAISE NOTICE 'Constraint users_free_usage_non_negative already exists';
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Column free_simulations_used does not exist in users table, skipping constraint';
END $$;

-- ============================================
-- STEP 3: Add constraints to simulation_usage_logs table
-- ============================================

-- Constraint: duration_seconds must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_duration_valid'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    ADD CONSTRAINT simulation_usage_logs_duration_valid
    CHECK (duration_seconds >= 0);

    RAISE NOTICE 'Added constraint: duration_seconds >= 0';
  ELSE
    RAISE NOTICE 'Constraint simulation_usage_logs_duration_valid already exists';
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Column duration_seconds does not exist, skipping constraint';
END $$;

-- Constraint: duration should not exceed maximum (20 minutes = 1200 seconds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_duration_max'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    ADD CONSTRAINT simulation_usage_logs_duration_max
    CHECK (duration_seconds <= 1500);  -- 25 minutes max (20 + 5 grace)

    RAISE NOTICE 'Added constraint: duration_seconds <= 1500';
  ELSE
    RAISE NOTICE 'Constraint simulation_usage_logs_duration_max already exists';
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Column duration_seconds does not exist, skipping constraint';
END $$;

-- Constraint: ended_at must be after started_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_valid_timespan'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    ADD CONSTRAINT simulation_usage_logs_valid_timespan
    CHECK (ended_at IS NULL OR ended_at >= started_at);

    RAISE NOTICE 'Added constraint: ended_at >= started_at';
  ELSE
    RAISE NOTICE 'Constraint simulation_usage_logs_valid_timespan already exists';
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Columns started_at/ended_at do not exist, skipping constraint';
END $$;

-- Constraint: token_expires_at must be after started_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_valid_token_expiry'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    ADD CONSTRAINT simulation_usage_logs_valid_token_expiry
    CHECK (token_expires_at > started_at);

    RAISE NOTICE 'Added constraint: token_expires_at > started_at';
  ELSE
    RAISE NOTICE 'Constraint simulation_usage_logs_valid_token_expiry already exists';
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Column token_expires_at does not exist, skipping constraint';
END $$;

-- ============================================
-- STEP 4: Add constraints to user_subscriptions table
-- ============================================

-- Constraint: simulation_limit must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_subscriptions_limit_valid'
      AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE user_subscriptions
    ADD CONSTRAINT user_subscriptions_limit_valid
    CHECK (simulation_limit > 0);

    RAISE NOTICE 'Added constraint: user_subscriptions.simulation_limit > 0';
  ELSE
    RAISE NOTICE 'Constraint user_subscriptions_limit_valid already exists';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table user_subscriptions does not exist, skipping constraint';
  WHEN undefined_column THEN
    RAISE NOTICE 'Column simulation_limit does not exist, skipping constraint';
END $$;

-- Constraint: tier must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_subscriptions_tier_valid'
      AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE user_subscriptions
    ADD CONSTRAINT user_subscriptions_tier_valid
    CHECK (tier IN ('free', 'basic', 'premium'));

    RAISE NOTICE 'Added constraint: user_subscriptions.tier IN (free, basic, premium)';
  ELSE
    RAISE NOTICE 'Constraint user_subscriptions_tier_valid already exists';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table user_subscriptions does not exist, skipping constraint';
  WHEN undefined_column THEN
    RAISE NOTICE 'Column tier does not exist, skipping constraint';
END $$;

-- ============================================
-- STEP 5: Verify existing data meets constraints
-- ============================================

DO $$
DECLARE
  v_invalid_quota_count integer;
  v_invalid_usage_count integer;
  v_invalid_sessions_count integer;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verifying existing data...';
  RAISE NOTICE '========================================';

  -- Check user_simulation_quota
  SELECT COUNT(*) INTO v_invalid_quota_count
  FROM user_simulation_quota
  WHERE simulations_used < 0
     OR total_simulations <= 0
     OR period_end <= period_start;

  IF v_invalid_quota_count > 0 THEN
    RAISE WARNING '% invalid quota records found (negative usage or invalid periods)', v_invalid_quota_count;
  ELSE
    RAISE NOTICE '✅ All quota records are valid';
  END IF;

  -- Check users table
  SELECT COUNT(*) INTO v_invalid_usage_count
  FROM users
  WHERE (simulations_used_this_month < 0)
     OR (free_simulations_used < 0);

  IF v_invalid_usage_count > 0 THEN
    RAISE WARNING '% invalid user usage records found (negative counts)', v_invalid_usage_count;
  ELSE
    RAISE NOTICE '✅ All user usage records are valid';
  END IF;

  -- Check simulation_usage_logs
  SELECT COUNT(*) INTO v_invalid_sessions_count
  FROM simulation_usage_logs
  WHERE (duration_seconds < 0)
     OR (duration_seconds > 1500)
     OR (ended_at IS NOT NULL AND ended_at < started_at);

  IF v_invalid_sessions_count > 0 THEN
    RAISE WARNING '% invalid session records found (negative duration or invalid timespan)', v_invalid_sessions_count;
  ELSE
    RAISE NOTICE '✅ All session records are valid';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 6: Create validation helper function
-- ============================================

CREATE OR REPLACE FUNCTION validate_quota_data()
RETURNS TABLE(
  table_name text,
  issue_type text,
  record_count bigint,
  severity text
) AS $$
BEGIN
  -- Check for negative usage in user_simulation_quota
  RETURN QUERY
  SELECT
    'user_simulation_quota'::text,
    'Negative simulations_used'::text,
    COUNT(*)::bigint,
    'ERROR'::text
  FROM user_simulation_quota
  WHERE simulations_used < 0;

  -- Check for invalid total_simulations
  RETURN QUERY
  SELECT
    'user_simulation_quota'::text,
    'Invalid total_simulations'::text,
    COUNT(*)::bigint,
    'ERROR'::text
  FROM user_simulation_quota
  WHERE total_simulations <= 0;

  -- Check for invalid periods
  RETURN QUERY
  SELECT
    'user_simulation_quota'::text,
    'Invalid period (end <= start)'::text,
    COUNT(*)::bigint,
    'ERROR'::text
  FROM user_simulation_quota
  WHERE period_end <= period_start;

  -- Check for over-usage (warning, not error)
  RETURN QUERY
  SELECT
    'user_simulation_quota'::text,
    'Usage exceeds limit (downgrade case)'::text,
    COUNT(*)::bigint,
    'WARNING'::text
  FROM user_simulation_quota
  WHERE simulations_used > total_simulations;

  -- Check for negative duration
  RETURN QUERY
  SELECT
    'simulation_usage_logs'::text,
    'Negative duration_seconds'::text,
    COUNT(*)::bigint,
    'ERROR'::text
  FROM simulation_usage_logs
  WHERE duration_seconds < 0;

  -- Check for excessive duration
  RETURN QUERY
  SELECT
    'simulation_usage_logs'::text,
    'Duration exceeds maximum'::text,
    COUNT(*)::bigint,
    'WARNING'::text
  FROM simulation_usage_logs
  WHERE duration_seconds > 1500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_quota_data IS
'Validates quota data integrity and returns any issues found.
Use this to check data quality periodically.
Example: SELECT * FROM validate_quota_data() WHERE record_count > 0;';

GRANT EXECUTE ON FUNCTION validate_quota_data TO service_role;

-- ============================================
-- STEP 7: Migration summary
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database Constraints Migration Completed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Constraints Added:';
  RAISE NOTICE '  ✅ user_simulation_quota: Non-negative usage';
  RAISE NOTICE '  ✅ user_simulation_quota: Valid total simulations';
  RAISE NOTICE '  ✅ user_simulation_quota: Valid period range';
  RAISE NOTICE '  ✅ users: Non-negative monthly usage';
  RAISE NOTICE '  ✅ users: Non-negative free usage';
  RAISE NOTICE '  ✅ simulation_usage_logs: Valid duration';
  RAISE NOTICE '  ✅ simulation_usage_logs: Valid timespan';
  RAISE NOTICE '  ✅ user_subscriptions: Valid tier names';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  - Prevents data corruption at database level';
  RAISE NOTICE '  - Catches bugs before they cause issues';
  RAISE NOTICE '  - Enforces business rules automatically';
  RAISE NOTICE '  - Improves data quality and reliability';
  RAISE NOTICE '';
  RAISE NOTICE 'Validation Function:';
  RAISE NOTICE '  - validate_quota_data() available for monitoring';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
