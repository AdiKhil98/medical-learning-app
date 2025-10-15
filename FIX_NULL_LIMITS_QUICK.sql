-- QUICK FIX: Update NULL simulation_limit values in database
-- Run this in Supabase SQL Editor to permanently fix the issue

-- Step 1: Check affected users
SELECT
  id,
  email,
  subscription_tier,
  subscription_status,
  simulation_limit,
  simulations_used_this_month
FROM users
WHERE subscription_tier IS NOT NULL
  AND subscription_status = 'active'
  AND simulation_limit IS NULL;

-- Step 2: Fix NULL limits based on tier
UPDATE users
SET simulation_limit = CASE
  WHEN subscription_tier = 'basis' THEN 30
  WHEN subscription_tier = 'profi' THEN 60
  WHEN subscription_tier = 'unlimited' THEN 999999
  WHEN subscription_tier ~ '^custom_[0-9]+$' THEN
    CAST(SUBSTRING(subscription_tier FROM 'custom_([0-9]+)') AS INTEGER)
  ELSE 30  -- Default fallback
END
WHERE subscription_tier IS NOT NULL
  AND subscription_status = 'active'
  AND simulation_limit IS NULL;

-- Step 3: Verify the fix
SELECT
  id,
  email,
  subscription_tier,
  simulation_limit,
  simulations_used_this_month,
  (simulation_limit - simulations_used_this_month) as remaining,
  CASE
    WHEN (simulation_limit - simulations_used_this_month) > 0 THEN '✅ CAN USE'
    ELSE '❌ BLOCKED'
  END as status
FROM users
WHERE subscription_tier IS NOT NULL
  AND subscription_status = 'active'
ORDER BY email;
