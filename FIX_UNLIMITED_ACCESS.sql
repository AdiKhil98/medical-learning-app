-- IMMEDIATE FIX FOR UNLIMITED SUBSCRIPTION ACCESS ISSUE
-- This script will reset your simulation counter so you can access your unlimited simulations
-- Run this in your Supabase SQL Editor

-- STEP 1: Check current status
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
  CASE
    WHEN subscription_tier = 'unlimited' AND subscription_status = 'active' THEN 'SHOULD HAVE UNLIMITED ACCESS'
    WHEN subscription_tier = 'unlimited' AND subscription_status != 'active' THEN 'TIER IS UNLIMITED BUT STATUS NOT ACTIVE - NEEDS FIX'
    WHEN subscription_status = 'active' THEN CONCAT('ACTIVE - ', COALESCE(simulation_limit, 0) - COALESCE(simulations_used_this_month, 0), ' simulations remaining')
    ELSE 'NOT ACTIVE'
  END as access_status,
  subscription_created_at,
  subscription_updated_at
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- STEP 2: Fix unlimited tier access (reset counter to 0)
-- This will immediately restore your access
UPDATE users
SET
  simulations_used_this_month = 0,
  subscription_updated_at = NOW()
WHERE email = 'YOUR_EMAIL_HERE'
  AND subscription_tier = 'unlimited'
  AND subscription_status = 'active';

-- STEP 3: Verify the fix worked
SELECT
  email,
  subscription_tier,
  subscription_status,
  subscription_variant_name,
  simulation_limit,
  simulations_used_this_month,
  'ACCESS RESTORED ✅' as status
FROM users
WHERE email = 'YOUR_EMAIL_HERE'
  AND subscription_tier = 'unlimited'
  AND subscription_status = 'active';

-- STEP 4: If status is not 'active', run this to activate it
-- (Only run this if STEP 1 showed status is not 'active')
-- UPDATE users
-- SET
--   subscription_status = 'active',
--   simulations_used_this_month = 0,
--   subscription_updated_at = NOW()
-- WHERE email = 'YOUR_EMAIL_HERE'
--   AND subscription_tier = 'unlimited';

-- DIAGNOSTIC INFO:
-- If you still have issues after running this:
-- 1. Check that your email matches exactly what's in the database
-- 2. Make sure subscription_tier is exactly 'unlimited' (lowercase)
-- 3. Make sure subscription_status is 'active'
-- 4. Clear your browser cache and reload the app
