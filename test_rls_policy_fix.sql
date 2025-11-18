-- TEST: Verify RLS Policy Fix
-- Run these tests after applying fix_rls_policies.sql

-- ============================================
-- TEST 1: Verify user CANNOT update subscription fields
-- ============================================
-- Log in as a regular user (use their JWT token)
-- Try to grant yourself unlimited access:

UPDATE users
SET
  subscription_tier = 'unlimited',
  simulation_limit = 999999,
  simulations_used_this_month = 0
WHERE id = auth.uid();

-- Expected result: ERROR or 0 rows updated
-- "Policy violation" or similar error message
-- ✅ This proves users cannot manipulate subscriptions!

-- ============================================
-- TEST 2: Verify user CAN update safe fields
-- ============================================
-- Try to update your name (this should work):

UPDATE users
SET name = 'Test User Updated'
WHERE id = auth.uid();

-- Expected result: Success, 1 row updated
-- ✅ Safe fields can still be updated

-- ============================================
-- TEST 3: Verify user CANNOT change role
-- ============================================
-- Try to become an admin:

UPDATE users
SET role = 'admin'
WHERE id = auth.uid();

-- Expected result: ERROR or 0 rows updated
-- ✅ Role escalation prevented!

-- ============================================
-- TEST 4: Verify policies exist
-- ============================================
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN policyname LIKE '%safe%' THEN '✅ User safe fields'
    WHEN policyname LIKE '%service%' THEN '✅ Webhook updates'
    WHEN policyname LIKE '%admin%' THEN '✅ Admin access'
    ELSE '❓ Other'
  END as purpose
FROM pg_policies
WHERE tablename = 'users'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Expected result: 3 policies
-- 1. "Users can update safe profile fields"
-- 2. "Service role can update subscription fields"
-- 3. "Admins can update any user"

-- ============================================
-- TEST 5: Verify audit trail
-- ============================================
-- Check if audit table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'subscription_change_audit'
) as audit_table_exists;

-- Expected: true

-- Check recent audit entries
SELECT
  created_at,
  user_id,
  changed_by,
  changed_by_role,
  old_tier,
  new_tier,
  old_status,
  new_status,
  change_source
FROM subscription_change_audit
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- TEST 6: Verify protected column comments
-- ============================================
SELECT
  column_name,
  col_description('users'::regclass, ordinal_position) as protection_note
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'subscription_tier',
    'subscription_status',
    'simulation_limit',
    'role'
  )
ORDER BY column_name;

-- Expected: All should have "PROTECTED" comments

-- ============================================
-- TEST 7: Service role CAN update subscriptions (for webhooks)
-- ============================================
-- Note: You'll need service_role key for this test
-- This simulates what the LemonSqueezy webhook does:

-- SELECT auth.jwt(); -- Get current role
-- Should show: service_role

UPDATE users
SET
  subscription_tier = 'profi',
  subscription_status = 'active',
  simulation_limit = 60
WHERE id = '11111111-1111-1111-1111-111111111111'; -- Replace with test user ID

-- Expected result: Success (when using service_role key)
-- ✅ Webhooks can still update subscriptions

-- ============================================
-- TEST 8: Check what fields ARE updatable by users
-- ============================================
SELECT
  column_name,
  CASE
    WHEN column_name IN ('name', 'push_token', 'push_notifications_enabled', 'sound_vibration_enabled')
      THEN '✅ User can update'
    WHEN column_name IN ('subscription_tier', 'subscription_status', 'simulation_limit', 'simulations_used_this_month', 'role')
      THEN '❌ User CANNOT update'
    ELSE '❓ Unknown'
  END as user_permission
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY
  CASE
    WHEN column_name IN ('name', 'push_token', 'push_notifications_enabled', 'sound_vibration_enabled') THEN 1
    WHEN column_name IN ('subscription_tier', 'subscription_status', 'simulation_limit', 'simulations_used_this_month', 'role') THEN 2
    ELSE 3
  END,
  column_name;

-- ============================================
-- SUMMARY
-- ============================================
-- After running these tests, you should verify:
-- ✅ Regular users CANNOT update subscription fields
-- ✅ Regular users CAN update safe fields (name, notifications)
-- ✅ Regular users CANNOT escalate to admin role
-- ✅ Service role CAN update subscriptions (for webhooks)
-- ✅ Audit log records all subscription changes
-- ✅ 3 UPDATE policies exist on users table
