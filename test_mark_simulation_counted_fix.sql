-- TEST: Verify mark_simulation_counted Race Condition Fix
-- Run these tests after applying fix_mark_simulation_counted.sql

-- ============================================
-- Setup: Create test simulation sessions
-- ============================================
-- Note: You'll need actual user IDs from your auth.users table
-- Replace these with real UUIDs from your database

-- Get a real user ID for testing
SELECT id, email FROM auth.users LIMIT 1;

-- For this test, let's say:
-- User ID: '11111111-1111-1111-1111-111111111111'

-- Create a test simulation session (as the user)
-- This would normally be done by start_simulation_session function
INSERT INTO simulation_usage_logs (
  session_token,
  user_id,
  simulation_type,
  started_at,
  counted_toward_usage
) VALUES (
  'test-session-123',
  '11111111-1111-1111-1111-111111111111',
  'kp',
  now() - interval '15 minutes',  -- Started 15 min ago (exceeds 10-min threshold)
  false
);

-- ============================================
-- TEST 1: Verify authorization - cannot mark other user's simulation
-- ============================================
-- Log in as User A (use their JWT token)
-- Try to mark User B's simulation:

SELECT mark_simulation_counted('test-session-123', '22222222-2222-2222-2222-222222222222');

-- Expected result: ERROR
-- "Unauthorized: Cannot mark other users simulations as counted"
-- ✅ This proves the auth check works!

-- ============================================
-- TEST 2: Verify you CAN mark your own simulation
-- ============================================
-- Still logged in as User A, mark your own simulation:
-- (After 10 minutes have elapsed)

SELECT mark_simulation_counted('test-session-123', '11111111-1111-1111-1111-111111111111');

-- Expected result:
-- {
--   "success": true,
--   "counted": true,
--   "elapsed_seconds": 900 (or more),
--   "message": "Simulation marked as counted"
-- }

-- ============================================
-- TEST 3: Verify double-counting prevention
-- ============================================
-- Try to mark the same simulation again:

SELECT mark_simulation_counted('test-session-123', '11111111-1111-1111-1111-111111111111');

-- Expected result:
-- {
--   "success": true,
--   "already_counted": true,
--   "message": "Simulation already counted"
-- }
-- ✅ No double-counting!

-- ============================================
-- TEST 4: Verify time threshold enforcement
-- ============================================
-- Create a simulation that started only 2 minutes ago:

INSERT INTO simulation_usage_logs (
  session_token,
  user_id,
  simulation_type,
  started_at,
  counted_toward_usage
) VALUES (
  'test-session-456',
  '11111111-1111-1111-1111-111111111111',
  'fsp',
  now() - interval '2 minutes',  -- Only 2 minutes ago
  false
);

-- Try to mark it:
SELECT mark_simulation_counted('test-session-456', '11111111-1111-1111-1111-111111111111');

-- Expected result:
-- {
--   "success": false,
--   "error": "Insufficient time elapsed",
--   "elapsed_seconds": 120,
--   "required_seconds": 300
-- }
-- ✅ Time threshold enforced!

-- ============================================
-- TEST 5: Verify counter increment (free tier)
-- ============================================
-- Check counter before:
SELECT id, email, free_simulations_used, simulations_used_this_month
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Mark a new simulation (assuming user is on free tier):
INSERT INTO simulation_usage_logs (
  session_token,
  user_id,
  simulation_type,
  started_at,
  counted_toward_usage
) VALUES (
  'test-session-789',
  '11111111-1111-1111-1111-111111111111',
  'kp',
  now() - interval '15 minutes',
  false
);

SELECT mark_simulation_counted('test-session-789', '11111111-1111-1111-1111-111111111111');

-- Check counter after:
SELECT id, email, free_simulations_used, simulations_used_this_month
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: free_simulations_used increased by 1
-- ✅ Counter incremented correctly!

-- ============================================
-- TEST 6: Verify counter increment (paid tier)
-- ============================================
-- Get a paid user:
SELECT id, email, subscription_tier, simulations_used_this_month
FROM users
WHERE subscription_tier IS NOT NULL
  AND subscription_tier != ''
  AND subscription_status IN ('active', 'on_trial', 'past_due')
LIMIT 1;

-- Let's say paid user ID: '33333333-3333-3333-3333-333333333333'

-- Create and mark their simulation:
INSERT INTO simulation_usage_logs (
  session_token,
  user_id,
  simulation_type,
  started_at,
  counted_toward_usage
) VALUES (
  'test-session-paid-1',
  '33333333-3333-3333-3333-333333333333',
  'fsp',
  now() - interval '15 minutes',
  false
);

-- (Log in as that paid user first)
SELECT mark_simulation_counted('test-session-paid-1', '33333333-3333-3333-3333-333333333333');

-- Check counter:
SELECT id, email, simulations_used_this_month, free_simulations_used
FROM users
WHERE id = '33333333-3333-3333-3333-333333333333';

-- Expected: simulations_used_this_month increased by 1
-- free_simulations_used unchanged
-- ✅ Paid tier counter incremented correctly!

-- ============================================
-- TEST 7: Verify row lock prevents race condition
-- ============================================
-- This test requires concurrent transactions
-- You can simulate this by opening two SQL connections:

-- Connection 1:
BEGIN;
SELECT mark_simulation_counted('test-session-race', '11111111-1111-1111-1111-111111111111');
-- Don't commit yet...

-- Connection 2 (while Connection 1 is still uncommitted):
SELECT mark_simulation_counted('test-session-race', '11111111-1111-1111-1111-111111111111');
-- This should WAIT until Connection 1 commits/rollbacks

-- Back to Connection 1:
COMMIT;

-- Now Connection 2 should complete and return:
-- {"success": true, "already_counted": true}
-- ✅ Row lock prevented double-counting!

-- ============================================
-- TEST 8: Verify function security mode
-- ============================================
SELECT
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as security_mode
FROM pg_proc p
WHERE p.proname = 'mark_simulation_counted';

-- Expected: ✅ SECURITY DEFINER

-- ============================================
-- TEST 9: Verify grants
-- ============================================
SELECT
  p.proname as function_name,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as can_execute_authenticated,
  has_function_privilege('anon', p.oid, 'EXECUTE') as can_execute_anonymous
FROM pg_proc p
WHERE p.proname = 'mark_simulation_counted';

-- Expected:
-- can_execute_authenticated: true
-- can_execute_anonymous: false

-- ============================================
-- TEST 10: Verify simulation_usage_logs updated correctly
-- ============================================
SELECT
  session_token,
  counted_toward_usage,
  duration_seconds,
  started_at,
  updated_at
FROM simulation_usage_logs
WHERE session_token IN ('test-session-123', 'test-session-456', 'test-session-789')
ORDER BY started_at DESC;

-- Expected:
-- test-session-123: counted_toward_usage = true, duration_seconds set
-- test-session-456: counted_toward_usage = false (time threshold not met)
-- test-session-789: counted_toward_usage = true, duration_seconds set

-- ============================================
-- CLEANUP: Remove test data
-- ============================================
DELETE FROM simulation_usage_logs
WHERE session_token LIKE 'test-session-%';

-- ============================================
-- SUMMARY
-- ============================================
-- After running these tests, you should verify:
-- ✅ Users CANNOT mark other users' simulations
-- ✅ Users CAN mark their own simulations
-- ✅ Double-counting is prevented
-- ✅ Time threshold (10 minutes) is enforced
-- ✅ Free tier counter increments correctly
-- ✅ Paid tier counter increments correctly
-- ✅ Row locks prevent race conditions
-- ✅ Function has SECURITY DEFINER mode
-- ✅ Only authenticated users can execute
-- ✅ simulation_usage_logs records are updated correctly
