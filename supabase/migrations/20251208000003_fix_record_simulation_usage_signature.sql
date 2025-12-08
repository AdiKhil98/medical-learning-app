-- Migration: Fix record_simulation_usage function signature to match table column type
-- Date: 2025-12-08
-- Purpose: Fix type mismatch causing "function does not exist" error
--
-- Problem: simulation_usage_logs.session_token is TEXT but function expects UUID
-- Solution: Change function parameter from UUID to TEXT

CREATE OR REPLACE FUNCTION record_simulation_usage(
  p_session_token text,  -- Changed from uuid to text to match table column
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
'Records simulation usage and atomically increments counter. Parameter session_token is TEXT to match table column type.';

GRANT EXECUTE ON FUNCTION record_simulation_usage TO service_role;

COMMIT;
