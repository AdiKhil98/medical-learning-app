-- TEST: Verify Concurrent Session Prevention Fix
-- Run these tests after applying fix_concurrent_sessions.sql

-- ============================================
-- Setup: Get test user
-- ============================================
SELECT id, email FROM auth.users LIMIT 1;

-- For this test, let's say:
-- User ID: '11111111-1111-1111-1111-111111111111'

-- ============================================
-- TEST 1: Verify authorization check
-- ============================================
-- Log in as User A, try to start simulation for User B:

SELECT start_simulation_session(
  '22222222-2222-2222-2222-222222222222',
  'kp',
  'test-token-unauthorized'
);

-- Expected result: ERROR
-- "Unauthorized: Cannot start simulation for other users"
-- ✅ Auth check works!

-- ============================================
-- TEST 2: Start first simulation (should succeed)
-- ============================================
-- Log in as User A:

SELECT start_simulation_session(
  '11111111-1111-1111-1111-111111111111',
  'kp',
  'test-session-1'
);

-- Expected result:
-- {
--   "success": true,
--   "session_id": "...",
--   "session_token": "test-session-1",
--   "started_at": "...",
--   "previous_sessions_ended": 0
-- }

-- Verify session was created:
SELECT
  session_token,
  simulation_type,
  started_at,
  ended_at,
  counted_toward_usage
FROM simulation_usage_logs
WHERE session_token = 'test-session-1';

-- Expected: One row, ended_at = NULL (active)

-- ============================================
-- TEST 3: Try to start second simulation while first is active
-- ============================================
-- Still logged in as User A, start another simulation:

SELECT start_simulation_session(
  '11111111-1111-1111-1111-111111111111',
  'fsp',
  'test-session-2'
);

-- Expected result:
-- {
--   "success": true,
--   "session_id": "...",
--   "session_token": "test-session-2",
--   "started_at": "...",
--   "previous_sessions_ended": 1  <-- Previous session auto-ended!
-- }

-- Verify first session was auto-ended:
SELECT
  session_token,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage,
  CASE
    WHEN ended_at IS NOT NULL THEN '✅ Auto-ended'
    ELSE '❌ Still active'
  END as status
FROM simulation_usage_logs
WHERE session_token = 'test-session-1';

-- Expected: ended_at IS NOT NULL, status = '✅ Auto-ended'

-- Verify second session is now active:
SELECT
  session_token,
  ended_at,
  CASE
    WHEN ended_at IS NULL THEN '✅ Active'
    ELSE '❌ Ended'
  END as status
FROM simulation_usage_logs
WHERE session_token = 'test-session-2';

-- Expected: ended_at IS NULL, status = '✅ Active'

-- ============================================
-- TEST 4: Verify unique constraint at database level
-- ============================================
-- Try to manually INSERT two active sessions (should fail with constraint):

-- This should succeed (first active session):
INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'kp',
  'manual-test-1',
  now()
);

-- This should FAIL (second active session for same user):
INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'fsp',
  'manual-test-2',
  now()
);

-- Expected: ERROR
-- "duplicate key value violates unique constraint "idx_one_active_session_per_user""
-- ✅ Database constraint prevents concurrent sessions!

-- Cleanup:
DELETE FROM simulation_usage_logs WHERE session_token LIKE 'manual-test-%';

-- ============================================
-- TEST 5: Verify auto-end counts simulation if >= 10 minutes
-- ============================================
-- Create a session that started 15 minutes ago:

INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'kp',
  'test-old-session',
  now() - interval '15 minutes'
);

-- Now start a new session (should auto-end the old one and mark it as counted):
SELECT start_simulation_session(
  '11111111-1111-1111-1111-111111111111',
  'fsp',
  'test-new-session'
);

-- Check if old session was counted:
SELECT
  session_token,
  duration_seconds,
  counted_toward_usage,
  CASE
    WHEN counted_toward_usage = true THEN '✅ Counted'
    ELSE '❌ Not counted'
  END as status
FROM simulation_usage_logs
WHERE session_token = 'test-old-session';

-- Expected:
-- duration_seconds >= 600
-- counted_toward_usage = true
-- status = '✅ Counted'
-- ✅ Old sessions that exceed 10 minutes are auto-counted!

-- ============================================
-- TEST 6: Verify auto-end does NOT count if < 10 minutes
-- ============================================
-- Create a session that started only 5 minutes ago:

INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'kp',
  'test-short-session',
  now() - interval '5 minutes'
);

-- Start a new session:
SELECT start_simulation_session(
  '11111111-1111-1111-1111-111111111111',
  'fsp',
  'test-another-session'
);

-- Check if short session was NOT counted:
SELECT
  session_token,
  duration_seconds,
  counted_toward_usage,
  CASE
    WHEN counted_toward_usage = false THEN '✅ Not counted (correct)'
    ELSE '❌ Counted (wrong!)'
  END as status
FROM simulation_usage_logs
WHERE session_token = 'test-short-session';

-- Expected:
-- duration_seconds < 600
-- counted_toward_usage = false
-- status = '✅ Not counted (correct)'
-- ✅ Short sessions are not counted!

-- ============================================
-- TEST 7: View all active sessions
-- ============================================
SELECT * FROM active_simulation_sessions;

-- Expected: Each user should have at most 1 active session

-- ============================================
-- TEST 8: Verify no user has multiple active sessions
-- ============================================
SELECT
  user_id,
  COUNT(*) as active_sessions,
  ARRAY_AGG(session_token) as session_tokens,
  CASE
    WHEN COUNT(*) > 1 THEN '❌ VIOLATION: Multiple active sessions!'
    WHEN COUNT(*) = 1 THEN '✅ One active session'
    ELSE '✅ No active sessions'
  END as status
FROM simulation_usage_logs
WHERE ended_at IS NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Expected: Empty result (no violations)
-- If any rows appear, it means the constraint failed!

-- ============================================
-- TEST 9: Verify unique index exists
-- ============================================
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_one_active_session_per_user';

-- Expected: One row showing the unique partial index

-- ============================================
-- TEST 10: Verify function security and grants
-- ============================================
SELECT
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as security_mode,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as can_execute_authenticated,
  has_function_privilege('anon', p.oid, 'EXECUTE') as can_execute_anonymous
FROM pg_proc p
WHERE p.proname = 'start_simulation_session';

-- Expected:
-- security_mode: ✅ SECURITY DEFINER
-- can_execute_authenticated: true
-- can_execute_anonymous: false

-- ============================================
-- TEST 11: Race condition test (requires two connections)
-- ============================================
-- Open two SQL connections and run simultaneously:

-- Connection 1:
BEGIN;
SELECT start_simulation_session(
  '11111111-1111-1111-1111-111111111111',
  'kp',
  'race-test-1'
);
-- Don't commit yet...

-- Connection 2 (while Connection 1 is uncommitted):
BEGIN;
SELECT start_simulation_session(
  '11111111-1111-1111-1111-111111111111',
  'fsp',
  'race-test-2'
);
-- This should WAIT due to row lock...

-- Back to Connection 1:
COMMIT;

-- Now Connection 2 should complete successfully
-- The unique index ensures only one can be active

-- Verify:
SELECT session_token, ended_at
FROM simulation_usage_logs
WHERE session_token LIKE 'race-test-%'
ORDER BY started_at;

-- Expected: One has ended_at NOT NULL, the other is active
-- ✅ Race condition handled correctly!

-- ============================================
-- CLEANUP: Remove test data
-- ============================================
DELETE FROM simulation_usage_logs
WHERE session_token LIKE 'test-%' OR session_token LIKE 'race-test-%';

-- ============================================
-- SUMMARY
-- ============================================
-- After running these tests, you should verify:
-- ✅ Users CANNOT start simulations for other users (auth check)
-- ✅ First simulation starts successfully
-- ✅ Starting second simulation auto-ends the first one
-- ✅ Database constraint prevents manual INSERT of concurrent sessions
-- ✅ Auto-ended sessions >= 10 minutes are counted
-- ✅ Auto-ended sessions < 10 minutes are NOT counted
-- ✅ Active sessions view shows max 1 per user
-- ✅ No user has multiple active sessions
-- ✅ Unique index exists and enforces constraint
-- ✅ Function has correct security mode and grants
-- ✅ Race conditions are handled correctly
