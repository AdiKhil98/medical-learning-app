-- ============================================
-- MIGRATION: Fix can_start_simulation function overloads
-- Date: 2026-02-04
-- Purpose: Consolidate multiple conflicting function definitions into a single
--          definitive version that handles trials, paid subscriptions, and
--          returns all fields the client expects.
--
-- Problem: Multiple migrations created different overloaded versions:
--   1. (UUID) → JSONB from 20260114 (no trial support, buggy ON CONFLICT)
--   2. (uuid, timestamptz) → json from 20260123 (trial support, 2 params)
--   3. (UUID) → JSON from 20250124_fix (trial support, may have failed)
--
-- This migration drops ALL overloads and creates a single clean version.
-- ============================================

-- ============================================
-- STEP 1: Drop ALL existing overloads
-- ============================================

-- Drop 1-parameter version (could be JSON or JSONB return type)
DROP FUNCTION IF EXISTS can_start_simulation(uuid);

-- Drop 2-parameter version (uuid, timestamptz)
DROP FUNCTION IF EXISTS can_start_simulation(uuid, timestamptz);

-- ============================================
-- STEP 2: Ensure user_simulation_quota constraint includes 'trial'
-- ============================================

ALTER TABLE user_simulation_quota DROP CONSTRAINT IF EXISTS user_simulation_quota_subscription_tier_check;
ALTER TABLE user_simulation_quota DROP CONSTRAINT IF EXISTS user_simulation_quota_tier_check;

ALTER TABLE user_simulation_quota
ADD CONSTRAINT user_simulation_quota_subscription_tier_check
CHECK (subscription_tier IN ('free', 'trial', 'basic', 'premium', 'monthly', 'quarterly'));

-- ============================================
-- STEP 3: Create the single definitive function
-- ============================================

CREATE FUNCTION can_start_simulation(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_days_remaining integer;
BEGIN
  -- Get user info
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;

  IF v_user IS NULL THEN
    RETURN json_build_object(
      'can_start', false,
      'reason', 'user_not_found',
      'message', 'Benutzer nicht gefunden',
      'simulations_remaining', 0,
      'simulations_used', 0,
      'total_simulations', 0,
      'is_trial', false,
      'trial_expired', false
    );
  END IF;

  -- ========================================
  -- CHECK 1: Is user on active trial?
  -- ========================================
  IF v_user.trial_expires_at IS NOT NULL AND v_user.trial_expires_at > NOW() THEN
    v_days_remaining := GREATEST(1, EXTRACT(DAY FROM (v_user.trial_expires_at - NOW()))::integer);

    -- If less than 1 full day but still active, show at least 1
    IF v_days_remaining = 0 AND v_user.trial_expires_at > NOW() THEN
      v_days_remaining := 1;
    END IF;

    RETURN json_build_object(
      'can_start', true,
      'reason', 'trial_active',
      'message', format('%s Tage Testphase verbleibend', v_days_remaining),
      'simulations_remaining', -1,
      'simulations_used', 0,
      'total_simulations', -1,
      'is_trial', true,
      'trial_expires_at', v_user.trial_expires_at,
      'days_remaining', v_days_remaining,
      'trial_expired', false,
      'subscription_tier', 'trial'
    );
  END IF;

  -- ========================================
  -- CHECK 2: Has active paid subscription?
  -- Supports all tier names: basic, premium, monthly, quarterly
  -- ========================================
  IF v_user.subscription_status IN ('active', 'past_due')
     AND v_user.subscription_tier IN ('basic', 'premium', 'monthly', 'quarterly') THEN
    RETURN json_build_object(
      'can_start', true,
      'reason', 'has_quota',
      'message', 'Unbegrenzte Simulationen',
      'simulations_remaining', -1,
      'simulations_used', 0,
      'total_simulations', -1,
      'is_trial', false,
      'trial_expired', false,
      'subscription_tier', v_user.subscription_tier
    );
  END IF;

  -- ========================================
  -- CHECK 3: Has trial expired? (User was on trial but it's over)
  -- ========================================
  IF v_user.has_used_trial = true
     AND v_user.trial_expires_at IS NOT NULL
     AND v_user.trial_expires_at <= NOW() THEN
    RETURN json_build_object(
      'can_start', false,
      'reason', 'trial_expired',
      'message', 'Ihre Testphase ist abgelaufen. Upgraden Sie jetzt für unbegrenzten Zugang!',
      'simulations_remaining', 0,
      'simulations_used', 0,
      'total_simulations', 0,
      'is_trial', false,
      'trial_expired', true,
      'subscription_tier', 'free'
    );
  END IF;

  -- ========================================
  -- CHECK 4: New user who hasn't started trial yet
  -- ========================================
  IF v_user.has_used_trial = false OR v_user.has_used_trial IS NULL THEN
    -- Auto-initialize trial for new users
    PERFORM initialize_trial_period(p_user_id);

    RETURN json_build_object(
      'can_start', true,
      'reason', 'trial_started',
      'message', '5 Tage Testphase gestartet!',
      'simulations_remaining', -1,
      'simulations_used', 0,
      'total_simulations', -1,
      'is_trial', true,
      'trial_expires_at', NOW() + INTERVAL '5 days',
      'days_remaining', 5,
      'trial_expired', false,
      'subscription_tier', 'trial'
    );
  END IF;

  -- ========================================
  -- DEFAULT: No access (trial used, no subscription)
  -- ========================================
  RETURN json_build_object(
    'can_start', false,
    'reason', 'no_subscription',
    'message', 'Bitte wählen Sie einen Tarif, um Simulationen zu nutzen.',
    'simulations_remaining', 0,
    'simulations_used', 0,
    'total_simulations', 0,
    'is_trial', false,
    'trial_expired', false,
    'subscription_tier', 'free'
  );
END;
$$;

-- ============================================
-- STEP 4: Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION can_start_simulation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_start_simulation(uuid) TO service_role;

COMMENT ON FUNCTION can_start_simulation(uuid) IS
'Checks if a user can start a simulation. Single definitive version.
Priority: 1) Active trial 2) Paid subscription 3) Trial expired 4) New user (auto-start trial) 5) No access.
Returns all fields needed by the client: can_start, reason, message, simulations_remaining,
simulations_used, total_simulations, is_trial, trial_expires_at, days_remaining, trial_expired, subscription_tier.';

-- ============================================
-- STEP 5: Verification
-- ============================================

DO $$
DECLARE
  v_func_count integer;
BEGIN
  -- Count how many can_start_simulation functions exist
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'can_start_simulation'
    AND n.nspname = 'public';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'can_start_simulation overload fix complete';
  RAISE NOTICE 'Functions named can_start_simulation: % (should be 1)', v_func_count;
  RAISE NOTICE '========================================';

  IF v_func_count != 1 THEN
    RAISE WARNING 'Expected exactly 1 function, found %. Check for remaining overloads.', v_func_count;
  END IF;
END $$;
