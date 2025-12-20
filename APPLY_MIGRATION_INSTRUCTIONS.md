# HOW TO APPLY THE QUOTA FIX MIGRATION

## The Problem

The `mark_simulation_counted()` function was never actually applied to your database.
This is why simulations passing 5 minutes are not being counted toward your quota.

## The Fix

Apply the migration through the Supabase Dashboard:

### Step 1: Copy the Migration SQL

Open the file:

```
supabase/migrations/20251220000002_fix_mark_counted_update_quota_directly.sql
```

Copy ALL the contents of this file.

### Step 2: Apply in Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Paste the entire migration SQL
6. Click "Run" (or press Ctrl+Enter)

### Step 3: Verify It Worked

Run this command after applying:

```bash
node scripts/diagnose-quota-increment-failure.js
```

You should see:

- ✅ mark_simulation_counted function exists
- ✅ Updates user_simulation_quota directly: YES

### Step 4: Test

1. Hard refresh your browser (Ctrl+Shift+R)
2. Start a new simulation
3. Wait for it to pass the 5-minute mark
4. Quota should increment from 29 → 30

## What This Migration Does

- Rewrites `mark_simulation_counted()` to update `user_simulation_quota.simulations_used` DIRECTLY
- Bypasses the broken sync trigger
- Ensures simulations are counted when they pass 295 seconds (5 minutes)

## Technical Details

**Before (BROKEN):**

```
mark_simulation_counted() → Updates users.free_simulations_used
                         → Relies on sync trigger (BROKEN)
                         → user_simulation_quota never updates ❌
```

**After (FIXED):**

```
mark_simulation_counted() → Updates user_simulation_quota.simulations_used DIRECTLY ✅
```
