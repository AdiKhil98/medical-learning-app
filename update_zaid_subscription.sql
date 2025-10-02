-- Update zaid199660@gmail.com to basis-plan subscription
-- This gives 30 simulations per month

UPDATE users
SET
  subscription_tier = 'basis',
  subscription_status = 'active',
  simulation_limit = 30,
  simulations_used_this_month = 0,
  subscription_period_start = CURRENT_DATE,
  subscription_period_end = (CURRENT_DATE + INTERVAL '1 month'),
  subscription_updated_at = now()
WHERE email = 'zaid199660@gmail.com';

-- Verify the update
SELECT
  email,
  subscription_tier,
  subscription_status,
  simulation_limit,
  simulations_used_this_month,
  subscription_period_start,
  subscription_period_end
FROM users
WHERE email = 'zaid199660@gmail.com';