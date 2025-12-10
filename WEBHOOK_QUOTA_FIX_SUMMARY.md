# Webhook Quota Integration - Fix Summary

## Issue Fixed

**Problem:** When users subscribed, upgraded, downgraded, or had their subscription expire via Lemon Squeezy, the `user_simulation_quota` table was not automatically updated. This meant users couldn't use simulations even after paying for a subscription.

**Root Cause:** The webhook handler (`netlify/functions/lemonsqueezy.js`) updated the `user_subscriptions` table but did NOT call the `handle_subscription_change()` RPC function to update the quota system.

## Solution Implemented

Added automatic quota updates to the Lemon Squeezy webhook handler for all subscription events:

1. **subscription_created** → Initialize quota with tier limits
2. **subscription_updated** → Update quota with new tier limits (upgrade/downgrade)
3. **subscription_expired** → Reset quota to free tier (5 simulations)

## Files Changed

### 1. `netlify/functions/lemonsqueezy.js`

**New Helper Function** (lines 75-108):

```javascript
async function updateUserQuota(userId, tier) {
  // Calls handle_subscription_change() RPC
  // Returns { success, error, result }
  // Never throws exceptions
}
```

**Enhanced Logging Function** (lines 111-155):

```javascript
async function logWebhookEvent(..., quotaUpdateResult) {
  // Enriches event data with _quota_update metadata
  // Tracks success/failure of quota updates
}
```

**Integration Points:**

- Line 361: `subscription_created` event → calls `updateUserQuota(userId, tier)`
- Line 381: `subscription_updated` event → calls `updateUserQuota(userId, newTier)`
- Line 415: `subscription_expired` event → calls `updateUserQuota(userId, 'free')`

### 2. `test-webhook-quota-integration.js` (NEW)

Comprehensive test script that:

- Simulates Lemon Squeezy webhook calls
- Tests all three quota-updating events
- Generates proper HMAC signatures
- Provides detailed test results

**Usage:**

```bash
node test-webhook-quota-integration.js
```

### 3. `WEBHOOK_QUOTA_INTEGRATION.md` (NEW)

Complete documentation covering:

- Architecture diagrams
- Implementation details
- Error handling strategy
- Testing procedures
- Monitoring queries
- Troubleshooting guide

## How It Works

```
Lemon Squeezy webhook → lemonsqueezy.js handler
  ├─ 1. Verify signature
  ├─ 2. Update user_subscriptions (existing)
  ├─ 3. ✨ NEW: Call handle_subscription_change() RPC
  │     └─ Updates user_simulation_quota table
  │     └─ Sets total_simulations based on tier
  │     └─ Resets simulations_used to 0
  └─ 4. Log event with quota update result
```

## Impact

### Before Fix

- ❌ New subscribers: 0 simulations available
- ❌ Upgrades: Still see old quota
- ❌ Expired subscriptions: Keep paid tier quota
- ❌ Manual admin intervention required

### After Fix

- ✅ New subscribers: Instant access to simulations
- ✅ Upgrades: Immediate quota increase
- ✅ Downgrades: Quota adjusted appropriately
- ✅ Expired subscriptions: Auto-reset to free tier (5)
- ✅ All changes logged and auditable
- ✅ Zero manual intervention needed

## Testing

### Local Testing

```bash
# 1. Start dev server
netlify dev

# 2. Run test script
node test-webhook-quota-integration.js

# 3. Check database
SELECT * FROM user_simulation_quota WHERE user_id = 'USER_UUID';
```

### Production Verification

```bash
# Monitor webhook logs
netlify functions:log lemonsqueezy --follow

# Check recent quota updates
SELECT
  event_type,
  user_id,
  event_data->'_quota_update'->'success' as quota_updated,
  created_at
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## Error Handling

The implementation is **fault-tolerant**:

1. ✅ Quota update failures don't break webhook processing
2. ✅ Subscription updates always succeed (primary operation)
3. ✅ Quota update failures are logged in `webhook_events._quota_update`
4. ✅ Failed updates can be retried manually via SQL

## Monitoring Queries

**Check quota update success rate:**

```sql
SELECT
  event_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE (event_data->'_quota_update'->>'success')::boolean = true) as success,
  COUNT(*) FILTER (WHERE (event_data->'_quota_update'->>'success')::boolean = false) as failed
FROM webhook_events
WHERE event_type IN ('subscription_created', 'subscription_updated', 'subscription_expired')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

**Find failed quota updates:**

```sql
SELECT
  event_type,
  user_id,
  event_data->'_quota_update'->>'error' as error_message,
  created_at
FROM webhook_events
WHERE (event_data->'_quota_update'->>'success')::boolean = false
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Manual Fix (if needed)

If quota update fails, manually trigger it:

```sql
-- For a specific user
SELECT handle_subscription_change('USER_UUID', 'profi');

-- Check current quota status
SELECT * FROM user_simulation_quota
WHERE user_id = 'USER_UUID'
  AND period_start <= NOW()
  AND period_end > NOW();
```

## Deployment Checklist

- [x] Code changes implemented
- [x] Test script created
- [x] Documentation written
- [ ] Local testing completed
- [ ] Code committed to git
- [ ] Deployed to production
- [ ] Production webhook tested
- [ ] Monitoring queries run
- [ ] Team notified

## Next Steps

1. **Commit changes:**

   ```bash
   git add netlify/functions/lemonsqueezy.js
   git add test-webhook-quota-integration.js
   git add WEBHOOK_QUOTA_INTEGRATION.md
   git add WEBHOOK_QUOTA_FIX_SUMMARY.md
   git commit -m "fix: Auto-update quota when subscription changes via webhook

   - Add updateUserQuota() helper function
   - Call handle_subscription_change() RPC for created/updated/expired events
   - Enhanced webhook logging with quota update status
   - Add comprehensive test script
   - Add detailed documentation"
   ```

2. **Test locally** with test script

3. **Deploy to production:**

   ```bash
   git push origin main
   ```

4. **Monitor** webhook events for 24 hours

5. **Verify** no failed quota updates

## Related Documentation

- **Deep Analysis:** [SIMULATION_SYSTEM_DOCUMENTATION.md](./SIMULATION_SYSTEM_DOCUMENTATION.md)
- **Integration Guide:** [WEBHOOK_QUOTA_INTEGRATION.md](./WEBHOOK_QUOTA_INTEGRATION.md)
- **Lemon Squeezy Setup:** [LEMONSQUEEZY_WEBHOOK_SETUP.md](./LEMONSQUEEZY_WEBHOOK_SETUP.md)
- **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

---

**Date:** December 10, 2025
**Status:** ✅ Implementation Complete, Ready for Testing
