-- Fix simulations that lasted >= 5 minutes but weren't counted
-- Date: 2025-12-09
-- Purpose: Retroactively count simulations that met the duration threshold

DO $$
DECLARE
  v_record RECORD;
  v_count integer := 0;
BEGIN
  RAISE NOTICE '=== FIXING UNCOUNTED LONG SIMULATIONS ===';

  -- Find all simulations that:
  -- 1. Are from current month
  -- 2. Have ended (ended_at IS NOT NULL)
  -- 3. Lasted >= 5 minutes (300 seconds)
  -- 4. Were NOT counted (counted_toward_usage = false)
  FOR v_record IN (
    SELECT
      id,
      session_token,
      user_id,
      simulation_type,
      started_at,
      ended_at,
      EXTRACT(EPOCH FROM (ended_at - started_at))::integer as duration_seconds,
      counted_toward_usage
    FROM simulation_usage_logs
    WHERE started_at >= date_trunc('month', NOW())
      AND ended_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (ended_at - started_at))::integer >= 300
      AND counted_toward_usage = false
    ORDER BY started_at DESC
  ) LOOP
    RAISE NOTICE 'Found uncounted simulation: session=%, duration=%s seconds',
      v_record.session_token, v_record.duration_seconds;

    -- Update the simulation to mark it as counted
    UPDATE simulation_usage_logs
    SET
      counted_toward_usage = true,
      duration_seconds = v_record.duration_seconds
    WHERE id = v_record.id;

    -- Manually increment the quota (since trigger won't fire on UPDATE of already-ended session)
    UPDATE user_simulation_quota
    SET
      simulations_used = simulations_used + 1,
      updated_at = NOW()
    WHERE user_id = v_record.user_id
      AND period_start <= v_record.started_at
      AND period_end > v_record.started_at;

    v_count := v_count + 1;
    RAISE NOTICE '✅ Fixed simulation %', v_record.session_token;
  END LOOP;

  RAISE NOTICE '=== FIXED % UNCOUNTED SIMULATIONS ===', v_count;

  -- Show updated quota status
  RAISE NOTICE '=== UPDATED QUOTA STATUS ===';
  FOR v_record IN (
    SELECT
      user_id,
      subscription_tier,
      total_simulations,
      simulations_used,
      simulations_remaining
    FROM user_simulation_quota
    WHERE period_start <= NOW()
      AND period_end > NOW()
  ) LOOP
    RAISE NOTICE 'User: %, Tier: %, Used: %/%, Remaining: %',
      v_record.user_id, v_record.subscription_tier,
      v_record.simulations_used, v_record.total_simulations,
      v_record.simulations_remaining;
  END LOOP;
END $$;
