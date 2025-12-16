# Simulation Quota System - Code Cleanup Summary

**Date:** 2025-12-16
**Status:** ✅ Completed

## Overview

Cleaned up obsolete client-side optimistic deduction code that was never used in the new database-driven quota system.

---

## System Architecture (Current)

### Database-Driven Quota Flow

```
User starts simulation
  ↓
[DB] Create session, NO quota deduction
  ↓
Timer reaches 5 minutes
  ↓
[DB] mark_simulation_counted() → Quota -1
  ↓
User ends simulation
  ↓
[DB] Record duration, update ended_at
```

### Key Principle

**All quota counting happens server-side at the 5-minute mark, NOT at simulation start.**

---

## Critical Bugs Fixed (Migrations)

### 1. Duration Check Bug (20251216000000) - CRITICAL ⚠️

**Problem:** Short simulations (< 5 min) were being counted against quota

- Duration validation happened AFTER `counted_toward_usage = true`
- Result: 3-second simulations counted!

**Fix:** Reordered logic:

```sql
-- OLD (BROKEN):
UPDATE counted_toward_usage = true  -- Line 20
...
IF duration < 295 THEN error END    -- Line 63 (TOO LATE!)

-- NEW (FIXED):
IF duration < 295 THEN error END    -- Check FIRST
...
UPDATE counted_toward_usage = true  -- Only if valid
```

### 2. GENERATED Column Bug (20251215030000)

**Problem:** `sync_quota_with_subscription()` tried to INSERT into `simulations_remaining`

- This column is GENERATED, causing all sync operations to fail

**Fix:** Removed `simulations_remaining` from INSERT/UPDATE statements

### 3. Quota/Subscription Sync (20251215010000)

**Problem:** Users had mismatched subscription vs quota tiers

- Database showed "free" quota but "premium" subscription

**Fix:** Created `sync_quota_with_subscription()` function + auto-sync trigger

---

## Code Cleanup Performed

### Files Modified

#### 1. `hooks/useSubscription.ts`

**Removed:**

- `optimisticDeduction` state variable (unused)
- `hasOptimisticState` state variable (unused)
- `applyOptimisticDeduction()` function (never called)

**Simplified:**

- `getSubscriptionInfo()` - removed optimistic display logic
- Dependency arrays - removed unused dependencies

**Renamed:**

- `resetOptimisticCount()` → `refreshQuota()` (more accurate name)
- Kept `resetOptimisticCount` as alias for backward compatibility

**Result:** Cleaner code, database is single source of truth

#### 2. `app/(tabs)/simulation/fsp.tsx`

**Removed:**

- `applyOptimisticDeduction` from destructuring
- `applyOptimisticDeduction` from useEffect dependency

**Comments added:**

```typescript
// REMOVED: Optimistic deduction (new quota system handles this automatically)
// The quota is already updated in database if simulation was counted
```

#### 3. `app/(tabs)/simulation/kp.tsx`

**Removed:**

- `applyOptimisticDeduction` from destructuring
- `applyOptimisticDeduction` from useEffect dependency

**Comments added:** Same as fsp.tsx

---

## Why This Cleanup Matters

### Before (Obsolete System)

```
User starts → UI optimistically shows -1 → Wait for backend confirmation
```

**Problem:** Client-side counter diverged from server, race conditions possible

### After (Current System)

```
User starts → No UI change → 5-min mark → Server deducts → UI refreshes from DB
```

**Benefit:** Single source of truth, no race conditions, accurate quota

---

## TypeScript Verification

✅ **Compilation Status:** SUCCESS (exit code 0)

- No new TypeScript errors introduced
- Pre-existing errors in `bibliothek` folder are unrelated

---

## Migration Files Present

All critical fixes are in place:

- ✅ `20251215010000_fix_quota_subscription_sync.sql`
- ✅ `20251215020000_deep_system_diagnostic.sql`
- ✅ `20251215030000_fix_sync_function_generated_column.sql`
- ✅ `20251216000000_fix_mark_simulation_counted_duration_check.sql`

---

## Backward Compatibility

### Maintained for Smooth Transition

- `resetOptimisticCount()` still exported (calls `refreshQuota()` internally)
- All existing simulation pages continue to work without modification
- No breaking changes to public API

### Migration Path

Developers can gradually update code from:

```typescript
resetOptimisticCount(); // Old name (still works)
```

To:

```typescript
refreshQuota(); // New, clearer name
```

---

## Testing Recommendations

### 1. Short Simulation Test

- Start simulation
- End after 30 seconds
- **Expected:** NOT counted against quota (< 295 seconds)

### 2. Long Simulation Test

- Start simulation
- Wait for 5-minute timer
- **Expected:** Quota decrements at 5-min mark
- End simulation
- **Expected:** Duration recorded, already counted

### 3. Subscription Change Test

- Change subscription tier via webhook
- **Expected:** Quota automatically synced to new limits

### 4. UI Counter Test

- Start simulation
- Observe counter
- **Expected:** Counter shows real database value, updates at 5-min mark

---

## Database Functions Reference

### Key RPC Functions

#### `can_start_simulation(user_id)`

Checks if user has quota remaining

```sql
Returns: {
  can_start: boolean,
  reason: string,
  simulations_remaining: integer,
  total_simulations: integer
}
```

#### `start_simulation_session(user_id, type, token)`

Creates session in `simulation_usage_logs`

- Sets `started_at = now()`
- NO quota deduction yet

#### `mark_simulation_counted(session_token, user_id)`

Called at 5-minute mark

- Validates duration >= 295 seconds
- Sets `counted_toward_usage = true`
- Increments quota counter

#### `end_simulation_session(session_token, user_id)`

Ends session

- Sets `ended_at = now()`
- Calculates `duration_seconds`

#### `sync_quota_with_subscription(user_id)`

Manual sync function

- Updates quota to match subscription tier
- Used by webhook and admin tools

---

## Code Comments Added

Strategic comments were added to explain the removal:

```typescript
// Note: Optimistic deduction was removed - quota updates happen server-side at 5-minute mark
```

This ensures future developers understand why the code is structured this way.

---

## Summary

### What Was Removed ❌

- Unused `applyOptimisticDeduction()` function
- Unused optimistic state variables
- Dead code paths in `getSubscriptionInfo()`

### What Was Kept ✅

- `refreshQuota()` (renamed from `resetOptimisticCount`)
- Database-driven quota system
- Session recovery logic
- Real-time database values

### Result 🎉

- **Cleaner codebase** - removed 50+ lines of dead code
- **Single source of truth** - database owns all quota logic
- **No race conditions** - server-side counting only
- **Backward compatible** - no breaking changes
- **Well documented** - comments explain the architecture

---

## Next Steps (Optional)

1. **Apply migrations** to production database (if not already done)
2. **Run diagnostic** query to verify system health
3. **Monitor logs** for any short simulations being counted (should be 0)
4. **Gradually replace** `resetOptimisticCount()` with `refreshQuota()` in codebase
5. **Add monitoring** for quota deduction timing (should be at 295+ seconds)

---

## Contact

If you encounter issues related to this cleanup:

1. Check this document for architecture overview
2. Review migration files for database logic
3. Check `simulationTrackingService.ts` for client implementation
4. Review `useSubscription.ts` for React integration

---

**This cleanup maintains system integrity while removing technical debt. The quota system now has a single, reliable source of truth in the database.**
