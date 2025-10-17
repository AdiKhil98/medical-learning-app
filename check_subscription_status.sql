-- Check current subscription status for debugging
-- Replace 'YOUR_EMAIL_HERE' with your actual email address

SELECT
  id,
  email,
  subscription_tier,
  subscription_status,
  subscription_variant_name,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used,
  subscription_created_at,
  subscription_updated_at,
  -- Calculate remaining
  CASE
    WHEN subscription_tier IS NULL OR subscription_tier = 'free' OR subscription_status != 'active' THEN
      3 - COALESCE(free_simulations_used, 0)
    WHEN subscription_tier = 'unlimited' THEN
      999999
    ELSE
      COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0)
  END as remaining_simulations
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- To reset your counter manually (run this if needed):
-- UPDATE users
-- SET simulations_used_this_month = 0
-- WHERE email = 'YOUR_EMAIL_HERE';
