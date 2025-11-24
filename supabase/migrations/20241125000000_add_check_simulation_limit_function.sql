-- Migration: Add check_simulation_limit_before_start function
-- Purpose: Check if user can start a simulation based on subscription limits
-- Date: 2024-11-25

-- Create function to check simulation limit before starting
CREATE OR REPLACE FUNCTION check_simulation_limit_before_start(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_used integer;
  v_remaining integer;
  v_free_used integer;
  v_is_free_tier boolean;
BEGIN
  -- Get user's subscription information
  SELECT
    COALESCE(subscription_tier, ''),
    simulation_limit,
    simulations_used_this_month,
    free_simulations_used
  INTO
    v_tier,
    v_limit,
    v_used,
    v_free_used
  FROM users
  WHERE id = p_user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_start', false,
      'remaining', 0,
      'total_limit', 0,
      'used_count', 0,
      'reason', 'Benutzer nicht gefunden'
    );
  END IF;

  -- Determine if free tier (no subscription or empty tier)
  v_is_free_tier := (v_tier IS NULL OR v_tier = '');

  IF v_is_free_tier THEN
    -- Free tier: 5 simulations limit, using free_simulations_used
    v_limit := 5;
    v_used := COALESCE(v_free_used, 0);
    v_remaining := GREATEST(0, v_limit - v_used);

    -- Check if limit reached
    IF v_remaining = 0 THEN
      RETURN json_build_object(
        'can_start', false,
        'remaining', 0,
        'total_limit', v_limit,
        'used_count', v_used,
        'reason', 'Kostenloser Plan: Limit erreicht (5 Simulationen pro Monat). Upgrade für mehr Simulationen.'
      );
    END IF;

    RETURN json_build_object(
      'can_start', true,
      'remaining', v_remaining,
      'total_limit', v_limit,
      'used_count', v_used,
      'reason', format('Kostenloser Plan: %s von %s Simulationen verfügbar', v_remaining, v_limit)
    );

  ELSIF v_tier = 'unlimited' THEN
    -- Unlimited tier: always allow
    RETURN json_build_object(
      'can_start', true,
      'remaining', 999999,
      'total_limit', 999999,
      'used_count', COALESCE(v_used, 0),
      'reason', 'Unbegrenzter Zugriff'
    );

  ELSE
    -- Paid tier (basis, profi, or custom): use simulation_limit and simulations_used_this_month
    -- Handle NULL limit (should not happen, but fallback to 30)
    v_limit := COALESCE(v_limit, 30);
    v_used := COALESCE(v_used, 0);
    v_remaining := GREATEST(0, v_limit - v_used);

    -- Check if limit reached
    IF v_remaining = 0 THEN
      RETURN json_build_object(
        'can_start', false,
        'remaining', 0,
        'total_limit', v_limit,
        'used_count', v_used,
        'reason', format('Limit erreicht (%s/%s Simulationen verwendet). Kontaktieren Sie Support für mehr.', v_used, v_limit)
      );
    END IF;

    RETURN json_build_object(
      'can_start', true,
      'remaining', v_remaining,
      'total_limit', v_limit,
      'used_count', v_used,
      'reason', format('%s/%s Simulationen verfügbar', v_remaining, v_limit)
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'can_start', false,
      'remaining', 0,
      'total_limit', 0,
      'used_count', 0,
      'reason', format('Fehler: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_simulation_limit_before_start IS 'Checks if user can start a simulation based on their subscription tier and usage limits';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_simulation_limit_before_start(uuid) TO authenticated;
