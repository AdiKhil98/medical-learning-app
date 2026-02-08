-- ============================================
-- MIGRATION: 5-Day Free Trial System
-- Date: 2026-01-23
-- Purpose: Replace "3 free simulations" model with "5-day unlimited trial"
--
-- Business Rules:
-- - New users get 5-day trial on signup (auto-activated)
-- - Trial = unlimited simulations for 5 days
-- - After trial expires = simulations locked (other content accessible)
-- - Existing free users get 5-day trial starting now
-- - Paid users keep their current subscription (unchanged)
-- - One trial per user (has_used_trial flag prevents abuse)
-- ============================================

-- ============================================
-- PART 1: ADD TRIAL COLUMNS TO USERS TABLE
-- ============================================

-- Add trial tracking columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE;

-- Create index for trial expiry lookups
CREATE INDEX IF NOT EXISTS idx_users_trial_expires_at ON users(trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_has_used_trial ON users(has_used_trial);

COMMENT ON COLUMN users.trial_started_at IS 'Timestamp when the 5-day trial period started';
COMMENT ON COLUMN users.trial_expires_at IS 'Timestamp when the 5-day trial period expires';
COMMENT ON COLUMN users.has_used_trial IS 'Flag to prevent trial reactivation (one trial per user)';

-- ============================================
-- PART 2: UPDATE SUBSCRIPTION TIER CONSTRAINTS
-- ============================================

-- Update user_simulation_quota constraint to include 'trial'
DO $$
BEGIN
  -- Drop existing constraint
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'user_simulation_quota_subscription_tier_check') THEN
    ALTER TABLE user_simulation_quota DROP CONSTRAINT user_simulation_quota_subscription_tier_check;
  END IF;
END $$;

-- Add new constraint with 'trial' included
ALTER TABLE user_simulation_quota
ADD CONSTRAINT user_simulation_quota_subscription_tier_check
CHECK (subscription_tier IN ('free', 'trial', 'basic', 'premium'));

COMMENT ON CONSTRAINT user_simulation_quota_subscription_tier_check ON user_simulation_quota IS
'Valid subscription tiers: free, trial, basic, premium';

-- Update users table constraint to include 'trial'
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find and drop the existing constraint
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'users'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%subscription_tier%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped existing users subscription_tier constraint: %', constraint_name;
  END IF;
END $$;

-- Add new constraint with 'trial' included
ALTER TABLE users
ADD CONSTRAINT users_subscription_tier_check
CHECK (subscription_tier IS NULL OR subscription_tier IN ('free', 'trial', 'basic', 'premium'));

COMMENT ON CONSTRAINT users_subscription_tier_check ON users IS
'Valid subscription tiers: NULL (no sub), free, trial, basic, premium';

-- ============================================
-- PART 3: UPDATE get_tier_simulation_limit FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_tier_simulation_limit(tier text)
RETURNS integer AS $$
BEGIN
  RETURN CASE tier
    WHEN 'trial' THEN -1    -- NEW: Unlimited during trial
    WHEN 'free' THEN 0      -- CHANGED: No simulations after trial (was 3)
    WHEN 'basic' THEN 30
    WHEN 'premium' THEN 60
    -- Legacy tier names for backward compatibility
    WHEN 'basis' THEN 30
    WHEN 'profi' THEN 60
    ELSE 0                  -- Default to no access (was 3)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_tier_simulation_limit IS
'Returns simulation limit for subscription tier.
Trial: unlimited (-1), Free: 0 (locked), Basic: 30/month, Premium: 60/month.';

-- ============================================
-- PART 4: CREATE initialize_trial_period FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION initialize_trial_period(
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_user_record RECORD;
  v_trial_start TIMESTAMPTZ;
  v_trial_end TIMESTAMPTZ;
  v_quota_record user_simulation_quota;
BEGIN
  -- Check if user exists
  SELECT * INTO v_user_record
  FROM users
  WHERE id = p_user_id;

  IF v_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if user already used trial
  IF v_user_record.has_used_trial = true THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Trial already used',
      'message', 'Sie haben Ihre Testphase bereits genutzt.'
    );
  END IF;

  -- Check if user has active paid subscription
  IF v_user_record.subscription_status = 'active'
     AND v_user_record.subscription_tier IN ('basic', 'premium') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Has active subscription',
      'message', 'Sie haben bereits ein aktives Abonnement.'
    );
  END IF;

  -- Set trial period (5 days from now)
  v_trial_start := NOW();
  v_trial_end := NOW() + INTERVAL '5 days';

  -- Update users table with trial info
  UPDATE users
  SET
    trial_started_at = v_trial_start,
    trial_expires_at = v_trial_end,
    has_used_trial = true,
    subscription_tier = 'trial',
    subscription_status = 'on_trial',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Create or update quota record for trial period
  INSERT INTO user_simulation_quota (
    user_id,
    subscription_tier,
    total_simulations,
    simulations_used,
    period_start,
    period_end
  ) VALUES (
    p_user_id,
    'trial',
    -1,  -- Unlimited
    0,
    v_trial_start,
    v_trial_end
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
  SET
    subscription_tier = 'trial',
    total_simulations = -1,
    period_end = v_trial_end,
    updated_at = NOW()
  RETURNING * INTO v_quota_record;

  RETURN json_build_object(
    'success', true,
    'message', 'Trial period activated',
    'trial_started_at', v_trial_start,
    'trial_expires_at', v_trial_end,
    'days_remaining', 5,
    'quota', json_build_object(
      'total_simulations', -1,
      'simulations_used', 0,
      'period_start', v_trial_start,
      'period_end', v_trial_end
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_trial_period TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_trial_period TO service_role;

COMMENT ON FUNCTION initialize_trial_period IS
'Activates a 5-day trial period for a user. One trial per user.
Creates quota record with unlimited simulations for 5 days.';

-- ============================================
-- PART 5: CREATE get_trial_status FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_trial_status(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_user RECORD;
  v_days_remaining integer;
  v_hours_remaining integer;
  v_is_active boolean;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;

  IF v_user IS NULL THEN
    RETURN json_build_object(
      'has_trial', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if user has used trial
  IF v_user.has_used_trial = false OR v_user.trial_expires_at IS NULL THEN
    RETURN json_build_object(
      'has_trial', false,
      'trial_available', NOT COALESCE(v_user.has_used_trial, false),
      'message', 'Keine aktive Testphase'
    );
  END IF;

  -- Calculate remaining time
  v_is_active := v_user.trial_expires_at > NOW();

  IF v_is_active THEN
    v_days_remaining := EXTRACT(DAY FROM (v_user.trial_expires_at - NOW()))::integer;
    v_hours_remaining := EXTRACT(HOUR FROM (v_user.trial_expires_at - NOW()))::integer;

    -- Ensure at least 1 day shows if there's time remaining
    IF v_days_remaining = 0 AND v_hours_remaining > 0 THEN
      v_days_remaining := 1;
    END IF;
  ELSE
    v_days_remaining := 0;
    v_hours_remaining := 0;
  END IF;

  RETURN json_build_object(
    'has_trial', true,
    'is_active', v_is_active,
    'trial_started_at', v_user.trial_started_at,
    'trial_expires_at', v_user.trial_expires_at,
    'days_remaining', v_days_remaining,
    'hours_remaining', v_hours_remaining,
    'message', CASE
      WHEN NOT v_is_active THEN 'Testphase abgelaufen'
      WHEN v_days_remaining = 1 THEN '1 Tag verbleibend'
      WHEN v_days_remaining > 1 THEN format('%s Tage verbleibend', v_days_remaining)
      ELSE 'Weniger als 1 Tag verbleibend'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_trial_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_status TO service_role;

COMMENT ON FUNCTION get_trial_status IS
'Returns the trial status for a user including days remaining.';

-- ============================================
-- PART 6: UPDATE can_start_simulation FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION can_start_simulation(
  p_user_id uuid,
  p_current_time timestamptz DEFAULT NOW()
)
RETURNS json AS $$
DECLARE
  v_user RECORD;
  v_quota user_simulation_quota;
  v_trial_status json;
  v_days_remaining integer;
BEGIN
  -- Get user info
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;

  -- ========================================
  -- CHECK 1: Is user on active trial?
  -- ========================================
  IF v_user.trial_expires_at IS NOT NULL AND v_user.trial_expires_at > p_current_time THEN
    -- Calculate days remaining
    v_days_remaining := GREATEST(1, EXTRACT(DAY FROM (v_user.trial_expires_at - p_current_time))::integer);

    -- Trial is active - unlimited access
    RETURN json_build_object(
      'can_start', true,
      'reason', 'trial_active',
      'message', format('%s Tage Testphase verbleibend', v_days_remaining),
      'simulations_remaining', -1,
      'simulations_used', 0,
      'total_simulations', -1,
      'is_trial', true,
      'trial_expires_at', v_user.trial_expires_at,
      'days_remaining', v_days_remaining
    );
  END IF;

  -- ========================================
  -- CHECK 2: Has trial expired? (User was on trial but it's over)
  -- ========================================
  IF v_user.has_used_trial = true
     AND v_user.trial_expires_at IS NOT NULL
     AND v_user.trial_expires_at <= p_current_time
     AND (v_user.subscription_status IS NULL OR v_user.subscription_status NOT IN ('active')) THEN
    -- Trial expired, no active subscription
    RETURN json_build_object(
      'can_start', false,
      'reason', 'trial_expired',
      'message', 'Ihre Testphase ist abgelaufen. Upgraden Sie jetzt für unbegrenzten Zugang!',
      'simulations_remaining', 0,
      'simulations_used', 0,
      'total_simulations', 0,
      'is_trial', false,
      'trial_expired', true
    );
  END IF;

  -- ========================================
  -- CHECK 3: Has active paid subscription?
  -- ========================================
  IF v_user.subscription_status = 'active' AND v_user.subscription_tier IN ('basic', 'premium') THEN
    -- Get quota for paid subscription
    SELECT * INTO v_quota
    FROM user_simulation_quota
    WHERE user_id = p_user_id
      AND period_start <= p_current_time
      AND period_end > p_current_time
      AND subscription_tier IN ('basic', 'premium')
    ORDER BY period_start DESC
    LIMIT 1;

    -- If no quota record, create one
    IF v_quota IS NULL THEN
      v_quota := initialize_user_quota(
        p_user_id,
        v_user.subscription_tier,
        date_trunc('month', p_current_time),
        date_trunc('month', p_current_time) + INTERVAL '1 month'
      );
    END IF;

    -- Check quota
    IF v_quota.simulations_remaining > 0 OR v_quota.total_simulations = -1 THEN
      RETURN json_build_object(
        'can_start', true,
        'reason', 'has_quota',
        'message', format('%s von %s Simulationen verfügbar', v_quota.simulations_remaining, v_quota.total_simulations),
        'simulations_remaining', v_quota.simulations_remaining,
        'simulations_used', v_quota.simulations_used,
        'total_simulations', v_quota.total_simulations,
        'is_trial', false
      );
    ELSE
      RETURN json_build_object(
        'can_start', false,
        'reason', 'quota_exceeded',
        'message', format('Simulationslimit erreicht (%s/%s). Upgraden Sie für mehr Simulationen.',
          v_quota.simulations_used, v_quota.total_simulations),
        'simulations_remaining', 0,
        'simulations_used', v_quota.simulations_used,
        'total_simulations', v_quota.total_simulations,
        'is_trial', false
      );
    END IF;
  END IF;

  -- ========================================
  -- CHECK 4: New user who hasn't started trial yet
  -- ========================================
  IF v_user.has_used_trial = false OR v_user.has_used_trial IS NULL THEN
    -- Auto-initialize trial for new users
    PERFORM initialize_trial_period(p_user_id);

    -- Return trial active response
    RETURN json_build_object(
      'can_start', true,
      'reason', 'trial_started',
      'message', '5 Tage Testphase gestartet!',
      'simulations_remaining', -1,
      'simulations_used', 0,
      'total_simulations', -1,
      'is_trial', true,
      'trial_expires_at', NOW() + INTERVAL '5 days',
      'days_remaining', 5
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
    'is_trial', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_start_simulation IS
'Checks if a user can start a simulation.
Priority: 1) Active trial 2) Trial expired 3) Paid subscription 4) New user (auto-start trial) 5) No access';

-- ============================================
-- PART 7: UPDATE get_user_quota_status FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_user_quota_status(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_user RECORD;
  v_quota user_simulation_quota;
  v_days_remaining integer;
BEGIN
  -- Get user info
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;

  IF v_user IS NULL THEN
    RETURN json_build_object(
      'has_quota', false,
      'message', 'Benutzer nicht gefunden'
    );
  END IF;

  -- Check if user is on active trial
  IF v_user.trial_expires_at IS NOT NULL AND v_user.trial_expires_at > NOW() THEN
    v_days_remaining := GREATEST(1, EXTRACT(DAY FROM (v_user.trial_expires_at - NOW()))::integer);

    RETURN json_build_object(
      'has_quota', true,
      'subscription_tier', 'trial',
      'total_simulations', -1,
      'simulations_used', 0,
      'simulations_remaining', -1,
      'is_unlimited', true,
      'is_trial', true,
      'trial_expires_at', v_user.trial_expires_at,
      'days_remaining', v_days_remaining,
      'period_start', v_user.trial_started_at,
      'period_end', v_user.trial_expires_at,
      'usage_text', format('%s Tage Testphase verbleibend', v_days_remaining)
    );
  END IF;

  -- Check if trial expired
  IF v_user.has_used_trial = true AND v_user.trial_expires_at IS NOT NULL AND v_user.trial_expires_at <= NOW() THEN
    -- Check for paid subscription
    IF v_user.subscription_status != 'active' OR v_user.subscription_tier NOT IN ('basic', 'premium') THEN
      RETURN json_build_object(
        'has_quota', false,
        'subscription_tier', 'expired_trial',
        'total_simulations', 0,
        'simulations_used', 0,
        'simulations_remaining', 0,
        'is_unlimited', false,
        'is_trial', false,
        'trial_expired', true,
        'usage_text', 'Testphase abgelaufen',
        'message', 'Ihre Testphase ist abgelaufen. Upgraden Sie jetzt!'
      );
    END IF;
  END IF;

  -- Get current active quota for paid users
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id
    AND period_start <= NOW()
    AND period_end > NOW()
    AND subscription_tier IN ('basic', 'premium')
  ORDER BY period_start DESC
  LIMIT 1;

  -- No quota found
  IF v_quota IS NULL THEN
    RETURN json_build_object(
      'has_quota', false,
      'message', 'Keine aktive Quota gefunden'
    );
  END IF;

  -- Return quota status for paid users
  RETURN json_build_object(
    'has_quota', true,
    'subscription_tier', v_quota.subscription_tier,
    'total_simulations', v_quota.total_simulations,
    'simulations_used', v_quota.simulations_used,
    'simulations_remaining', v_quota.simulations_remaining,
    'is_unlimited', v_quota.total_simulations = -1,
    'is_trial', false,
    'period_start', v_quota.period_start,
    'period_end', v_quota.period_end,
    'usage_text', CASE
      WHEN v_quota.total_simulations = -1 THEN 'Unbegrenzt'
      ELSE format('%s / %s', v_quota.simulations_used, v_quota.total_simulations)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_quota_status IS
'Returns comprehensive quota status for a user including trial information.';

-- ============================================
-- PART 8: CREATE cancel_trial_on_subscription FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION cancel_trial_on_subscription(
  p_user_id uuid,
  p_new_tier text
)
RETURNS json AS $$
BEGIN
  -- When user subscribes, we don't need to do anything special
  -- The trial naturally becomes irrelevant once they have an active subscription
  -- Just update the user's subscription info (handled by webhook)

  UPDATE users
  SET
    subscription_tier = p_new_tier,
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', format('Subscription activated: %s tier', p_new_tier)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_trial_on_subscription TO service_role;

COMMENT ON FUNCTION cancel_trial_on_subscription IS
'Called when a user subscribes during trial. Updates subscription status.';

-- ============================================
-- PART 9: MIGRATE EXISTING USERS TO TRIAL
-- ============================================

-- Give all existing users who are NOT paid subscribers a 5-day trial starting now
-- This respects existing paid subscriptions

DO $$
DECLARE
  v_migrated_count integer := 0;
  v_skipped_paid integer := 0;
  v_trial_start TIMESTAMPTZ := NOW();
  v_trial_end TIMESTAMPTZ := NOW() + INTERVAL '5 days';
BEGIN
  -- Update all users who don't have an active paid subscription
  UPDATE users
  SET
    trial_started_at = v_trial_start,
    trial_expires_at = v_trial_end,
    has_used_trial = true,
    subscription_tier = 'trial',
    subscription_status = 'on_trial'
  WHERE
    -- Not a paid subscriber
    (subscription_status IS NULL OR subscription_status NOT IN ('active'))
    OR (subscription_tier IS NULL OR subscription_tier NOT IN ('basic', 'premium'));

  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;

  -- Count paid users that were skipped
  SELECT COUNT(*) INTO v_skipped_paid
  FROM users
  WHERE subscription_status = 'active'
    AND subscription_tier IN ('basic', 'premium');

  -- Create quota records for all migrated users
  INSERT INTO user_simulation_quota (
    user_id,
    subscription_tier,
    total_simulations,
    simulations_used,
    period_start,
    period_end
  )
  SELECT
    id,
    'trial',
    -1,  -- Unlimited
    0,
    v_trial_start,
    v_trial_end
  FROM users
  WHERE trial_started_at = v_trial_start
    AND trial_expires_at = v_trial_end
  ON CONFLICT (user_id, period_start) DO UPDATE
  SET
    subscription_tier = 'trial',
    total_simulations = -1,
    period_end = v_trial_end,
    updated_at = NOW();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed!';
  RAISE NOTICE 'Users migrated to 5-day trial: %', v_migrated_count;
  RAISE NOTICE 'Paid users preserved (skipped): %', v_skipped_paid;
  RAISE NOTICE 'Trial period: % to %', v_trial_start, v_trial_end;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- PART 10: CREATE TRIGGER FOR AUTO-TRIAL ON SIGNUP
-- ============================================

-- Function to auto-initialize trial for new users
CREATE OR REPLACE FUNCTION trigger_auto_initialize_trial()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for new users (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Set trial fields directly in the INSERT
    NEW.trial_started_at := NOW();
    NEW.trial_expires_at := NOW() + INTERVAL '5 days';
    NEW.has_used_trial := true;
    NEW.subscription_tier := 'trial';
    NEW.subscription_status := 'on_trial';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_auto_initialize_trial ON users;

-- Create trigger for new user signups
CREATE TRIGGER trg_auto_initialize_trial
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_initialize_trial();

COMMENT ON FUNCTION trigger_auto_initialize_trial IS
'Automatically initializes 5-day trial for new users on signup.';

-- ============================================
-- PART 11: CREATE FUNCTION FOR AFTER INSERT QUOTA CREATION
-- ============================================

CREATE OR REPLACE FUNCTION trigger_create_trial_quota_after_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create quota record for the new user's trial
  INSERT INTO user_simulation_quota (
    user_id,
    subscription_tier,
    total_simulations,
    simulations_used,
    period_start,
    period_end
  ) VALUES (
    NEW.id,
    'trial',
    -1,  -- Unlimited
    0,
    NEW.trial_started_at,
    NEW.trial_expires_at
  )
  ON CONFLICT (user_id, period_start) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_create_trial_quota_after_user ON users;

-- Create trigger
CREATE TRIGGER trg_create_trial_quota_after_user
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_trial_quota_after_user();

COMMENT ON FUNCTION trigger_create_trial_quota_after_user IS
'Creates trial quota record after new user is inserted.';

-- ============================================
-- PART 12: GRANT PERMISSIONS
-- ============================================

-- Ensure all functions have proper permissions
GRANT EXECUTE ON FUNCTION get_tier_simulation_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_start_simulation TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quota_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_status TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_trial_period TO authenticated, service_role;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_trial_users integer;
  v_paid_users integer;
  v_total_users integer;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM users;
  SELECT COUNT(*) INTO v_trial_users FROM users WHERE subscription_status = 'on_trial';
  SELECT COUNT(*) INTO v_paid_users FROM users WHERE subscription_status = 'active' AND subscription_tier IN ('basic', 'premium');

  RAISE NOTICE '========================================';
  RAISE NOTICE '5-DAY TRIAL SYSTEM MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', v_total_users;
  RAISE NOTICE 'Users on trial: %', v_trial_users;
  RAISE NOTICE 'Paid users: %', v_paid_users;
  RAISE NOTICE '';
  RAISE NOTICE 'New behavior:';
  RAISE NOTICE '  - New users get 5-day trial automatically';
  RAISE NOTICE '  - Trial = unlimited simulations';
  RAISE NOTICE '  - After trial = simulations locked';
  RAISE NOTICE '  - Bibliothek/Audio still accessible';
  RAISE NOTICE '========================================';
END $$;
