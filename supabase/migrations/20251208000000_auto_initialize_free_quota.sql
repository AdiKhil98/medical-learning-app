-- Migration: Auto-initialize free tier quota for users without quota records
-- Date: 2025-12-08
-- Purpose: Fix issue where new users or users without quotas can't start simulations
--
-- Problem: The quota system blocks users who don't have a quota record
-- Solution: Auto-initialize a free tier quota (5 simulations) if none exists

-- Update can_start_simulation to auto-initialize free quota if missing
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

    -- Initialize free tier quota (5 simulations per month)
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
'Checks if a user can start a new simulation. Auto-initializes free tier quota (5 simulations/month) if none exists. Returns JSON with can_start boolean and details.';

-- Verification: This query should now work for any user, even without a quota
-- SELECT * FROM can_start_simulation('ANY_USER_UUID_HERE');

COMMIT;
