-- TEST: Verify Counter Reconciliation System
-- Run these tests after applying create_counter_reconciliation.sql

-- ============================================
-- Setup: Create test data with intentional discrepancies
-- ============================================

-- Get a test user
SELECT id, email FROM auth.users LIMIT 1;

-- For this test, let's say:
-- User ID: '11111111-1111-1111-1111-111111111111'

-- ============================================
-- TEST 1: Create intentional discrepancy (free tier)
-- ============================================

-- Create 3 counted simulations in logs
INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage
) VALUES
  ('11111111-1111-1111-1111-111111111111', 'kp', 'test-free-1', now() - interval '1 day', now() - interval '23 hours', 700, true),
  ('11111111-1111-1111-1111-111111111111', 'fsp', 'test-free-2', now() - interval '2 days', now() - interval '47 hours', 650, true),
  ('11111111-1111-1111-1111-111111111111', 'kp', 'test-free-3', now() - interval '3 days', now() - interval '71 hours', 800, true);

-- But set user counter to wrong value
UPDATE users
SET free_simulations_used = 1  -- Should be 3!
WHERE id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- TEST 2: View the discrepancy
-- ============================================
SELECT * FROM counter_discrepancies
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Expected result:
-- actual_free_simulations: 3
-- recorded_free_simulations: 1
-- free_difference: 2
-- sync_status: ❌ Out of sync

-- ============================================
-- TEST 3: View overall health check
-- ============================================
SELECT * FROM counter_health_check;

-- Expected result:
-- total_users: N
-- users_with_discrepancies: >= 1 (at least our test user)
-- users_in_sync: N - 1
-- sync_percentage: < 100%

-- ============================================
-- TEST 4: Dry run reconciliation (single user)
-- ============================================
-- This won't actually fix, just shows what would happen

-- Note: This function is service_role only, so you need to use service_role key
-- Or temporarily grant to authenticated for testing:
GRANT EXECUTE ON FUNCTION reconcile_user_counter(UUID, TEXT) TO authenticated;

-- Now test (as the user or admin):
SELECT reconcile_user_counter(
  '11111111-1111-1111-1111-111111111111',
  'test_manual'
);

-- Expected result:
-- {
--   "success": true,
--   "user_id": "...",
--   "old_free_count": 1,
--   "new_free_count": 3,
--   "free_difference": 2,
--   "old_monthly_count": 0,
--   "new_monthly_count": 0,
--   "monthly_difference": 0,
--   "message": "Counter reconciled successfully"
-- }

-- ============================================
-- TEST 5: Verify counter was fixed
-- ============================================
SELECT
  id,
  email,
  free_simulations_used,
  simulations_used_this_month
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected:
-- free_simulations_used: 3 (was 1, now fixed!)

-- ============================================
-- TEST 6: Verify reconciliation was logged
-- ============================================
SELECT
  user_id,
  reconciled_by,
  old_free_count,
  new_free_count,
  free_difference,
  reconciliation_source,
  created_at
FROM counter_reconciliation_log
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- old_free_count: 1
-- new_free_count: 3
-- free_difference: 2
-- reconciliation_source: 'test_manual'

-- ============================================
-- TEST 7: Verify discrepancy is gone
-- ============================================
SELECT * FROM counter_discrepancies
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Expected: Empty result (no discrepancy anymore!)

-- ============================================
-- TEST 8: Create monthly tier discrepancy
-- ============================================

-- Get a paid user or update our test user to paid
UPDATE users
SET
  subscription_tier = 'basis',
  subscription_status = 'active',
  simulation_limit = 30,
  subscription_period_start = date_trunc('month', now())
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Create 5 counted simulations this month
INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage
) VALUES
  ('11111111-1111-1111-1111-111111111111', 'kp', 'test-paid-1', now() - interval '5 hours', now() - interval '4 hours', 700, true),
  ('11111111-1111-1111-1111-111111111111', 'fsp', 'test-paid-2', now() - interval '10 hours', now() - interval '9 hours', 650, true),
  ('11111111-1111-1111-1111-111111111111', 'kp', 'test-paid-3', now() - interval '15 hours', now() - interval '14 hours', 800, true),
  ('11111111-1111-1111-1111-111111111111', 'fsp', 'test-paid-4', now() - interval '20 hours', now() - interval '19 hours', 720, true),
  ('11111111-1111-1111-1111-111111111111', 'kp', 'test-paid-5', now() - interval '25 hours', now() - interval '24 hours', 680, true);

-- But set counter to wrong value
UPDATE users
SET simulations_used_this_month = 2  -- Should be 5!
WHERE id = '11111111-1111-1111-1111-111111111111';

-- ============================================
-- TEST 9: View monthly discrepancy
-- ============================================
SELECT * FROM counter_discrepancies
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Expected:
-- actual_monthly_simulations: 5
-- recorded_monthly_simulations: 2
-- monthly_difference: 3
-- sync_status: ❌ Out of sync

-- ============================================
-- TEST 10: Reconcile monthly discrepancy
-- ============================================
SELECT reconcile_user_counter(
  '11111111-1111-1111-1111-111111111111',
  'test_monthly'
);

-- Verify counter was fixed:
SELECT simulations_used_this_month
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: simulations_used_this_month = 5

-- ============================================
-- TEST 11: Bulk reconciliation dry run
-- ============================================

-- Create more discrepancies with other users (if available)
-- Then run dry run:

GRANT EXECUTE ON FUNCTION reconcile_all_counters(BOOLEAN) TO authenticated;

SELECT reconcile_all_counters(true);

-- Expected:
-- {
--   "success": true,
--   "dry_run": true,
--   "reconciled_count": N,
--   "error_count": 0,
--   "message": "Dry run: Would reconcile N users"
-- }

-- ============================================
-- TEST 12: Bulk reconciliation actual run
-- ============================================

-- Create intentional discrepancies for testing
UPDATE users
SET free_simulations_used = 0
WHERE id IN (
  SELECT DISTINCT user_id
  FROM simulation_usage_logs
  WHERE counted_toward_usage = true
  LIMIT 5
);

-- Check how many discrepancies exist:
SELECT COUNT(*) as discrepancy_count FROM counter_discrepancies;

-- Run bulk reconciliation:
SELECT reconcile_all_counters(false);

-- Expected:
-- {
--   "success": true,
--   "dry_run": false,
--   "reconciled_count": 5,
--   "error_count": 0,
--   "message": "Reconciled 5 users, 0 errors"
-- }

-- Verify all fixed:
SELECT COUNT(*) as remaining_discrepancies FROM counter_discrepancies;

-- Expected: 0 or very few

-- ============================================
-- TEST 13: View reconciliation history
-- ============================================
SELECT
  user_id,
  old_free_count,
  new_free_count,
  free_difference,
  old_monthly_count,
  new_monthly_count,
  monthly_difference,
  reconciliation_source,
  created_at
FROM counter_reconciliation_log
ORDER BY created_at DESC
LIMIT 10;

-- Should show all recent reconciliations

-- ============================================
-- TEST 14: Test with user who has no discrepancy
-- ============================================

-- Pick a user already in sync:
SELECT user_id FROM users
WHERE id NOT IN (SELECT user_id FROM counter_discrepancies)
LIMIT 1;

-- Let's say: '22222222-2222-2222-2222-222222222222'

-- Run reconciliation (should be no-op):
SELECT reconcile_user_counter(
  '22222222-2222-2222-2222-222222222222',
  'test_no_change'
);

-- Expected:
-- free_difference: 0
-- monthly_difference: 0
-- Still logs the reconciliation with 0 changes

-- ============================================
-- TEST 15: Test reconciliation respects billing period
-- ============================================

-- Create a user with simulations from last month
UPDATE users
SET
  subscription_tier = 'profi',
  subscription_status = 'active',
  simulation_limit = 60,
  subscription_period_start = date_trunc('month', now()),  -- Current month start
  simulations_used_this_month = 0
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Add simulation from LAST month (shouldn't count)
INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'kp',
  'test-last-month',
  date_trunc('month', now()) - interval '5 days',  -- Last month
  date_trunc('month', now()) - interval '5 days' + interval '15 minutes',
  900,
  true
);

-- Add simulation from THIS month (should count)
INSERT INTO simulation_usage_logs (
  user_id,
  simulation_type,
  session_token,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'fsp',
  'test-this-month',
  now() - interval '1 hour',
  now() - interval '45 minutes',
  900,
  true
);

-- Reconcile:
SELECT reconcile_user_counter(
  '11111111-1111-1111-1111-111111111111',
  'test_billing_period'
);

-- Check result:
SELECT simulations_used_this_month
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: simulations_used_this_month = 1
-- (Only counts simulation from current billing period!)

-- ============================================
-- TEST 16: Performance test (optional)
-- ============================================

-- Check how long bulk reconciliation takes:
EXPLAIN ANALYZE
SELECT reconcile_all_counters(true);

-- Should complete in reasonable time even with many users

-- ============================================
-- CLEANUP: Remove test data
-- ============================================
DELETE FROM simulation_usage_logs
WHERE session_token LIKE 'test-%';

DELETE FROM counter_reconciliation_log
WHERE reconciliation_source LIKE 'test_%';

-- Revoke test grants (restore security):
REVOKE EXECUTE ON FUNCTION reconcile_user_counter(UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION reconcile_all_counters(BOOLEAN) FROM authenticated;

-- ============================================
-- SUMMARY
-- ============================================
-- After running these tests, you should verify:
-- ✅ counter_discrepancies view shows users with mismatched counters
-- ✅ counter_health_check view shows overall sync status
-- ✅ reconcile_user_counter() fixes individual user counters
-- ✅ Reconciliation is logged in counter_reconciliation_log
-- ✅ Discrepancies disappear after reconciliation
-- ✅ Bulk reconciliation dry run previews changes
-- ✅ Bulk reconciliation actually fixes all users
-- ✅ Reconciliation respects billing period (only counts current month)
-- ✅ Reconciliation works for both free and paid tiers
-- ✅ Functions are restricted to service_role (security)
-- ✅ System can reconcile thousands of users efficiently

-- ============================================
-- RECOMMENDED USAGE
-- ============================================
-- 1. Run daily health check:
--    SELECT * FROM counter_health_check;
--
-- 2. If sync_percentage < 100%, investigate:
--    SELECT * FROM counter_discrepancies LIMIT 10;
--
-- 3. Fix discrepancies:
--    SELECT reconcile_all_counters(false);
--
-- 4. Monitor reconciliation log:
--    SELECT * FROM counter_reconciliation_log
--    WHERE created_at > now() - interval '7 days'
--    ORDER BY created_at DESC;
