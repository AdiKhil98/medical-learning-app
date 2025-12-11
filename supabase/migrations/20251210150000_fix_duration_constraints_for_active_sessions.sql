-- ============================================
-- HOTFIX: Adjust duration constraints to allow active sessions
-- Date: 2025-12-10
-- Purpose: Fix constraint that was blocking new simulation sessions
-- ============================================

-- PROBLEM:
-- The duration_max constraint from Fix #3 is blocking session creation
-- because it doesn't properly handle:
-- 1. NULL duration_seconds (for sessions that haven't ended yet)
-- 2. Initial duration_seconds = 0 (for newly started sessions)

-- SOLUTION:
-- Update constraints to explicitly allow NULL and handle active sessions

-- ============================================
-- STEP 1: Drop existing constraints
-- ============================================

DO $$
BEGIN
  -- Drop duration constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_duration_valid'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    DROP CONSTRAINT simulation_usage_logs_duration_valid;

    RAISE NOTICE 'Dropped constraint: simulation_usage_logs_duration_valid';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_duration_max'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    DROP CONSTRAINT simulation_usage_logs_duration_max;

    RAISE NOTICE 'Dropped constraint: simulation_usage_logs_duration_max';
  END IF;
END $$;

-- ============================================
-- STEP 2: Add improved constraints that handle NULL
-- ============================================

-- Constraint: duration_seconds must be non-negative when NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_duration_valid'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    ADD CONSTRAINT simulation_usage_logs_duration_valid
    CHECK (duration_seconds IS NULL OR duration_seconds >= 0);

    RAISE NOTICE 'Added improved constraint: duration_seconds IS NULL OR >= 0';
  END IF;
END $$;

COMMENT ON CONSTRAINT simulation_usage_logs_duration_valid ON simulation_usage_logs IS
'Ensures duration_seconds is non-negative when set. NULL is allowed for active sessions.';

-- Constraint: duration should not exceed maximum when NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'simulation_usage_logs_duration_max'
      AND table_name = 'simulation_usage_logs'
  ) THEN
    ALTER TABLE simulation_usage_logs
    ADD CONSTRAINT simulation_usage_logs_duration_max
    CHECK (duration_seconds IS NULL OR duration_seconds <= 1500);

    RAISE NOTICE 'Added improved constraint: duration_seconds IS NULL OR <= 1500';
  END IF;
END $$;

COMMENT ON CONSTRAINT simulation_usage_logs_duration_max ON simulation_usage_logs IS
'Ensures duration_seconds does not exceed 25 minutes (1500s) when set. NULL is allowed for active sessions.';

-- ============================================
-- STEP 3: Verify constraints work correctly
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Duration Constraints Hotfix Applied!';
  RAISE NOTICE '';
  RAISE NOTICE 'Constraints now allow:';
  RAISE NOTICE '  ✅ NULL duration_seconds (active sessions)';
  RAISE NOTICE '  ✅ duration_seconds = 0 (just started)';
  RAISE NOTICE '  ✅ duration_seconds between 0-1500 (valid range)';
  RAISE NOTICE '';
  RAISE NOTICE 'Constraints block:';
  RAISE NOTICE '  ❌ duration_seconds < 0 (negative)';
  RAISE NOTICE '  ❌ duration_seconds > 1500 (too long)';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
