-- Simple quota fix - recalculate based on current month only
DO $$
DECLARE
  v_user_id uuid;
  v_current_month_logs integer;
  v_quota_used_before integer;
  v_quota_used_after integer;
BEGIN
  -- Get the first user_id
  SELECT user_id INTO v_user_id FROM user_simulation_quota LIMIT 1;

  RAISE NOTICE '=== QUOTA FIX STARTING ===';
  RAISE NOTICE 'User ID: %', v_user_id;

  -- Check current quota value
  SELECT simulations_used INTO v_quota_used_before
  FROM user_simulation_quota
  WHERE user_id = v_user_id;
  RAISE NOTICE 'Quota BEFORE fix: %', v_quota_used_before;

  -- Count current month simulations
  SELECT COUNT(*) INTO v_current_month_logs
  FROM simulation_usage_logs
  WHERE user_id = v_user_id
    AND started_at >= date_trunc('month', NOW());
  RAISE NOTICE 'Current month simulations: %', v_current_month_logs;

  -- Apply fix: Update quota to match current month count
  UPDATE user_simulation_quota
  SET
    simulations_used = v_current_month_logs,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Verify fix
  SELECT simulations_used INTO v_quota_used_after
  FROM user_simulation_quota
  WHERE user_id = v_user_id;

  RAISE NOTICE 'Quota AFTER fix: %', v_quota_used_after;
  RAISE NOTICE '=== FIX COMPLETED SUCCESSFULLY ===';
END $$;
