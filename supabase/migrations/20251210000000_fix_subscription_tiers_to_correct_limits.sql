-- Migration: Fix subscription tier limits to correct values
-- Date: 2025-12-10
-- Purpose: Correct all subscription tiers to match business requirements
--
-- CORRECT TIERS:
-- - free: 3 simulations/month
-- - basic: 30 simulations/month (was "basis" with 20)
-- - premium: 60 simulations/month (was "profi" with 100)
-- - Remove unlimited tier (doesn't exist in business model)

-- ============================================
-- STEP 1: Fix the tier limit function
-- ============================================

CREATE OR REPLACE FUNCTION get_tier_simulation_limit(tier text)
RETURNS integer AS $$
BEGIN
  RETURN CASE tier
    WHEN 'free' THEN 3
    WHEN 'basic' THEN 30     -- Fixed: was "basis" with 20
    WHEN 'premium' THEN 60   -- Fixed: was "profi" with 100
    -- Support legacy tier names for backward compatibility
    WHEN 'basis' THEN 30     -- Legacy: redirect to basic
    WHEN 'profi' THEN 60     -- Legacy: redirect to premium
    ELSE 3                   -- Default to free tier
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_tier_simulation_limit IS
'Returns the simulation limit for a given subscription tier.
Free: 3/month, Basic: 30/month, Premium: 60/month.
Legacy names (basis, profi) supported for backward compatibility.';

-- ============================================
-- STEP 2: Update can_start_simulation to handle new tiers
-- ============================================

CREATE OR REPLACE FUNCTION can_start_simulation(
  p_user_id uuid,
  p_current_time timestamptz DEFAULT NOW()
)
RETURNS json AS $$
DECLARE
  v_quota user_simulation_quota;
  v_can_start boolean;
  v_message text;
BEGIN
  -- Get current quota for user
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id
    AND period_start <= p_current_time
    AND period_end > p_current_time
  ORDER BY period_start DESC
  LIMIT 1;

  -- AUTO-INITIALIZE: If no quota record exists, create a free tier quota
  IF v_quota IS NULL THEN
    RAISE NOTICE 'No quota found for user %, auto-initializing free tier', p_user_id;

    -- Initialize free tier quota (3 simulations per month)
    v_quota := initialize_user_quota(
      p_user_id,
      'free',
      date_trunc('month', p_current_time),
      date_trunc('month', p_current_time) + INTERVAL '1 month'
    );

    RAISE NOTICE 'Free tier quota initialized for user %: % simulations', p_user_id, v_quota.total_simulations;
  END IF;

  -- Check if simulations remaining
  IF v_quota.simulations_remaining > 0 THEN
    RETURN json_build_object(
      'can_start', true,
      'reason', 'has_quota',
      'message', format('%s von %s Simulationen verfügbar', v_quota.simulations_remaining, v_quota.total_simulations),
      'simulations_remaining', v_quota.simulations_remaining,
      'simulations_used', v_quota.simulations_used,
      'total_simulations', v_quota.total_simulations
    );
  ELSE
    RETURN json_build_object(
      'can_start', false,
      'reason', 'quota_exceeded',
      'message', format('Simulationslimit erreicht (%s/%s). Upgraden Sie Ihren Tarif für mehr Simulationen.',
        v_quota.simulations_used, v_quota.total_simulations),
      'simulations_remaining', 0,
      'simulations_used', v_quota.simulations_used,
      'total_simulations', v_quota.total_simulations
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_start_simulation IS
'Checks if a user can start a new simulation. Auto-initializes free tier quota (3 simulations/month) if none exists. Returns JSON with can_start boolean and details.';

-- ============================================
-- STEP 3: Normalize tier names in user_simulation_quota
-- ============================================

-- Update legacy tier names to new names
UPDATE user_simulation_quota
SET subscription_tier = 'basic'
WHERE subscription_tier = 'basis';

UPDATE user_simulation_quota
SET subscription_tier = 'premium'
WHERE subscription_tier = 'profi';

-- Handle unlimited tier (shouldn't exist, but if it does, convert to premium)
UPDATE user_simulation_quota
SET
  subscription_tier = 'premium',
  total_simulations = 60
WHERE subscription_tier = 'unlimited' OR total_simulations = -1;

-- ============================================
-- STEP 4: Fix total_simulations for updated tiers
-- ============================================

-- Fix free tier quotas (should be 3, might be 5)
UPDATE user_simulation_quota
SET total_simulations = 3
WHERE subscription_tier = 'free' AND total_simulations != 3;

-- Fix basic tier quotas (should be 30, might be 20)
UPDATE user_simulation_quota
SET total_simulations = 30
WHERE subscription_tier = 'basic' AND total_simulations != 30;

-- Fix premium tier quotas (should be 60, might be 100)
UPDATE user_simulation_quota
SET total_simulations = 60
WHERE subscription_tier = 'premium' AND total_simulations != 60;

-- ============================================
-- STEP 5: Update user_subscriptions table if it exists
-- ============================================

-- Normalize tier names in user_subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    -- Update legacy tier names
    UPDATE user_subscriptions
    SET tier = 'basic'
    WHERE tier = 'basis';

    UPDATE user_subscriptions
    SET tier = 'premium'
    WHERE tier = 'profi';

    -- Update simulation limits
    UPDATE user_subscriptions
    SET simulation_limit = 30
    WHERE tier = 'basic' AND simulation_limit != 30;

    UPDATE user_subscriptions
    SET simulation_limit = 60
    WHERE tier = 'premium' AND simulation_limit != 60;

    UPDATE user_subscriptions
    SET simulation_limit = 3
    WHERE tier = 'free' AND simulation_limit != 3;

    -- Remove unlimited tier if it exists
    UPDATE user_subscriptions
    SET
      tier = 'premium',
      simulation_limit = 60
    WHERE tier = 'unlimited';

    RAISE NOTICE 'Updated user_subscriptions tier names and limits';
  END IF;
END $$;

-- ============================================
-- STEP 6: Update users table if it has tier column
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_tier') THEN
    -- Update legacy tier names in users table
    UPDATE users
    SET subscription_tier = 'basic'
    WHERE subscription_tier = 'basis';

    UPDATE users
    SET subscription_tier = 'premium'
    WHERE subscription_tier = 'profi';

    -- Handle unlimited tier
    UPDATE users
    SET subscription_tier = 'premium'
    WHERE subscription_tier = 'unlimited';

    RAISE NOTICE 'Updated users.subscription_tier to new names';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'simulation_limit') THEN
    -- Update simulation limits in users table
    UPDATE users
    SET simulation_limit = 30
    WHERE subscription_tier = 'basic' AND simulation_limit != 30;

    UPDATE users
    SET simulation_limit = 60
    WHERE subscription_tier = 'premium' AND simulation_limit != 60;

    UPDATE users
    SET simulation_limit = 3
    WHERE (subscription_tier = 'free' OR subscription_tier IS NULL) AND simulation_limit != 3;

    RAISE NOTICE 'Updated users.simulation_limit to correct values';
  END IF;
END $$;

-- ============================================
-- STEP 7: Add check constraint to prevent invalid tiers
-- ============================================

-- Remove old constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'user_simulation_quota_subscription_tier_check') THEN
    ALTER TABLE user_simulation_quota DROP CONSTRAINT user_simulation_quota_subscription_tier_check;
  END IF;
END $$;

-- Add new constraint with correct tiers
ALTER TABLE user_simulation_quota
ADD CONSTRAINT user_simulation_quota_subscription_tier_check
CHECK (subscription_tier IN ('free', 'basic', 'premium'));

COMMENT ON CONSTRAINT user_simulation_quota_subscription_tier_check ON user_simulation_quota IS
'Only allow valid subscription tiers: free, basic, premium';

-- ============================================
-- STEP 8: Create a helper function to migrate legacy tier names
-- ============================================

CREATE OR REPLACE FUNCTION normalize_tier_name(legacy_tier text)
RETURNS text AS $$
BEGIN
  RETURN CASE legacy_tier
    WHEN 'basis' THEN 'basic'
    WHEN 'profi' THEN 'premium'
    WHEN 'unlimited' THEN 'premium'
    ELSE legacy_tier
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_tier_name IS
'Converts legacy tier names (basis, profi, unlimited) to new names (basic, premium).
Used for backward compatibility in webhooks and migrations.';

GRANT EXECUTE ON FUNCTION normalize_tier_name TO authenticated, service_role;

-- ============================================
-- STEP 9: Log the migration
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Subscription tiers updated to:';
  RAISE NOTICE '  - free: 3 simulations/month';
  RAISE NOTICE '  - basic: 30 simulations/month (was basis with 20)';
  RAISE NOTICE '  - premium: 60 simulations/month (was profi with 100)';
  RAISE NOTICE '  - unlimited tier removed';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
