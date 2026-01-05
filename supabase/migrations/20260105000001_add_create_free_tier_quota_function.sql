-- Create function to initialize free tier quota (bypasses RLS)
CREATE OR REPLACE FUNCTION create_free_tier_quota(
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_existing_quota user_simulation_quota;
BEGIN
  -- Check if quota already exists
  SELECT * INTO v_existing_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id
  LIMIT 1;

  v_period_start := NOW();
  v_period_end := NOW() + INTERVAL '1 month';

  IF v_existing_quota IS NOT NULL THEN
    -- Update existing quota to free tier
    UPDATE user_simulation_quota
    SET
      subscription_tier = 'free',
      total_simulations = 3,
      simulations_used = 0,
      period_start = v_period_start,
      period_end = v_period_end,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN json_build_object(
      'success', true,
      'action', 'updated',
      'quota', json_build_object(
        'total_simulations', 3,
        'simulations_used', 0,
        'period_start', v_period_start,
        'period_end', v_period_end
      )
    );
  ELSE
    -- Create new quota record
    INSERT INTO user_simulation_quota (
      user_id,
      subscription_tier,
      total_simulations,
      simulations_used,
      period_start,
      period_end
    ) VALUES (
      p_user_id,
      'free',
      3,
      0,
      v_period_start,
      v_period_end
    );

    RETURN json_build_object(
      'success', true,
      'action', 'created',
      'quota', json_build_object(
        'total_simulations', 3,
        'simulations_used', 0,
        'period_start', v_period_start,
        'period_end', v_period_end
      )
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_free_tier_quota TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION create_free_tier_quota IS 'Creates or updates free tier quota for a user. Bypasses RLS to allow user self-service free tier activation.';
