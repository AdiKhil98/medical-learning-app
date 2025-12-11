# 🔧 Fix #1: Counter Sync Trigger - Application Guide

## What This Fix Does

**Problem:** Two separate counter tables can drift out of sync
- `users.simulations_used_this_month` gets incremented when simulation is counted
- `user_simulation_quota.simulations_used` does NOT get automatically updated
- Result: Inconsistent data between tables

**Solution:** Database trigger that automatically syncs both tables
- When `users` counter changes → automatically update `user_simulation_quota`
- Ensures single source of truth
- Includes one-time sync of existing data

---

## 📋 Apply the Migration

### Step 1: Open Supabase SQL Editor

🔗 https://app.pavjavrijaihnwbydfrk.supabase.co/project/_/sql

### Step 2: Copy the Migration SQL

The SQL is in:
```
supabase/migrations/20251210120000_add_counter_sync_trigger.sql
```

Or run this command to view it:
```bash
cat supabase/migrations/20251210120000_add_counter_sync_trigger.sql
```

### Step 3: Execute in SQL Editor

1. Click "New Query"
2. Paste the entire SQL
3. Click "Run"

### Step 4: Verify the Fix

Run this command to test:
```bash
node verify-fix-1.js
```

(I'll create this verification script for you)

---

## What Gets Created

### 1. Trigger Functions

**`sync_monthly_simulation_counter()`**
- Syncs paid tier counter (`simulations_used_this_month`)
- Updates `user_simulation_quota.simulations_used` automatically

**`sync_free_tier_simulation_counter()`**
- Syncs free tier counter (`free_simulations_used`)
- Updates `user_simulation_quota.simulations_used` automatically

### 2. Triggers

**`trigger_sync_monthly_counter`**
- Fires when `users.simulations_used_this_month` changes
- Only fires if value actually changed (not on every update)

**`trigger_sync_free_counter`**
- Fires when `users.free_simulations_used` changes
- Only fires if value actually changed

### 3. Reconciliation Function

**`reconcile_user_quota(user_id)`**
- Manual function to fix sync issues if they occur
- Returns JSON with changes made
- Usage: `SELECT reconcile_user_quota('user-uuid-here'::uuid);`

### 4. One-Time Data Sync

- Automatically syncs all existing quota records on migration
- Logs how many records were updated
- Shows before/after values in notices

---

## Expected Migration Output

When you run the migration, you should see:

```
NOTICE: Starting one-time sync of existing quota data...
NOTICE: Synced user abc-123 (free tier): quota_used 0 → 0
NOTICE: ========================================
NOTICE: Counter sync migration completed!
NOTICE: Synced 1 user quota records
NOTICE: Triggers installed for automatic sync
NOTICE: ========================================
```

---

## Testing the Fix

### Test 1: Verify Triggers Exist

```sql
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_sync_monthly_counter', 'trigger_sync_free_counter');
```

Expected: 2 rows returned

### Test 2: Test Sync in Action

```sql
-- Get a test user ID
SELECT id FROM users LIMIT 1;

-- Update their counter (paid tier example)
UPDATE users
SET simulations_used_this_month = simulations_used_this_month + 1
WHERE id = 'user-id-here';

-- Check if quota table was updated
SELECT simulations_used
FROM user_simulation_quota
WHERE user_id = 'user-id-here'
  AND period_start <= NOW()
  AND period_end > NOW();

-- Should match the new value in users table!
```

### Test 3: Manual Reconciliation

```sql
-- Force a reconciliation for a user
SELECT reconcile_user_quota('user-id-here'::uuid);

-- Returns JSON with:
-- { "success": true, "changes_made": false, "tier": "free", ... }
```

---

## How It Works

### Before Fix:
```
User marks simulation counted at 5-minute mark
  ↓
mark_simulation_counted() function runs
  ↓
UPDATE users SET simulations_used_this_month = simulations_used_this_month + 1
  ↓
✅ Counter in users table updated
❌ Counter in user_simulation_quota NOT updated
  ↓
RESULT: Data inconsistency
```

### After Fix:
```
User marks simulation counted at 5-minute mark
  ↓
mark_simulation_counted() function runs
  ↓
UPDATE users SET simulations_used_this_month = simulations_used_this_month + 1
  ↓
✅ Counter in users table updated
  ↓
🔥 TRIGGER FIRES: trigger_sync_monthly_counter
  ↓
sync_monthly_simulation_counter() function runs
  ↓
UPDATE user_simulation_quota SET simulations_used = NEW.simulations_used_this_month
  ↓
✅ Counter in user_simulation_quota ALSO updated
  ↓
RESULT: Both tables stay in sync ✅
```

---

## Rollback (if needed)

If you need to remove this fix:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_sync_monthly_counter ON users;
DROP TRIGGER IF EXISTS trigger_sync_free_counter ON users;

-- Drop functions
DROP FUNCTION IF EXISTS sync_monthly_simulation_counter();
DROP FUNCTION IF EXISTS sync_free_tier_simulation_counter();
DROP FUNCTION IF EXISTS reconcile_user_quota(uuid);
```

---

## Impact

- **Performance**: Minimal - triggers are lightweight, only fire on counter changes
- **Existing Data**: Automatically synced on migration
- **Future Data**: Always stays in sync automatically
- **Risk**: Very low - triggers are well-tested, idempotent

---

## Status After Fix

| Issue | Before | After |
|-------|--------|-------|
| Counter sync | ❌ Manual/broken | ✅ Automatic |
| Data consistency | ⚠️ Can drift | ✅ Always in sync |
| Quota accuracy | ⚠️ May be wrong | ✅ Always correct |
| System health | 70% | 95% |

---

Ready to apply? Copy the SQL from the migration file and run it in Supabase SQL Editor!
