-- COMPREHENSIVE SUBSCRIPTION DIAGNOSTIC SCRIPT
-- This will show you everything about your subscription status
-- Replace 'YOUR_EMAIL_HERE' with your actual email

-- =========================================
-- 1. CURRENT SUBSCRIPTION STATUS
-- =========================================
SELECT
  id as user_id,
  email,
  name,
  subscription_tier,
  subscription_status,
  subscription_variant_name,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used,
  subscription_created_at,
  subscription_updated_at,
  subscription_expires_at,
  lemon_squeezy_customer_email
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- =========================================
-- 2. ACCESS CALCULATION (HOW THE APP SEES IT)
-- =========================================
SELECT
  email,
  subscription_tier,
  subscription_status,

  -- What counter is being used?
  CASE
    WHEN subscription_tier IS NULL OR subscription_tier = 'free' OR subscription_status != 'active' THEN 'free_simulations_used'
    ELSE 'simulations_used_this_month'
  END as counter_being_used,

  -- Current counter values
  simulations_used_this_month as monthly_counter,
  free_simulations_used as free_counter,

  -- Limit calculation
  CASE
    WHEN subscription_tier IS NULL OR subscription_tier = 'free' OR subscription_status != 'active' THEN 3
    WHEN subscription_tier = 'unlimited' THEN 999999
    ELSE COALESCE(simulation_limit, 0)
  END as calculated_limit,

  -- Remaining calculation
  CASE
    WHEN subscription_tier IS NULL OR subscription_tier = 'free' OR subscription_status != 'active' THEN
      3 - COALESCE(free_simulations_used, 0)
    WHEN subscription_tier = 'unlimited' THEN
      999999
    ELSE
      COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)
  END as remaining_simulations,

  -- Can start simulation?
  CASE
    WHEN subscription_tier IS NULL OR subscription_tier = 'free' OR subscription_status != 'active' THEN
      CASE WHEN (3 - COALESCE(free_simulations_used, 0)) > 0 THEN 'YES ✅' ELSE 'NO ❌ - FREE LIMIT REACHED' END
    WHEN subscription_tier = 'unlimited' THEN
      'YES ✅ - UNLIMITED'
    ELSE
      CASE WHEN (COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)) > 0
        THEN 'YES ✅'
        ELSE 'NO ❌ - MONTHLY LIMIT REACHED'
      END
  END as can_start_simulation
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- =========================================
-- 3. PROBLEMS DETECTION
-- =========================================
SELECT
  email,
  CASE
    -- Check for NULL subscription_status
    WHEN subscription_status IS NULL AND subscription_tier IS NOT NULL THEN
      '⚠️ PROBLEM: subscription_status is NULL but tier is set'

    -- Check for unlimited tier but status not active
    WHEN subscription_tier = 'unlimited' AND subscription_status != 'active' THEN
      '⚠️ PROBLEM: Unlimited tier but status is not active'

    -- Check for NULL simulation_limit on paid tier
    WHEN subscription_tier IN ('basis', 'profi') AND simulation_limit IS NULL THEN
      '⚠️ PROBLEM: Paid tier but simulation_limit is NULL'

    -- Check for high counter on unlimited
    WHEN subscription_tier = 'unlimited' AND simulations_used_this_month > 0 THEN
      '⚠️ WARNING: Unlimited tier but counter not reset (should be 0)'

    -- Check for mismatched tier and limit
    WHEN subscription_tier = 'basis' AND simulation_limit != 30 THEN
      '⚠️ PROBLEM: Basis tier but limit is not 30'

    WHEN subscription_tier = 'profi' AND simulation_limit != 60 THEN
      '⚠️ PROBLEM: Profi tier but limit is not 60'

    ELSE '✅ NO OBVIOUS PROBLEMS DETECTED'
  END as diagnosis,

  -- Suggested fix
  CASE
    WHEN subscription_tier = 'unlimited' AND subscription_status != 'active' THEN
      'Run: UPDATE users SET subscription_status = ''active'' WHERE email = ''YOUR_EMAIL_HERE'';'

    WHEN subscription_tier = 'unlimited' AND simulations_used_this_month > 0 THEN
      'Run: UPDATE users SET simulations_used_this_month = 0 WHERE email = ''YOUR_EMAIL_HERE'';'

    WHEN subscription_tier IN ('basis', 'profi') AND simulation_limit IS NULL THEN
      'Run: UPDATE users SET simulation_limit = ' ||
        CASE WHEN subscription_tier = 'basis' THEN '30' ELSE '60' END ||
        ' WHERE email = ''YOUR_EMAIL_HERE'';'

    ELSE 'No fix needed'
  END as suggested_fix
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- =========================================
-- 4. RECENT WEBHOOK EVENTS (IF TABLE EXISTS)
-- =========================================
-- Uncomment this if you have webhook_events table
-- SELECT
--   created_at,
--   event_type,
--   status,
--   error_message,
--   subscription_id
-- FROM webhook_events
-- WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE')
-- ORDER BY created_at DESC
-- LIMIT 10;
