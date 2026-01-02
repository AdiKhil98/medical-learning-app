-- ============================================
-- ADD LAZY RESET TO SIMULATION QUOTA CHECK
-- Date: 2026-01-01
-- ============================================
--
-- PURPOSE:
-- - Add automatic period rollover when user's billing period expires
-- - Ensures simulations reset even if webhook is delayed/missed
-- - Syncs with individual user billing cycles, not calendar months

CREATE OR REPLACE FUNCTION can_start_simulation(
  p_user_id uuid,
  p_current_time timestamptz DEFAULT NOW()
)
RETURNS json AS $$
DECLARE
  v_quota user_simulation_quota;
  v_new_period_start timestamptz;
  v_new_period_end timestamptz;
  v_subscription user_subscriptions;
BEGIN
  -- Get current quota for user
  SELECT * INTO v_quota
  FROM user_simulation_quota
  WHERE user_id = p_user_id
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

  -- ⭐ LAZY RESET LOGIC ⭐
  -- Check if current period has expired
  IF v_quota.period_end < p_current_time THEN
    RAISE NOTICE 'Period expired for user %. Resetting quota...', p_user_id;

    -- Get user's subscription to check if still active
    SELECT * INTO v_subscription
    FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Only reset if subscription is still active
    IF v_subscription IS NOT NULL AND v_subscription.status = 'active' THEN
      -- Calculate new period based on subscription's billing cycle
      -- Use the subscription's renews_at if available, otherwise add 1 month to previous end
      IF v_subscription.renews_at IS NOT NULL THEN
        v_new_period_start := v_quota.period_end;
        v_new_period_end := v_subscription.renews_at;
      ELSE
        v_new_period_start := v_quota.period_end;
        v_new_period_end := v_quota.period_end + INTERVAL '1 month';
      END IF;

      -- Reset the quota for the new period
      UPDATE user_simulation_quota
      SET
        simulations_used = 0,
        period_start = v_new_period_start,
        period_end = v_new_period_end,
        updated_at = NOW()
      WHERE id = v_quota.id;

      -- Also sync the users table counter
      UPDATE users
      SET simulations_used_this_month = 0
      WHERE id = p_user_id;

      -- Refresh v_quota with new values
      SELECT * INTO v_quota
      FROM user_simulation_quota
      WHERE id = v_quota.id;

      RAISE NOTICE 'Quota reset complete. New period: % to %', v_new_period_start, v_new_period_end;
    ELSE
      -- Subscription expired/cancelled - don't reset
      RETURN json_build_object(
        'can_start', false,
        'reason', 'subscription_expired',
        'message', 'Ihr Abonnement ist abgelaufen. Bitte erneuern Sie es, um fortzufahren.'
      );
    END IF;
  END IF;

  -- ⭐ STANDARD QUOTA CHECKS (same as before) ⭐

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
      'total_simulations', v_quota.total_simulations,
      'period_end', v_quota.period_end
    );
  ELSE
    RETURN json_build_object(
      'can_start', false,
      'reason', 'quota_exceeded',
      'message', format('Simulationslimit erreicht (%s/%s). Upgraden Sie Ihren Tarif für mehr Simulationen.',
        v_quota.simulations_used, v_quota.total_simulations),
      'simulations_remaining', 0,
      'simulations_used', v_quota.simulations_used,
      'total_simulations', v_quota.total_simulations,
      'period_end', v_quota.period_end
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_start_simulation IS
'Checks if user can start a simulation. Auto-resets quota when billing period expires (lazy reset fallback).';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_start_simulation TO authenticated;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE '✅ can_start_simulation function updated with lazy reset logic';
  RAISE NOTICE 'ℹ️  Function will now automatically reset quota when billing period expires';
END $$;
