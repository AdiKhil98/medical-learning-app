# Migration Guide - Applying Critical Security Fixes

## Prerequisites
- Access to your Supabase project dashboard
- Navigate to: **SQL Editor** in Supabase Dashboard

---

## ⚠️ IMPORTANT: Migration Order

Apply these migrations **IN THIS EXACT ORDER**. Each migration builds on the previous one.

---

## Migration 1: Add Subscription Period Tracking
**File**: `supabase/migrations/add_subscription_period_tracking.sql`

**What it does**:
- Adds columns for tracking billing periods
- Creates monthly counter reset function
- Creates admin counter reset function

**How to apply**:
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire contents of `add_subscription_period_tracking.sql`
4. Paste into SQL Editor
5. Click "Run" or press Ctrl/Cmd + Enter
6. ✅ Verify: Should see "Success. No rows returned"

**Verification**:
```sql
-- Check if new columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('subscription_period_start', 'subscription_period_end', 'last_counter_reset');
```
Expected: 3 rows returned

---

## Migration 2: Fix Function Authorization
**File**: `supabase/migrations/fix_function_authorization.sql`

**What it does**:
- Adds authorization checks to `increment_free_simulations()`
- Adds authorization checks to `increment_monthly_simulations()`
- Prevents users from manipulating other users' counters
- Adds row locks to prevent race conditions

**How to apply**:
1. Open new SQL Editor query
2. Copy entire contents of `fix_function_authorization.sql`
3. Paste and run
4. ✅ Verify: Should see "Success. No rows returned"

**Verification**:
```sql
-- Check function security mode
SELECT
  proname as function_name,
  CASE prosecdef
    WHEN true THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as security_mode
FROM pg_proc
WHERE proname IN ('increment_free_simulations', 'increment_monthly_simulations');
```
Expected: 2 rows, both showing "✅ SECURITY DEFINER"

---

## Migration 3: Fix RLS Policies
**File**: `supabase/migrations/fix_rls_policies.sql`

**What it does**:
- Restricts user ability to update subscription fields
- Creates granular policies for safe vs protected fields
- Adds subscription change audit logging
- Prevents privilege escalation

**How to apply**:
1. Open new SQL Editor query
2. Copy entire contents of `fix_rls_policies.sql`
3. Paste and run
4. ✅ Verify: Should see "Success. No rows returned"

**Verification**:
```sql
-- Check policies on users table
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'UPDATE'
ORDER BY policyname;
```
Expected: 3 policies
- "Users can update safe profile fields"
- "Service role can update subscription fields"
- "Admins can update any user"

---

## Migration 4: Fix mark_simulation_counted
**File**: `supabase/migrations/fix_mark_simulation_counted.sql`

**What it does**:
- Adds row locks to prevent race conditions
- Adds authorization checks
- Prevents double-counting from concurrent calls

**How to apply**:
1. Open new SQL Editor query
2. Copy entire contents of `fix_mark_simulation_counted.sql`
3. Paste and run
4. ✅ Verify: Should see "Success. No rows returned"

**Verification**:
```sql
-- Check function exists and has correct security
SELECT
  proname as function_name,
  CASE prosecdef
    WHEN true THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as security_mode
FROM pg_proc
WHERE proname = 'mark_simulation_counted';
```
Expected: 1 row showing "✅ SECURITY DEFINER"

---

## Migration 5: Fix Concurrent Sessions
**File**: `supabase/migrations/fix_concurrent_sessions.sql`

**What it does**:
- Auto-ends previous active sessions when starting new one
- Adds unique constraint: one active session per user
- Prevents users from gaming system with multiple simulations

**How to apply**:
1. Open new SQL Editor query
2. Copy entire contents of `fix_concurrent_sessions.sql`
3. Paste and run
4. ✅ Verify: Should see "Success. No rows returned"

**Verification**:
```sql
-- Check unique index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname = 'idx_one_active_session_per_user';
```
Expected: 1 row

```sql
-- Check active sessions view exists
SELECT * FROM active_simulation_sessions LIMIT 1;
```
Expected: Should work without error (may return 0 or more rows)

---

## Migration 6: Create Counter Reconciliation
**File**: `supabase/migrations/create_counter_reconciliation.sql`

**What it does**:
- Creates system to detect counter discrepancies
- Adds reconciliation functions for fixing mismatches
- Creates audit log for reconciliation actions
- Adds health check view

**How to apply**:
1. Open new SQL Editor query
2. Copy entire contents of `create_counter_reconciliation.sql`
3. Paste and run
4. ✅ Verify: Should see "Success. No rows returned"

**Verification**:
```sql
-- Check views exist
SELECT * FROM counter_health_check;
```
Expected: 1 row showing stats (total_users, users_with_discrepancies, etc.)

```sql
-- Check discrepancies view
SELECT COUNT(*) as discrepancy_count FROM counter_discrepancies;
```
Expected: Number (could be 0 or more)

---

## Migration 7: Handle Multiple Subscriptions
**File**: `supabase/migrations/handle_multiple_subscriptions.sql`

**What it does**:
- Creates `user_subscriptions` table for ALL subscriptions
- Automatic primary subscription selection
- Migrates existing subscriptions automatically
- Prevents downgrade bug

**How to apply**:
1. Open new SQL Editor query
2. Copy entire contents of `handle_multiple_subscriptions.sql`
3. Paste and run
4. ✅ Verify: Should see "Success. No rows returned"

**Verification**:
```sql
-- Check table exists
SELECT COUNT(*) as subscription_count FROM user_subscriptions;
```
Expected: Number of subscriptions (existing ones should be migrated)

```sql
-- Check overview view
SELECT * FROM user_subscriptions_overview LIMIT 5;
```
Expected: Shows users with subscription data

---

## Final Verification - Run All Checks

After applying all migrations, run this comprehensive check:

```sql
-- 1. Check all new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'subscription_change_audit',
    'function_audit_log',
    'counter_reconciliation_log',
    'user_subscriptions'
  )
ORDER BY table_name;
```
Expected: 4 rows

```sql
-- 2. Check all new functions exist
SELECT proname
FROM pg_proc
WHERE proname IN (
  'check_and_reset_monthly_counter',
  'increment_free_simulations',
  'increment_monthly_simulations',
  'mark_simulation_counted',
  'start_simulation_session',
  'reconcile_user_counter',
  'reconcile_all_counters',
  'upsert_subscription_from_webhook',
  'sync_primary_subscription_to_user'
)
ORDER BY proname;
```
Expected: 9 rows

```sql
-- 3. Check all new views exist
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'counter_discrepancies',
    'counter_health_check',
    'user_subscriptions_overview',
    'active_simulation_sessions'
  )
ORDER BY table_name;
```
Expected: 4 rows

---

## ✅ Migration Complete!

If all verifications pass, your database is now secured and all critical fixes are applied!

**Next Steps**:
1. ✅ Migrations applied
2. ⏭️ Update webhook code (see `WEBHOOK_INTEGRATION_GUIDE.md`)
3. ⏭️ Run test files to verify functionality
4. ⏭️ Set up monitoring with new views

---

## Troubleshooting

### Error: "relation already exists"
**Solution**: Migration was partially applied. You can:
1. Skip that specific CREATE statement, or
2. Run only the part that failed

### Error: "function already exists"
**Solution**: Replace `CREATE OR REPLACE FUNCTION` statements are safe to re-run

### Error: "permission denied"
**Solution**: Make sure you're running as a user with sufficient privileges (usually service_role or postgres)

### Check Migration Status
```sql
-- See what tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- See what functions exist
SELECT proname
FROM pg_proc
WHERE proname LIKE '%simulation%' OR proname LIKE '%subscription%'
ORDER BY proname;
```

---

## Need Help?

If you encounter any errors:
1. Copy the exact error message
2. Note which migration file failed
3. Check if it was partially applied
4. Share the error for troubleshooting
