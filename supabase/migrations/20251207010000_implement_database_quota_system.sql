-- ============================================
-- MIGRATION: Database-Driven Simulation Quota System
-- Date: 2025-12-07
-- Purpose: Move simulation counting logic entirely to database
-- ============================================

-- ============================================
-- PART 1: CREATE USER QUOTA TABLE
-- ============================================
-- This table is the single source of truth for simulation quotas

CREATE TABLE IF NOT EXISTS user_simulation_quota (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Subscription information
  subscription_tier text NOT NULL CHECK (subscription_tier IN ('free', 'basis', 'profi', 'unlimited')),

  -- Quota tracking
  total_simulations integer NOT NULL, -- Based on subscription tier
  simulations_used integer DEFAULT 0 CHECK (simulations_used >= 0),
  simulations_remaining integer GENERATED ALWAYS AS (
    CASE
      WHEN total_simulations = -1 THEN -1 -- Unlimited
      ELSE total_simulations - simulations_used
    END
  ) STORED,

  -- Billing period tracking
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, period_start),
  CHECK (period_end > period_start),
  CHECK (total_simulations = -1 OR total_simulations >= 0) -- -1 for unlimited, >= 0 for others
);

-- Create index for fast user lookups
CREATE INDEX idx_user_simulation_quota_user_id ON user_simulation_quota(user_id);
CREATE INDEX idx_user_simulation_quota_period ON user_simulation_quota(user_id, period_start, period_end);

-- Add helpful comment
COMMENT ON TABLE user_simulation_quota IS
'Single source of truth for user simulation quotas. Manages total simulations, usage, and billing periods.';

-- ============================================
-- PART 2: CREATE FUNCTION TO GET TIER LIMITS
-- ============================================

CREATE OR REPLACE FUNCTION get_tier_simulation_limit(tier text)
RETURNS integer AS $$
BEGIN
  RETURN CASE tier
    WHEN 'free' THEN 5
    WHEN 'basis' THEN 20
    WHEN 'profi' THEN 100
    WHEN 'unlimited' THEN -1
    ELSE 5 -- Default to free tier
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_tier_simulation_limit IS
'Returns the simulation limit for a given subscription tier. -1 means unlimited.';

-- ============================================
-- PART 3: INITIALIZE OR UPDATE USER QUOTA
-- ============================================

CREATE OR REPLACE FUNCTION initialize_user_quota(
  p_user_id uuid,
  p_subscription_tier text,
  p_period_start timestamptz DEFAULT NOW(),
  p_period_end timestamptz DEFAULT (NOW() + INTERVAL '1 month')
)
RETURNS user_simulation_quota AS $$
DECLARE
  v_total_simulations integer;
  v_quota_record user_simulation_quota;
BEGIN
  -- Get tier limit
  v_total_simulations := get_tier_simulation_limit(p_subscription_tier);

  -- Insert or update quota record
  INSERT INTO user_simulation_quota (
    user_id,
    subscription_tier,
    total_simulations,
    simulations_used,
    period_start,
    period_end
  ) VALUES (
    p_user_id,
    p_subscription_tier,
    v_total_simulations,
    0, -- Start with 0 used
    p_period_start,
    p_period_end
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
  SET
    subscription_tier = EXCLUDED.subscription_tier,
    total_simulations = EXCLUDED.total_simulations,
    updated_at = NOW()
  RETURNING * INTO v_quota_record;

  RETURN v_quota_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION initialize_user_quota IS
'Initializes or updates a user quota record for a billing period. Called when subscription changes.';

-- ============================================
-- PART 4: CHECK IF USER CAN START SIMULATION
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

  -- If no quota record exists, user needs to subscribe
  IF v_quota IS NULL THEN
    RETURN json_build_object(
      'can_start', false,
      'reason', 'no_subscription',
      'message', 'Bitte wählen Sie einen Tarif, um Simulationen zu nutzen.'
    );
  END IF;

  -- Unlimited tier can always start
  IF v_quota.total_simulations = -1 THEN
    RETURN json_build_object(
      'can_start', true,
      'reason', 'unlimited',
      'message', 'Unbegrenzter Zugang',
      'simulations_remaining', -1,
      'simulations_used', v_quota.simulations_used
    );
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
'Checks if a user can start a new simulation based on their quota. Returns JSON with can_start boolean and details.';

-- ============================================
-- PART 5: RECORD SIMULATION USAGE
-- ============================================

CREATE OR REPLACE FUNCTION record_simulation_usage(
  p_session_token uuid,
  p_user_id uuid,
  p_simulation_type text,
  p_counted_toward_usage boolean DEFAULT true
)
RETURNS json AS $$
DECLARE
  v_quota user_simulation_quota;
  v_updated_quota user_simulation_quota;
BEGIN
  -- Only increment if counted toward usage
  IF NOT p_counted_toward_usage THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Simulation not counted (duration too short)',
      'quota_updated', false
    );
  END IF;

  -- Get current quota
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id
    AND period_start <= NOW()
    AND period_end > NOW()
  ORDER BY period_start DESC
  LIMIT 1;

  -- If no quota found, cannot record usage
  IF v_quota IS NULL THEN
    RAISE EXCEPTION 'No active quota found for user %', p_user_id;
  END IF;

  -- Skip increment for unlimited tier
  IF v_quota.total_simulations = -1 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Unlimited tier - quota not decremented',
      'quota_updated', false,
      'simulations_remaining', -1
    );
  END IF;

  -- Increment simulations_used atomically
  UPDATE user_simulation_quota
  SET
    simulations_used = simulations_used + 1,
    updated_at = NOW()
  WHERE id = v_quota.id
  RETURNING * INTO v_updated_quota;

  RETURN json_build_object(
    'success', true,
    'message', 'Simulation counted',
    'quota_updated', true,
    'simulations_used', v_updated_quota.simulations_used,
    'simulations_remaining', v_updated_quota.simulations_remaining,
    'total_simulations', v_updated_quota.total_simulations
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_simulation_usage IS
'Records a simulation usage and atomically increments the simulations_used counter. Only counts if session was long enough.';

-- ============================================
-- PART 6: TRIGGER TO AUTO-UPDATE QUOTA ON SIMULATION END
-- ============================================

CREATE OR REPLACE FUNCTION trigger_update_quota_on_simulation_end()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when a simulation is being ended (ended_at is set from NULL to a value)
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
    -- Only count if counted_toward_usage is true
    IF NEW.counted_toward_usage = true THEN
      PERFORM record_simulation_usage(
        NEW.session_token,
        NEW.user_id,
        NEW.simulation_type,
        NEW.counted_toward_usage
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on simulation_usage_logs
DROP TRIGGER IF EXISTS trg_update_quota_on_simulation_end ON simulation_usage_logs;
CREATE TRIGGER trg_update_quota_on_simulation_end
  AFTER UPDATE ON simulation_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quota_on_simulation_end();

COMMENT ON FUNCTION trigger_update_quota_on_simulation_end IS
'Trigger function that automatically updates quota when a simulation ends.';

-- ============================================
-- PART 7: FUNCTION TO GET USER QUOTA STATUS
-- ============================================

CREATE OR REPLACE FUNCTION get_user_quota_status(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_quota user_simulation_quota;
BEGIN
  -- Get current active quota
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id
    AND period_start <= NOW()
    AND period_end > NOW()
  ORDER BY period_start DESC
  LIMIT 1;

  -- No quota found
  IF v_quota IS NULL THEN
    RETURN json_build_object(
      'has_quota', false,
      'message', 'Keine aktive Quota gefunden'
    );
  END IF;

  -- Return quota status
  RETURN json_build_object(
    'has_quota', true,
    'subscription_tier', v_quota.subscription_tier,
    'total_simulations', v_quota.total_simulations,
    'simulations_used', v_quota.simulations_used,
    'simulations_remaining', v_quota.simulations_remaining,
    'is_unlimited', v_quota.total_simulations = -1,
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
'Returns comprehensive quota status for a user in JSON format.';

-- ============================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on the quota table
ALTER TABLE user_simulation_quota ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own quota
CREATE POLICY "Users can view their own quota"
  ON user_simulation_quota
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all quotas
CREATE POLICY "Service role can manage all quotas"
  ON user_simulation_quota
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- PART 9: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_tier_simulation_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_start_simulation TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quota_status TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_quota TO service_role;
GRANT EXECUTE ON FUNCTION record_simulation_usage TO service_role;

-- Grant table access
GRANT SELECT ON user_simulation_quota TO authenticated;
GRANT ALL ON user_simulation_quota TO service_role;

-- ============================================
-- PART 10: HELPER FUNCTION FOR SUBSCRIPTION CHANGES
-- ============================================

CREATE OR REPLACE FUNCTION handle_subscription_change(
  p_user_id uuid,
  p_new_tier text
)
RETURNS json AS $$
DECLARE
  v_current_period_start timestamptz;
  v_current_period_end timestamptz;
  v_result user_simulation_quota;
BEGIN
  -- Determine billing period (monthly)
  v_current_period_start := date_trunc('month', NOW());
  v_current_period_end := v_current_period_start + INTERVAL '1 month';

  -- Initialize or update quota
  v_result := initialize_user_quota(
    p_user_id,
    p_new_tier,
    v_current_period_start,
    v_current_period_end
  );

  RETURN json_build_object(
    'success', true,
    'message', format('Quota updated to %s tier', p_new_tier),
    'quota', row_to_json(v_result)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION handle_subscription_change TO service_role;

COMMENT ON FUNCTION handle_subscription_change IS
'Called when a user subscription changes. Updates their quota for the current billing period.';

-- ============================================
-- PART 11: INITIALIZE QUOTAS FOR EXISTING USERS
-- ============================================

-- This will be run manually or via a separate migration to backfill data
-- For now, we just create the function

CREATE OR REPLACE FUNCTION backfill_user_quotas()
RETURNS json AS $$
DECLARE
  v_user_record RECORD;
  v_count integer := 0;
BEGIN
  -- For each user, create a quota record based on their current subscription
  FOR v_user_record IN
    SELECT DISTINCT user_id
    FROM simulation_usage_logs
  LOOP
    -- Initialize with free tier as default (you can customize this)
    PERFORM initialize_user_quota(
      v_user_record.user_id,
      'free', -- Default tier, should be updated based on actual subscriptions
      date_trunc('month', NOW()),
      date_trunc('month', NOW()) + INTERVAL '1 month'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'users_processed', v_count,
    'message', format('Initialized quotas for %s users', v_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION backfill_user_quotas TO service_role;

COMMENT ON FUNCTION backfill_user_quotas IS
'Backfills quota records for existing users. Run once after migration.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tier limits
-- SELECT * FROM get_tier_simulation_limit('free');
-- SELECT * FROM get_tier_simulation_limit('basis');
-- SELECT * FROM get_tier_simulation_limit('profi');
-- SELECT * FROM get_tier_simulation_limit('unlimited');

-- Check if a user can start simulation
-- SELECT * FROM can_start_simulation('USER_UUID_HERE');

-- Get user quota status
-- SELECT * FROM get_user_quota_status('USER_UUID_HERE');

-- Manually initialize a user quota
-- SELECT * FROM initialize_user_quota('USER_UUID_HERE', 'basis');

-- Backfill all user quotas (run once)
-- SELECT * FROM backfill_user_quotas();

COMMIT;
