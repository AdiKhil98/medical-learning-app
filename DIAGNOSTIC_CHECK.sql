-- Diagnostic Query to Check Subscription Status
-- Run this in Supabase SQL Editor to diagnose the issue

SELECT
  id,
  email,
  subscription_tier,
  subscription_status,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used,
  subscription_period_end,

  -- Calculate remaining simulations
  CASE
    WHEN subscription_tier IS NULL OR subscription_status != 'active' THEN
      3 - COALESCE(free_simulations_used, 0)
    WHEN subscription_tier = 'unlimited' THEN
      999999
    ELSE
      COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)
  END as calculated_remaining,

  -- Check if user should be able to start simulation
  CASE
    WHEN subscription_tier IS NULL OR subscription_status != 'active' THEN
      (3 - COALESCE(free_simulations_used, 0)) > 0
    WHEN subscription_tier = 'unlimited' THEN
      true
    ELSE
      (COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)) > 0
  END as can_start_simulation,

  -- Check for data issues
  CASE
    WHEN subscription_tier IS NOT NULL
         AND subscription_status = 'active'
         AND simulation_limit IS NULL THEN
      'ERROR: Active subscription but NULL limit'
    WHEN simulation_limit IS NOT NULL
         AND simulation_limit < simulations_used_this_month THEN
      'ERROR: Used count exceeds limit'
    WHEN subscription_tier IS NOT NULL
         AND subscription_status = 'active'
         AND simulation_limit = 0 THEN
      'ERROR: Active subscription with 0 limit'
    ELSE
      'OK'
  END as data_validation,

  created_at,
  updated_at

FROM users
WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your email
ORDER BY created_at DESC
LIMIT 1;


-- Also check simulation_usage_logs for active sessions
SELECT
  session_token,
  user_id,
  simulation_type,
  status,
  counted_toward_usage,
  started_at,
  ended_at,
  EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_elapsed
FROM simulation_usage_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE' LIMIT 1)
  AND status != 'completed'
  AND status != 'aborted'
ORDER BY started_at DESC
LIMIT 5;


-- Check recent simulation history
SELECT
  simulation_type,
  status,
  counted_toward_usage,
  started_at,
  ended_at,
  EXTRACT(EPOCH FROM (ended_at - started_at))/60 as duration_minutes
FROM simulation_usage_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE' LIMIT 1)
ORDER BY started_at DESC
LIMIT 10;
