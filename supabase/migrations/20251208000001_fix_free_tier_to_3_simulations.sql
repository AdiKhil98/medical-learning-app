-- Migration: Fix free tier limit from 5 to 3 simulations
-- Date: 2025-12-08
-- Purpose: Correct free tier to match original system (3 simulations/month)
--
-- Original system: 3 simulations (lifetime)
-- New system: 3 simulations (per month) - maintains same initial limit

-- Fix the tier limit function
CREATE OR REPLACE FUNCTION get_tier_simulation_limit(tier text)
RETURNS integer AS $$
BEGIN
  RETURN CASE tier
    WHEN 'free' THEN 3      -- Fixed: was 5, should be 3
    WHEN 'basis' THEN 20
    WHEN 'profi' THEN 100
    WHEN 'unlimited' THEN -1
    ELSE 3                  -- Fixed: default was 5, should be 3
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_tier_simulation_limit IS
'Returns the simulation limit for a given subscription tier. Free tier: 3/month, Basis: 20/month, Profi: 100/month, Unlimited: -1 (unlimited).';

-- Update the can_start_simulation function to use correct limit
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
'Checks if a user can start a new simulation. Auto-initializes free tier quota (3 simulations/month) if none exists. Returns JSON with can_start boolean and details.';

COMMIT;
