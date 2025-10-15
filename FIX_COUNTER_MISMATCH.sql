-- FIX COUNTER MISMATCH SCRIPT
-- This script diagnoses and fixes simulation counter issues

-- STEP 1: Check current user data
-- Replace 'YOUR_EMAIL_HERE' with your actual email
DO $$
DECLARE
  v_user_id uuid;
  v_tier text;
  v_status text;
  v_limit integer;
  v_used integer;
  v_free_used integer;
BEGIN
  -- Get user data
  SELECT
    id, subscription_tier, subscription_status,
    simulation_limit, simulations_used_this_month, free_simulations_used
  INTO
    v_user_id, v_tier, v_status, v_limit, v_used, v_free_used
  FROM users
  WHERE email = 'YOUR_EMAIL_HERE';  -- REPLACE THIS

  RAISE NOTICE '=== USER DATA ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Tier: %', COALESCE(v_tier, 'NULL (FREE)');
  RAISE NOTICE 'Status: %', COALESCE(v_status, 'NULL (INACTIVE)');
  RAISE NOTICE 'Limit: %', COALESCE(v_limit, 0);
  RAISE NOTICE 'Used (Monthly): %', COALESCE(v_used, 0);
  RAISE NOTICE 'Used (Free): %', COALESCE(v_free_used, 0);
  RAISE NOTICE '';

  -- Check if user is on free tier
  IF v_tier IS NULL OR v_status != 'active' THEN
    RAISE NOTICE 'FREE TIER DETECTED';
    RAISE NOTICE 'Should use: free_simulations_used = %', COALESCE(v_free_used, 0);
    RAISE NOTICE 'Limit: 3 (lifetime)';
    RAISE NOTICE 'Remaining: %', 3 - COALESCE(v_free_used, 0);
  ELSE
    RAISE NOTICE 'PAID TIER DETECTED: %', v_tier;
    RAISE NOTICE 'Should use: simulations_used_this_month = %', COALESCE(v_used, 0);
    RAISE NOTICE 'Limit: %', COALESCE(v_limit, 0);
    RAISE NOTICE 'Remaining: %', COALESCE(v_limit, 0) - COALESCE(v_used, 0);
  END IF;

  -- Check for NULL limit on active subscription (BUG)
  IF v_tier IS NOT NULL AND v_status = 'active' AND v_limit IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  BUG DETECTED: Active subscription with NULL limit!';
    RAISE NOTICE 'This will cause blocking even with 0 simulations used.';
    RAISE NOTICE 'Run FIX in STEP 2 to repair.';
  END IF;

  -- Check if used exceeds limit (DATA CORRUPTION)
  IF v_limit IS NOT NULL AND v_used > v_limit THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  DATA CORRUPTION: Used (%s) exceeds limit (%s)!', v_used, v_limit;
    RAISE NOTICE 'Run FIX in STEP 2 to repair.';
  END IF;

END $$;


-- STEP 2: FIX DATA ISSUES (Uncomment to run)
/*
UPDATE users
SET
  -- Fix NULL limit for active subscriptions
  simulation_limit = CASE
    WHEN subscription_tier = 'basis' THEN 30
    WHEN subscription_tier = 'profi' THEN 60
    WHEN subscription_tier = 'unlimited' THEN 999999
    WHEN subscription_tier LIKE 'custom_%' THEN
      CAST(SUBSTRING(subscription_tier FROM 'custom_(.*)') AS INTEGER)
    ELSE simulation_limit
  END,

  -- Cap used count at limit if exceeded
  simulations_used_this_month = CASE
    WHEN simulations_used_this_month > simulation_limit THEN simulation_limit
    ELSE simulations_used_this_month
  END

WHERE email = 'YOUR_EMAIL_HERE'  -- REPLACE THIS
  AND subscription_status = 'active'
  AND (
    simulation_limit IS NULL
    OR simulations_used_this_month > simulation_limit
  );
*/


-- STEP 3: MANUAL RESET (Use if you want to reset counters)
/*
-- Reset monthly counter (for testing)
UPDATE users
SET simulations_used_this_month = 0
WHERE email = 'YOUR_EMAIL_HERE';  -- REPLACE THIS

-- OR reset free counter
UPDATE users
SET free_simulations_used = 0
WHERE email = 'YOUR_EMAIL_HERE';  -- REPLACE THIS
*/


-- STEP 4: Check for orphaned simulation sessions
SELECT
  session_token,
  simulation_type,
  status,
  counted_toward_usage,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_since_start
FROM simulation_usage_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE' LIMIT 1)
  AND ended_at IS NULL
  AND status NOT IN ('completed', 'aborted')
ORDER BY started_at DESC;
