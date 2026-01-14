-- Migration: Remove unlimited tier from all database functions
-- Date: 2026-01-14
-- Purpose: Clean up all references to the 'unlimited' tier which no longer exists
--
-- The subscription tiers are now:
-- - free: 3 simulations (one-time)
-- - basic: 30 simulations/month
-- - premium: 60 simulations/month

-- ============================================
-- STEP 1: Update get_tier_simulation_limit function
-- ============================================

CREATE OR REPLACE FUNCTION get_tier_simulation_limit(p_tier TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'free' THEN 3
    WHEN 'basic' THEN 30
    WHEN 'premium' THEN 60
    -- Legacy tier names for backward compatibility
    WHEN 'basis' THEN 30
    WHEN 'profi' THEN 60
    ELSE 3 -- Default to free tier limit
  END;
END;
$$;

COMMENT ON FUNCTION get_tier_simulation_limit(TEXT) IS
'Returns the simulation limit for a given subscription tier. Free: 3, Basic: 30, Premium: 60.';

-- ============================================
-- STEP 2: Update can_start_simulation function
-- ============================================

CREATE OR REPLACE FUNCTION can_start_simulation(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota RECORD;
  v_limit INTEGER;
  v_used INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get user's quota record
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id;

  -- If no quota record, check if user exists and create default
  IF v_quota IS NULL THEN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
      RETURN jsonb_build_object(
        'can_start', false,
        'reason', 'user_not_found',
        'message', 'Benutzer nicht gefunden'
      );
    END IF;

    -- Auto-initialize quota for free tier
    INSERT INTO user_simulation_quota (user_id, subscription_tier, total_simulations, simulations_used)
    VALUES (p_user_id, 'free', 3, 0)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO v_quota;

    -- Re-fetch if insert didn't return (conflict)
    IF v_quota IS NULL THEN
      SELECT * INTO v_quota FROM user_simulation_quota WHERE user_id = p_user_id;
    END IF;
  END IF;

  -- Get limits
  v_limit := COALESCE(v_quota.total_simulations, get_tier_simulation_limit(v_quota.subscription_tier));
  v_used := COALESCE(v_quota.simulations_used, 0);
  v_remaining := GREATEST(0, v_limit - v_used);

  -- Check if user can start
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'can_start', false,
      'reason', 'quota_exceeded',
      'message', 'Simulationslimit erreicht. Bitte upgraden Sie Ihren Plan.',
      'simulations_used', v_used,
      'total_simulations', v_limit,
      'simulations_remaining', 0
    );
  END IF;

  -- User can start
  RETURN jsonb_build_object(
    'can_start', true,
    'reason', 'quota_available',
    'message', format('%s Simulationen verbleibend', v_remaining),
    'simulations_used', v_used,
    'total_simulations', v_limit,
    'simulations_remaining', v_remaining
  );
END;
$$;

COMMENT ON FUNCTION can_start_simulation(UUID) IS
'Checks if a user can start a new simulation based on their quota.';

-- ============================================
-- STEP 3: Update get_user_quota_status function
-- ============================================

CREATE OR REPLACE FUNCTION get_user_quota_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota RECORD;
  v_limit INTEGER;
  v_used INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get user's quota record
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id;

  -- If no quota record exists, return default free tier status
  IF v_quota IS NULL THEN
    RETURN jsonb_build_object(
      'has_quota', false,
      'subscription_tier', 'free',
      'total_simulations', 3,
      'simulations_used', 0,
      'simulations_remaining', 3,
      'period_start', NULL,
      'period_end', NULL,
      'usage_text', '0 / 3',
      'message', 'Kein Quota-Eintrag gefunden'
    );
  END IF;

  -- Calculate values
  v_limit := COALESCE(v_quota.total_simulations, get_tier_simulation_limit(v_quota.subscription_tier));
  v_used := COALESCE(v_quota.simulations_used, 0);
  v_remaining := GREATEST(0, v_limit - v_used);

  RETURN jsonb_build_object(
    'has_quota', true,
    'subscription_tier', v_quota.subscription_tier,
    'total_simulations', v_limit,
    'simulations_used', v_used,
    'simulations_remaining', v_remaining,
    'period_start', v_quota.period_start,
    'period_end', v_quota.period_end,
    'usage_text', format('%s / %s', v_used, v_limit),
    'message', CASE
      WHEN v_remaining > 0 THEN format('%s Simulationen verbleibend', v_remaining)
      ELSE 'Simulationslimit erreicht'
    END
  );
END;
$$;

COMMENT ON FUNCTION get_user_quota_status(UUID) IS
'Returns the current quota status for a user including usage and limits.';

-- ============================================
-- STEP 4: Update record_simulation_usage function
-- ============================================

CREATE OR REPLACE FUNCTION record_simulation_usage(
  p_session_token UUID,
  p_user_id UUID,
  p_simulation_type TEXT,
  p_counted_toward_usage BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota RECORD;
  v_new_used INTEGER;
BEGIN
  -- Skip if not counted toward usage
  IF NOT p_counted_toward_usage THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Simulation nicht auf Quota angerechnet',
      'quota_updated', false
    );
  END IF;

  -- Get and lock user's quota record
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_quota IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Kein Quota-Eintrag gefunden',
      'quota_updated', false
    );
  END IF;

  -- Increment usage
  v_new_used := COALESCE(v_quota.simulations_used, 0) + 1;

  UPDATE user_simulation_quota
  SET
    simulations_used = v_new_used,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Simulation erfolgreich aufgezeichnet',
    'quota_updated', true,
    'simulations_used', v_new_used,
    'simulations_remaining', GREATEST(0, COALESCE(v_quota.total_simulations, 0) - v_new_used),
    'total_simulations', v_quota.total_simulations
  );
END;
$$;

COMMENT ON FUNCTION record_simulation_usage(UUID, UUID, TEXT, BOOLEAN) IS
'Records simulation usage and updates the user quota.';

-- ============================================
-- STEP 5: Update sections.required_tier constraint
-- ============================================

-- First, update any sections that have 'unlimited' tier to 'premium'
UPDATE sections
SET required_tier = 'premium'
WHERE required_tier = 'unlimited';

-- Update legacy German tier names to English
UPDATE sections
SET required_tier = 'basic'
WHERE required_tier = 'basis';

UPDATE sections
SET required_tier = 'premium'
WHERE required_tier = 'profi';

-- Drop old constraint and add new one
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find and drop the existing constraint
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'sections'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%required_tier%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE sections DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped sections constraint: %', constraint_name;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop sections constraint: %', SQLERRM;
END $$;

-- Add new constraint with correct tier names
ALTER TABLE sections
ADD CONSTRAINT sections_required_tier_check
CHECK (required_tier IS NULL OR required_tier IN ('free', 'basic', 'premium'));

COMMENT ON COLUMN sections.required_tier IS
'Minimum subscription tier required to access this section: free, basic, or premium';

-- ============================================
-- STEP 6: Update user_simulation_quota constraint
-- ============================================

-- First update any unlimited entries to premium
UPDATE user_simulation_quota
SET subscription_tier = 'premium', total_simulations = 60
WHERE subscription_tier = 'unlimited' OR total_simulations = -1;

-- Update legacy tier names
UPDATE user_simulation_quota
SET subscription_tier = 'basic'
WHERE subscription_tier = 'basis';

UPDATE user_simulation_quota
SET subscription_tier = 'premium'
WHERE subscription_tier = 'profi';

-- Drop old constraint and add new one
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'user_simulation_quota'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%subscription_tier%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_simulation_quota DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped user_simulation_quota constraint: %', constraint_name;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop user_simulation_quota constraint: %', SQLERRM;
END $$;

-- Add new constraint
ALTER TABLE user_simulation_quota
ADD CONSTRAINT user_simulation_quota_tier_check
CHECK (subscription_tier IN ('free', 'basic', 'premium'));

-- ============================================
-- STEP 7: Update normalize_tier_name helper function
-- ============================================

CREATE OR REPLACE FUNCTION normalize_tier_name(p_tier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE LOWER(COALESCE(p_tier, 'free'))
    WHEN 'basis' THEN 'basic'
    WHEN 'profi' THEN 'premium'
    WHEN 'unlimited' THEN 'premium'
    WHEN 'basic' THEN 'basic'
    WHEN 'premium' THEN 'premium'
    WHEN 'free' THEN 'free'
    ELSE 'free'
  END;
END;
$$;

COMMENT ON FUNCTION normalize_tier_name(TEXT) IS
'Converts legacy tier names (basis, profi, unlimited) to new names (basic, premium). Returns free as default.';

-- ============================================
-- STEP 8: Log completion
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Removed unlimited tier from:';
  RAISE NOTICE '  - get_tier_simulation_limit()';
  RAISE NOTICE '  - can_start_simulation()';
  RAISE NOTICE '  - get_user_quota_status()';
  RAISE NOTICE '  - record_simulation_usage()';
  RAISE NOTICE '  - sections.required_tier constraint';
  RAISE NOTICE '  - user_simulation_quota constraint';
  RAISE NOTICE '  - normalize_tier_name()';
  RAISE NOTICE '';
  RAISE NOTICE 'Valid tiers are now: free, basic, premium';
  RAISE NOTICE '========================================';
END $$;
