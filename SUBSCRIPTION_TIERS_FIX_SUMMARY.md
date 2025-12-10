# Subscription Tiers Fix - Complete Summary

## Date: December 10, 2025

## Problem Statement

The subscription tier system had **incorrect** simulation limits and inconsistent tier naming across the codebase. The system was configured with the wrong values that didn't match the business requirements.

### Incorrect Configuration (Before Fix)

| Tier      | Name           | Limit  | Status                                 |
| --------- | -------------- | ------ | -------------------------------------- |
| free      | Free           | 5      | ❌ Wrong (should be 3)                 |
| basis     | Basis-Plan     | 20     | ❌ Wrong (should be "basic" with 30)   |
| profi     | Profi-Plan     | 100    | ❌ Wrong (should be "premium" with 60) |
| unlimited | Unlimited-Plan | -1 (∞) | ❌ Doesn't exist in business model     |

### Correct Configuration (After Fix)

| Tier        | Name         | Limit                    | Status     |
| ----------- | ------------ | ------------------------ | ---------- |
| **free**    | Free-Plan    | **3** simulations/month  | ✅ Correct |
| **basic**   | Basic-Plan   | **30** simulations/month | ✅ Correct |
| **premium** | Premium-Plan | **60** simulations/month | ✅ Correct |

---

## Solution Overview

A comprehensive fix was implemented across **7 key areas**:

1. ✅ Database migration to fix tier limits and names
2. ✅ Webhook handler updated with correct tiers
3. ✅ Client-side quota service updated
4. ✅ Simulation constants updated
5. ✅ Test scripts updated
6. ✅ Backward compatibility maintained for legacy tiers
7. ✅ Documentation updated

---

## Files Changed

### 1. Database Migration (NEW)

**File:** `supabase/migrations/20251210000000_fix_subscription_tiers_to_correct_limits.sql`

**Changes:**

- ✅ Updated `get_tier_simulation_limit()` function with correct limits (3, 30, 60)
- ✅ Removed unlimited tier support
- ✅ Added new tier names: `basic`, `premium`
- ✅ Maintained backward compatibility for legacy names (`basis`, `profi`)
- ✅ Updated all existing quota records in database
- ✅ Normalized tier names in `user_simulation_quota` table
- ✅ Normalized tier names in `user_subscriptions` table (if exists)
- ✅ Normalized tier names in `users` table (if has tier column)
- ✅ Added check constraint to prevent invalid tiers
- ✅ Created `normalize_tier_name()` helper function

**Key SQL Changes:**

```sql
-- New tier limits
WHEN 'free' THEN 3      -- Was: 5
WHEN 'basic' THEN 30    -- Was: "basis" with 20
WHEN 'premium' THEN 60  -- Was: "profi" with 100
-- Removed: 'unlimited' THEN -1

-- Data normalization
UPDATE user_simulation_quota
SET subscription_tier = 'basic'
WHERE subscription_tier = 'basis';

UPDATE user_simulation_quota
SET total_simulations = 30
WHERE subscription_tier = 'basic';
```

### 2. Webhook Handler

**File:** `netlify/functions/lemonsqueezy.js`

**Changes:**

- ✅ Updated `SUBSCRIPTION_TIERS` object with correct names and limits
- ✅ Updated `VARIANT_TIER_MAPPING` with correct tier names
- ✅ Removed unlimited tier variant mapping
- ✅ Updated `determineSubscriptionTier()` function to use new names
- ✅ Changed default fallback from "basis" to "free" (safer)

**Before:**

```javascript
const SUBSCRIPTION_TIERS = {
  basis: { name: 'Basis-Plan', simulationLimit: 30 },
  profi: { name: 'Profi-Plan', simulationLimit: 60 },
  unlimited: { name: 'Unlimited-Plan', simulationLimit: null },
};

const VARIANT_TIER_MAPPING = {
  1006948: 'basis',
  1006934: 'profi',
  1006947: 'unlimited',
};
```

**After:**

```javascript
const SUBSCRIPTION_TIERS = {
  free: { name: 'Free-Plan', simulationLimit: 3 },
  basic: { name: 'Basic-Plan', simulationLimit: 30 },
  premium: { name: 'Premium-Plan', simulationLimit: 60 },
};

const VARIANT_TIER_MAPPING = {
  1006948: 'basic', // Basic Plan (30 simulations/month)
  1006934: 'premium', // Premium Plan (60 simulations/month)
};
```

### 3. Quota Service

**File:** `lib/quotaService.ts`

**Changes:**

- ✅ Updated `getTierLimit()` with correct limits (3, 30, 60)
- ✅ Added backward compatibility for legacy tier names
- ✅ Updated documentation comments
- ✅ Updated example code

**Before:**

```typescript
getTierLimit(tier: string): number {
  const limits: Record<string, number> = {
    free: 5,
    basis: 20,
    profi: 100,
    unlimited: -1,
  };
  return limits[tier] || 5;
}
```

**After:**

```typescript
getTierLimit(tier: string): number {
  const limits: Record<string, number> = {
    free: 3,
    basic: 30,
    premium: 60,
    // Legacy tier names for backward compatibility
    basis: 30,
    profi: 60,
  };
  return limits[tier] || 3;
}
```

### 4. Simulation Constants

**File:** `constants/simulationConstants.ts`

**Changes:**

- ✅ Updated all tier limit constants
- ✅ Added new constant names (`BASIC_TIER_LIMIT`, `PREMIUM_TIER_LIMIT`)
- ✅ Marked old constants as deprecated
- ✅ Maintained backward compatibility

**Before:**

```typescript
export const FREE_TIER_LIMIT = 5;
export const BASIS_TIER_LIMIT = 20;
export const PROFI_TIER_LIMIT = 100;
export const UNLIMITED_TIER_LIMIT = -1;
```

**After:**

```typescript
export const FREE_TIER_LIMIT = 3;
export const BASIC_TIER_LIMIT = 30;
export const PREMIUM_TIER_LIMIT = 60;

// Legacy exports for backward compatibility
/** @deprecated Use BASIC_TIER_LIMIT instead */
export const BASIS_TIER_LIMIT = 30;
/** @deprecated Use PREMIUM_TIER_LIMIT instead */
export const PROFI_TIER_LIMIT = 60;
```

### 5. Test Script

**File:** `test-webhook-quota-integration.js`

**Changes:**

- ✅ Updated test scenarios with correct tier names
- ✅ Updated expected limits (30, 60, 3)
- ✅ Changed variant names to match new naming

**Test Scenarios Updated:**

1. "Subscription Created - Basic Tier" (30 simulations)
2. "Subscription Updated - Upgrade to Premium" (60 simulations)
3. "Subscription Expired - Reset to Free" (3 simulations)

---

## Backward Compatibility

### Legacy Tier Names Supported

The system maintains **full backward compatibility** with legacy tier names:

| Legacy Name | New Name    | Supported?               |
| ----------- | ----------- | ------------------------ |
| `basis`     | `basic`     | ✅ Yes (both work)       |
| `profi`     | `premium`   | ✅ Yes (both work)       |
| `unlimited` | _(removed)_ | ✅ Converts to `premium` |

**How it works:**

1. Database function `normalize_tier_name()` converts legacy names
2. `get_tier_simulation_limit()` accepts both old and new names
3. Webhook handler supports legacy variant name matching
4. Client code (`getTierLimit()`) accepts both formats

**Example:**

```javascript
// Both of these work:
quotaService.getTierLimit('basis'); // Returns: 30
quotaService.getTierLimit('basic'); // Returns: 30
```

---

## Database Changes Summary

### Tables Updated

1. **user_simulation_quota**
   - Tier names normalized (`basis` → `basic`, `profi` → `premium`)
   - Limits corrected (20 → 30, 100 → 60, 5 → 3)
   - Unlimited tiers converted to premium

2. **user_subscriptions** (if exists)
   - Tier names normalized
   - Simulation limits corrected

3. **users** (if has subscription columns)
   - `subscription_tier` normalized
   - `simulation_limit` corrected

### Functions Updated

1. **get_tier_simulation_limit()**
   - Now returns: free=3, basic=30, premium=60
   - Supports legacy names for compatibility
   - Removed unlimited support

2. **can_start_simulation()**
   - Updated to use correct tier limits
   - Auto-initializes free tier with 3 simulations

3. **normalize_tier_name()** (NEW)
   - Converts legacy tier names to new names
   - Used by other functions for compatibility

### Constraints Added

```sql
ALTER TABLE user_simulation_quota
ADD CONSTRAINT user_simulation_quota_subscription_tier_check
CHECK (subscription_tier IN ('free', 'basic', 'premium'));
```

---

## Impact Analysis

### User Impact

| Scenario                   | Before          | After          | Impact             |
| -------------------------- | --------------- | -------------- | ------------------ |
| **New free user**          | 5 simulations   | 3 simulations  | ⚠️ Reduced by 2    |
| **Basic subscriber**       | 20 simulations  | 30 simulations | ✅ Increased by 10 |
| **Premium subscriber**     | 100 simulations | 60 simulations | ⚠️ Reduced by 40   |
| **"Unlimited" subscriber** | Infinite        | 60 simulations | ⚠️ Now limited     |

### Data Migration Impact

All existing quotas will be automatically updated when the migration runs:

1. ✅ Free tier users: Quota adjusted from 5 to 3
2. ✅ Basic subscribers: Quota increased from 20 to 30
3. ✅ Premium subscribers: Quota decreased from 100 to 60
4. ✅ "Unlimited" users: Converted to premium (60)

**Important:** Users who already consumed more than their new limit will:

- Keep their current usage count
- See negative "remaining" until next billing period
- Cannot start new simulations until quota resets

---

## Testing

### Pre-Deployment Testing

1. **Run Migration Locally:**

   ```bash
   supabase db push
   ```

2. **Run Test Script:**

   ```bash
   node test-webhook-quota-integration.js
   ```

3. **Verify Database:**

   ```sql
   -- Check tier limits function
   SELECT
     'free' as tier,
     get_tier_simulation_limit('free') as limit
   UNION ALL
   SELECT 'basic', get_tier_simulation_limit('basic')
   UNION ALL
   SELECT 'premium', get_tier_simulation_limit('premium');

   -- Expected results:
   -- free    | 3
   -- basic   | 30
   -- premium | 60
   ```

4. **Check Existing Users:**
   ```sql
   SELECT
     subscription_tier,
     COUNT(*) as user_count,
     AVG(total_simulations) as avg_limit,
     SUM(simulations_used) as total_used
   FROM user_simulation_quota
   WHERE period_start <= NOW()
     AND period_end > NOW()
   GROUP BY subscription_tier;
   ```

### Post-Deployment Verification

1. **Monitor Webhook Events:**

   ```bash
   netlify functions:log lemonsqueezy --follow
   ```

2. **Check Quota Updates:**

   ```sql
   SELECT
     event_type,
     event_data->'_quota_update'->'success' as quota_updated,
     COUNT(*) as count
   FROM webhook_events
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY event_type, event_data->'_quota_update'->'success';
   ```

3. **Verify User Experience:**
   - Subscribe a test user → Check quota is 30
   - Upgrade test user → Verify quota is 60
   - Let subscription expire → Confirm reset to 3

---

## Deployment Steps

### 1. Run Database Migration

```bash
cd medical-learning-app
supabase db push
```

This will apply the migration `20251210000000_fix_subscription_tiers_to_correct_limits.sql`.

### 2. Deploy Code Changes

```bash
git add -A
git commit -m "fix: Correct subscription tier limits to 3/30/60"
git push origin main
```

### 3. Verify Deployment

- Check Netlify deployment succeeds
- Monitor webhook logs for errors
- Test a real subscription flow

---

## Rollback Plan

If issues arise, rollback is possible:

### Database Rollback

```sql
-- Revert tier limits (use with caution!)
CREATE OR REPLACE FUNCTION get_tier_simulation_limit(tier text)
RETURNS integer AS $$
BEGIN
  RETURN CASE tier
    WHEN 'free' THEN 5
    WHEN 'basis' THEN 20
    WHEN 'profi' THEN 100
    WHEN 'unlimited' THEN -1
    ELSE 5
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Code Rollback

```bash
git revert HEAD
git push origin main
```

---

## Future Improvements

1. **Add Tier Change Notifications:**
   - Notify users when their tier/quota changes
   - Send email on subscription upgrade/downgrade

2. **Gradual Quota Reduction:**
   - For premium → basic downgrades, gradually reduce quota over time
   - Prevents immediate loss of access

3. **Quota Prorating:**
   - Calculate prorated limits for mid-month subscriptions
   - More fair for users who subscribe mid-cycle

4. **Usage Analytics:**
   - Track which tiers are most popular
   - Monitor quota utilization rates
   - Identify optimal tier limits

---

## Summary

This fix ensures the subscription system accurately reflects the business requirements:

✅ **Free**: 3 simulations/month (was 5)
✅ **Basic**: 30 simulations/month (was "basis" with 20)
✅ **Premium**: 60 simulations/month (was "profi" with 100)
❌ **Unlimited**: Removed (doesn't exist in business model)

All changes maintain **backward compatibility** with legacy tier names, ensuring existing integrations continue to work while using the correct limits.

---

**Implementation Date:** December 10, 2025
**Status:** ✅ Ready for Deployment
**Risk Level:** Medium (affects all users, but backward compatible)
**Rollback Available:** Yes
