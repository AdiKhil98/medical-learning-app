-- Comprehensive diagnostic and fix for quota issues
DO $$
DECLARE
  v_user_id uuid;
  v_total_logs integer;
  v_current_month_logs integer;
  v_quota_used integer;
  v_quota_limit integer;
  v_record RECORD;
BEGIN
  -- Get the first user_id
  SELECT user_id INTO v_user_id FROM user_simulation_quota LIMIT 1;
  
  RAISE NOTICE '=== QUOTA DIAGNOSTIC REPORT ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Check total logs
  SELECT COUNT(*) INTO v_total_logs FROM simulation_usage_logs WHERE user_id = v_user_id;
  RAISE NOTICE 'Total simulation logs: %', v_total_logs;
  
  -- Check current month logs
  SELECT COUNT(*) INTO v_current_month_logs
  FROM simulation_usage_logs
  WHERE user_id = v_user_id
    AND started_at >= date_trunc('month', NOW());
  RAISE NOTICE 'Current month logs: %', v_current_month_logs;
  
  -- Check quota table
  SELECT simulations_used, simulations_limit INTO v_quota_used, v_quota_limit
  FROM user_simulation_quota
  WHERE user_id = v_user_id;
  RAISE NOTICE 'Quota table - Used: %, Limit: %', v_quota_used, v_quota_limit;
  
  -- Show recent logs
  RAISE NOTICE '=== RECENT SIMULATION LOGS ===';
  FOR v_record IN (
    SELECT id, simulation_type, started_at, ended_at
    FROM simulation_usage_logs
    WHERE user_id = v_user_id
    ORDER BY started_at DESC
    LIMIT 10
  ) LOOP
    RAISE NOTICE 'Log: % | Type: % | Started: % | Ended: %', 
      v_record.id, v_record.simulation_type, v_record.started_at, v_record.ended_at;
  END LOOP;
  
  -- FIX: Recalculate quota based on CURRENT MONTH only
  RAISE NOTICE '=== APPLYING FIX ===';
  
  UPDATE user_simulation_quota
  SET 
    simulations_used = (
      SELECT COUNT(*)
      FROM simulation_usage_logs
      WHERE user_id = v_user_id
        AND started_at >= date_trunc('month', NOW())
    ),
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  -- Verify fix
  SELECT simulations_used INTO v_quota_used
  FROM user_simulation_quota
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'AFTER FIX - Quota used: %', v_quota_used;
  RAISE NOTICE '=== FIX COMPLETED ===';
END $$;
