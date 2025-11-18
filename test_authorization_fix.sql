-- TEST: Verify Authorization Fix for Database Functions
-- Run these tests after applying fix_function_authorization.sql

-- ============================================
-- Setup: Create test users
-- ============================================
-- Note: You'll need actual user IDs from your auth.users table
-- Replace these with real UUIDs from your database

-- Get two real user IDs for testing
SELECT id, email FROM auth.users LIMIT 2;

-- For this test, let's say:
-- User A ID: '11111111-1111-1111-1111-111111111111'
-- User B ID: '22222222-2222-2222-2222-222222222222'

-- ============================================
-- TEST 1: Verify you can increment your own counter
-- ============================================
-- Log in as User A (use their JWT token in Supabase client)
-- Then run:
SELECT increment_free_simulations('11111111-1111-1111-1111-111111111111');

-- Expected result:
-- {
--   "success": true,
--   "new_count": 1,
--   "remaining": 2
-- }

-- ============================================
-- TEST 2: Verify you CANNOT increment someone else's counter
-- ============================================
-- Still logged in as User A, try to increment User B's counter:
SELECT increment_free_simulations('22222222-2222-2222-2222-222222222222');

-- Expected result: ERROR
-- "Unauthorized: Cannot modify other users data"
-- This proves the security fix works!

-- ============================================
-- TEST 3: Verify limit enforcement
-- ============================================
-- Increment User A's counter 3 times (as User A)
SELECT increment_free_simulations('11111111-1111-1111-1111-111111111111');
SELECT increment_free_simulations('11111111-1111-1111-1111-111111111111');
SELECT increment_free_simulations('11111111-1111-1111-1111-111111111111');

-- 4th attempt should fail:
SELECT increment_free_simulations('11111111-1111-1111-1111-111111111111');

-- Expected result:
-- {
--   "success": false,
--   "error": "limit_reached",
--   "message": "You have used all 3 free simulations",
--   "current_count": 3,
--   "limit": 3
-- }

-- ============================================
-- TEST 4: Verify monthly simulations (paid tier)
-- ============================================
-- Log in as a paid user
-- Replace with actual paid user ID
SELECT increment_monthly_simulations('33333333-3333-3333-3333-333333333333');

-- Expected result:
-- {
--   "success": true,
--   "new_count": 1,
--   "remaining": 29  (or 59 for profi, 999999 for unlimited)
-- }

-- ============================================
-- TEST 5: Verify function security mode
-- ============================================
SELECT
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as security_mode,
  pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
WHERE p.proname IN ('increment_free_simulations', 'increment_monthly_simulations');

-- Expected: Both should show "✅ SECURITY DEFINER"

-- ============================================
-- TEST 6: Verify grants
-- ============================================
SELECT
  p.proname as function_name,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as can_execute_authenticated,
  has_function_privilege('anon', p.oid, 'EXECUTE') as can_execute_anonymous
FROM pg_proc p
WHERE p.proname IN ('increment_free_simulations', 'increment_monthly_simulations');

-- Expected:
-- can_execute_authenticated: true
-- can_execute_anonymous: false

-- ============================================
-- TEST 7: Check audit log (if enabled)
-- ============================================
SELECT
  created_at,
  function_name,
  user_id,
  called_by,
  success,
  error_message
FROM function_audit_log
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- CLEANUP: Reset test counters
-- ============================================
-- Reset User A's counter (only for testing)
UPDATE users
SET free_simulations_used = 0
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Verify reset
SELECT id, email, free_simulations_used
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';
