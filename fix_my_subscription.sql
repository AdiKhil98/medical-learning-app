-- IMMEDIATE FIX: Reset your subscription counter to 0
-- This will give you access to your paid plan simulations immediately
-- Replace 'YOUR_EMAIL_HERE' with your actual email address

-- Check current status first
SELECT
  email,
  subscription_tier,
  subscription_status,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used,
  (COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)) as remaining
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- Reset monthly counter to 0 for your paid plan
UPDATE users
SET
  simulations_used_this_month = 0,
  subscription_updated_at = NOW()
WHERE email = 'YOUR_EMAIL_HERE'
  AND subscription_tier IS NOT NULL
  AND subscription_tier != 'free'
  AND subscription_status = 'active';

-- Verify the fix
SELECT
  email,
  subscription_tier,
  subscription_status,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used,
  (COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)) as remaining
FROM users
WHERE email = 'YOUR_EMAIL_HERE';
