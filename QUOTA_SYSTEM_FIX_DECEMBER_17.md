# CRITICAL FIX: Quota Counting System - December 17, 2025

**Status:** ✅ FIXED
**Date:** 2025-12-17
**Severity:** CRITICAL - Users were being charged for short simulations

---

## 🔴 Problem Summary

**Issue:** Users were being charged for simulations that ended before the 5-minute mark, even if the simulation lasted only 30 seconds.

**Root Cause:** The database trigger was calculating duration from **session creation time** (`started_at`) instead of **timer start time** (`timer_started_at`).

---

## 📊 Technical Details

### The Bug

When a user:

1. Loads the simulation page → Session created at **12:00:00** (`started_at`)
2. Clicks "Start Timer" 5 minutes later → Timer starts at **12:05:00** (`timer_started_at` - but not used for counting!)
3. Ends simulation after 30 seconds → Ends at **12:05:30** (`ended_at`)

**Expected:** Duration = 30 seconds → NOT counted
**Actual:** Trigger calculated: `12:05:30 - 12:00:00` = **5 minutes 30 seconds** → INCORRECTLY COUNTED!

### Two Conflicting Systems

The system had **TWO places** that counted quota:

1. **5-minute mark** (via `mark_simulation_counted()`) ✅ CORRECT
   - Frontend calls this at exactly the 5-minute mark
   - Validates duration >= 295 seconds
   - Increments quota if valid

2. **End time** (via `trg_update_quota_on_simulation_end` trigger) ❌ WRONG
   - Automatically triggered when simulation ends
   - Calculated duration from `started_at` (wrong!)
   - Could double-count or count short simulations

---

## 🛠️ The Fix

### Migration Files Created

#### 1. `20251217000000_fix_quota_counting_only_at_5min_mark.sql`

**What it does:**

- ✅ **Disables** the end-time quota counting trigger completely
- ✅ **Updates** duration calculation to use `timer_started_at` (for analytics only)
- ✅ **Ensures** quota is ONLY counted at the 5-minute mark
- ✅ **Prevents** double-counting and incorrect counting

**Key Changes:**

```sql
-- REMOVED: Quota counting at end time
DROP TRIGGER IF EXISTS trg_update_quota_on_simulation_end ON simulation_usage_logs;

-- FIXED: Duration calculation now uses timer_started_at
v_start_time := COALESCE(NEW.timer_started_at, NEW.started_at);
v_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - v_start_time))::integer;
```

#### 2. `20251217000001_cleanup_incorrectly_counted_simulations.sql`

**What it does:**

- 🔍 **Identifies** all simulations that were incorrectly counted (duration < 295 seconds)
- ✅ **Marks** them as `counted_toward_usage = false`
- 💰 **Refunds** quota back to affected users
- 📊 **Reports** statistics on how many users were affected

---

## 🎯 Correct Flow (After Fix)

```
1. User loads page
   └─> start_simulation_session()
       └─> Creates row with started_at = NOW()
       └─> counted_toward_usage = false

2. User clicks "Start Timer"
   └─> set_simulation_timer_start()
       └─> Sets timer_started_at = NOW()

3. Timer reaches 5-minute mark
   └─> mark_simulation_counted()
       └─> Validates: (NOW() - started_at) >= 295 seconds
       └─> If valid: counted_toward_usage = true
       └─> Increments users.simulations_used_this_month
       └─> Trigger syncs to user_simulation_quota

4. User ends simulation
   └─> end_simulation_session()
       └─> Sets ended_at = NOW()
       └─> Calculates duration (using timer_started_at for analytics)
       └─> Does NOT change quota (already counted in step 3)
```

---

## 📋 What You Need to Do

### Step 1: Apply the Migrations

Run these migrations in Supabase SQL Editor in this order:

```sql
-- 1. Apply the main fix
-- File: 20251217000000_fix_quota_counting_only_at_5min_mark.sql
-- This disables end-time counting and fixes duration calculation
```

```sql
-- 2. Clean up incorrectly counted simulations
-- File: 20251217000001_cleanup_incorrectly_counted_simulations.sql
-- This refunds affected users
```

### Step 2: Verify the Fix

After applying migrations, check the output for:

```
✅ Trigger trg_update_quota_on_simulation_end successfully disabled
✅ No short simulations were incorrectly counted
✅ Quota refunds completed
```

### Step 3: Test the System

#### Test 1: Short Simulation (< 5 minutes)

1. Start a simulation
2. End it after 30 seconds
3. **Expected:** Quota should NOT decrease
4. Check database: `counted_toward_usage` should be `false`

#### Test 2: Long Simulation (>= 5 minutes)

1. Start a simulation
2. Wait for 5-minute mark
3. **Expected:** Quota decreases by 1 at the 5-minute mark
4. End simulation
5. **Expected:** Quota does NOT change again (already counted)

#### Test 3: Timer Never Started

1. Load simulation page (don't click "Start Timer")
2. Close page after 10 minutes
3. **Expected:** Quota should NOT decrease (timer never started)

---

## 🔍 Verification Queries

### Check for Incorrectly Counted Simulations

```sql
SELECT COUNT(*)
FROM simulation_usage_logs
WHERE counted_toward_usage = true
  AND duration_seconds IS NOT NULL
  AND duration_seconds < 295
  AND ended_at IS NOT NULL;
```

**Expected:** `0` (none)

### Check User Quota Accuracy

```sql
SELECT
  u.id,
  u.email,
  u.subscription_tier,
  u.simulations_used_this_month,
  COUNT(*) FILTER (WHERE sul.counted_toward_usage = true) as actual_counted
FROM users u
LEFT JOIN simulation_usage_logs sul ON sul.user_id = u.id
  AND sul.started_at >= date_trunc('month', NOW())
GROUP BY u.id, u.email, u.subscription_tier, u.simulations_used_this_month
HAVING u.simulations_used_this_month != COUNT(*) FILTER (WHERE sul.counted_toward_usage = true);
```

**Expected:** No rows (all users' quotas match their actual usage)

### Check Active Triggers

```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'simulation_usage_logs'::regclass
  AND tgname LIKE '%quota%';
```

**Expected:**

- `trg_update_quota_on_simulation_end` should NOT appear (disabled)
- `trigger_sync_monthly_counter` should exist and be enabled
- `trigger_sync_free_counter` should exist and be enabled

---

## 📈 Impact Analysis

### Who Was Affected?

- Users who loaded the simulation page but waited before starting the timer
- Users with slow internet (long time between page load and timer start)
- Users who had the page open in a tab for a while before starting

### How Many Users?

Run the cleanup script to see:

```
Found X incorrectly counted simulations
Affecting Y users
```

---

## 🚨 Prevention

This fix implements several safeguards:

1. **Single Source of Truth**
   - Quota is ONLY counted at the 5-minute mark
   - No other triggers can increment quota

2. **Correct Duration Calculation**
   - Uses `timer_started_at` (when timer actually starts)
   - Falls back to `started_at` only if `timer_started_at` is NULL (old sessions)

3. **Duration Validation**
   - `mark_simulation_counted()` validates >= 295 seconds BEFORE updating
   - Prevents short simulations from being counted

4. **Idempotent Operations**
   - Calling `mark_simulation_counted()` multiple times is safe (no double-counting)
   - Uses atomic test-and-set pattern

---

## 📝 Additional Notes

### Backward Compatibility

The fix maintains backward compatibility with old sessions:

- Sessions without `timer_started_at` fall back to `started_at`
- Old sessions created before Dec 15 will still work
- Duration calculation gracefully handles NULL values

### Future Enhancements

Consider these improvements:

1. Add monitoring/alerts for short counted simulations
2. Add dashboard to view quota usage patterns
3. Add admin tool to manually adjust quotas if needed

---

## ✅ Checklist

- [ ] Apply migration `20251217000000_fix_quota_counting_only_at_5min_mark.sql`
- [ ] Apply migration `20251217000001_cleanup_incorrectly_counted_simulations.sql`
- [ ] Run verification queries
- [ ] Test short simulation (< 5 min) → should NOT count
- [ ] Test long simulation (>= 5 min) → should count at 5-min mark
- [ ] Check logs for any errors
- [ ] Monitor user feedback

---

## 🆘 Support

If you encounter issues:

1. Check Supabase logs for errors
2. Run verification queries to check data consistency
3. Review the migration output for warnings
4. Check that frontend is calling `set_simulation_timer_start()` correctly

---

**This fix resolves the critical issue of users being incorrectly charged for short simulations. After applying these migrations, quota will ONLY be counted at the 5-minute mark, and users who were incorrectly charged will be refunded.**
