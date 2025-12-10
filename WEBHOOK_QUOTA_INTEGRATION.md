# Webhook Quota Integration Documentation

## Overview

This document describes the automatic quota update integration between Lemon Squeezy webhooks and the simulation quota system.

## Problem Solved

Previously, when a user's subscription changed (created, upgraded, downgraded, or expired) via Lemon Squeezy, the `user_subscriptions` table was updated but the `user_simulation_quota` table was **not** automatically updated. This meant:

- New subscribers couldn't use simulations until manual intervention
- Upgraded users didn't get their increased quota
- Expired subscriptions kept their paid tier quota

## Solution

The webhook handler now automatically calls the `handle_subscription_change()` RPC function to update quotas whenever subscription events occur.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Lemon Squeezy                              │
│          (Subscription Management Platform)                 │
└────────────────────┬────────────────────────────────────────┘
                     │ Webhook Event
                     │ (subscription_created, _updated, etc.)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         netlify/functions/lemonsqueezy.js                   │
│                 (Webhook Handler)                           │
│                                                             │
│  1. Verify signature                                        │
│  2. Parse event data                                        │
│  3. Find user by email                                      │
│  4. Call upsert_subscription_from_webhook() RPC             │
│     └─> Updates user_subscriptions table                    │
│  5. ✨ NEW: Call handle_subscription_change() RPC          │
│     └─> Updates user_simulation_quota table                 │
│  6. Log event with quota update result                      │
└─────────────────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                        │
│                                                             │
│  ┌──────────────────────────────────────────┐              │
│  │  user_subscriptions                      │              │
│  │  - tier (basis, profi, unlimited)        │              │
│  │  - status (active, cancelled, expired)   │              │
│  │  - simulation_limit                      │              │
│  └──────────────────────────────────────────┘              │
│                     │                                        │
│                     ↓                                        │
│  ┌──────────────────────────────────────────┐              │
│  │  user_simulation_quota                   │              │
│  │  - total_simulations (tier limit)        │              │
│  │  - simulations_used (current count)      │              │
│  │  - simulations_remaining (computed)      │              │
│  └──────────────────────────────────────────┘              │
│                     │                                        │
│                     ↓                                        │
│  ┌──────────────────────────────────────────┐              │
│  │  webhook_events (audit log)              │              │
│  │  - event_type                            │              │
│  │  - event_data (with _quota_update)       │              │
│  │  - status                                │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. New Helper Function: `updateUserQuota()`

Location: `netlify/functions/lemonsqueezy.js:75-108`

```javascript
async function updateUserQuota(userId, tier) {
  try {
    console.log(`📊 Updating quota for user ${userId} to tier: ${tier}`);

    const { data: quotaResult, error: quotaError } = await supabase.rpc('handle_subscription_change', {
      p_user_id: userId,
      p_new_tier: tier,
    });

    if (quotaError) {
      console.error('❌ Error updating quota:', quotaError);
      return { success: false, error: quotaError.message, result: null };
    }

    console.log('✅ Quota updated successfully:', quotaResult);
    return { success: true, error: null, result: quotaResult };
  } catch (quotaErr) {
    console.error('❌ Exception updating quota:', quotaErr);
    return { success: false, error: quotaErr.message, result: null };
  }
}
```

**Key Features:**

- Wraps the `handle_subscription_change()` RPC call
- Returns structured result with success/error status
- Logs all operations for debugging
- Never throws exceptions (returns error in result)

### 2. Enhanced Event Logging

Location: `netlify/functions/lemonsqueezy.js:111-155`

The `logWebhookEvent()` function now accepts a `quotaUpdateResult` parameter and enriches the event data with quota update metadata:

```javascript
const enrichedEventData = {
  ...eventData,
  _quota_update: quotaUpdateResult
    ? {
        success: quotaUpdateResult.success,
        error: quotaUpdateResult.error,
        timestamp: new Date().toISOString(),
      }
    : null,
};
```

This allows auditing of quota updates directly in the `webhook_events` table.

### 3. Integration Points

#### A. subscription_created

**Location:** `netlify/functions/lemonsqueezy.js:355-366`

```javascript
case 'subscription_created':
  const createResult = await upsertSubscriptionViaFunction(userId, subData, eventType);
  const createQuotaUpdate = await updateUserQuota(userId, tier);
  await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, createQuotaUpdate);
  break;
```

**Behavior:**

- Creates subscription in `user_subscriptions`
- Initializes quota in `user_simulation_quota` with tier limits
- New user gets fresh quota allocation

**Example:**

- User subscribes to "Profi" plan
- `total_simulations` = 100
- `simulations_used` = 0
- `simulations_remaining` = 100

#### B. subscription_updated

**Location:** `netlify/functions/lemonsqueezy.js:368-392`

```javascript
case 'subscription_updated':
  const newTier = determineSubscriptionTier(variantName, variantId);
  const updateResult = await upsertSubscriptionViaFunction(userId, subData, eventType);
  const updateQuotaUpdate = await updateUserQuota(userId, newTier);
  await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, updateQuotaUpdate);
  break;
```

**Behavior:**

- Updates subscription tier in `user_subscriptions`
- Updates quota in `user_simulation_quota` with new tier limits
- Resets `simulations_used` to 0 (fresh quota for new tier)

**Example (Upgrade):**

- User upgrades from "Basis" (20) to "Profi" (100)
- Previous: used 15/20
- After upgrade: used 0/100 (fresh quota)

**Example (Downgrade):**

- User downgrades from "Profi" (100) to "Basis" (20)
- Previous: used 50/100
- After downgrade: used 0/20 (fresh quota)

#### C. subscription_expired

**Location:** `netlify/functions/lemonsqueezy.js:406-420`

```javascript
case 'subscription_expired':
  const expireResult = await upsertSubscriptionViaFunction(userId, subData, eventType);
  const expireQuotaUpdate = await updateUserQuota(userId, 'free');
  await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, expireQuotaUpdate);
  break;
```

**Behavior:**

- Marks subscription as expired in `user_subscriptions`
- Resets quota to "free" tier in `user_simulation_quota`
- User gets free tier allocation (5 simulations)

**Example:**

- User's "Profi" subscription expires
- Previous: used 75/100
- After expiration: used 0/5 (free tier quota)

#### D. subscription_cancelled

**Location:** `netlify/functions/lemonsqueezy.js:394-404`

**Behavior:**

- Marks subscription as cancelled (keeps access until `expires_at`)
- **Does NOT update quota** (user retains access until expiration)
- Quota update happens when `subscription_expired` event fires

## Database RPC Function

### handle_subscription_change()

**Location:** `supabase/migrations/20251207010000_implement_database_quota_system.sql:378-411`

```sql
CREATE OR REPLACE FUNCTION handle_subscription_change(
  p_user_id uuid,
  p_new_tier text
)
RETURNS json AS $$
DECLARE
  v_current_period_start timestamptz;
  v_current_period_end timestamptz;
  v_result user_simulation_quota;
BEGIN
  -- Determine billing period (monthly)
  v_current_period_start := date_trunc('month', NOW());
  v_current_period_end := v_current_period_start + INTERVAL '1 month';

  -- Initialize or update quota
  v_result := initialize_user_quota(
    p_user_id,
    p_new_tier,
    v_current_period_start,
    v_current_period_end
  );

  RETURN json_build_object(
    'success', true,
    'message', format('Quota updated to %s tier', p_new_tier),
    'quota', row_to_json(v_result)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**What it does:**

1. Calculates current billing period (calendar month)
2. Calls `initialize_user_quota()` to upsert the quota record
3. Sets `total_simulations` based on tier
4. Resets `simulations_used` to 0
5. Returns success with quota details

## Error Handling

### Non-Blocking Failures

Quota update failures **do not** block webhook processing. The webhook handler:

1. ✅ Always processes the subscription event first
2. ✅ Always logs the event in `webhook_events`
3. ⚠️ Attempts quota update (if it fails, continues)
4. ✅ Returns success if subscription was updated (even if quota failed)

### Error Logging

All quota update attempts are logged with their result:

```json
{
  "event_type": "subscription_created",
  "event_data": {
    "meta": { ... },
    "data": { ... },
    "_quota_update": {
      "success": false,
      "error": "function handle_subscription_change does not exist",
      "timestamp": "2025-12-10T18:00:00.000Z"
    }
  },
  "status": "processed"
}
```

This allows monitoring and debugging of quota update issues without affecting subscription processing.

## Testing

### Local Testing

1. **Start Netlify Dev Server:**

   ```bash
   npm run netlify dev
   # or
   netlify dev
   ```

2. **Run Test Script:**

   ```bash
   node test-webhook-quota-integration.js
   ```

3. **Verify Results:**

   ```sql
   -- Check subscription
   SELECT * FROM user_subscriptions WHERE user_id = 'USER_UUID';

   -- Check quota
   SELECT * FROM user_simulation_quota WHERE user_id = 'USER_UUID';

   -- Check webhook logs
   SELECT event_type, status, event_data->'_quota_update'
   FROM webhook_events
   WHERE user_id = 'USER_UUID'
   ORDER BY created_at DESC;
   ```

### Production Testing

1. **Use Lemon Squeezy Test Mode:**
   - Go to Settings → Webhooks in Lemon Squeezy dashboard
   - Use "Test Mode" webhooks
   - Send test events

2. **Monitor Logs:**

   ```bash
   netlify functions:log lemonsqueezy --follow
   ```

3. **Check Database:**
   ```sql
   -- Recent webhook events with quota status
   SELECT
     event_type,
     user_id,
     status,
     event_data->'_quota_update'->'success' as quota_updated,
     event_data->'_quota_update'->'error' as quota_error,
     created_at
   FROM webhook_events
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

## Monitoring

### Key Metrics to Monitor

1. **Quota Update Success Rate:**

   ```sql
   SELECT
     event_type,
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE (event_data->'_quota_update'->>'success')::boolean = true) as quota_updated,
     COUNT(*) FILTER (WHERE (event_data->'_quota_update'->>'success')::boolean = false) as quota_failed
   FROM webhook_events
   WHERE event_type IN ('subscription_created', 'subscription_updated', 'subscription_expired')
     AND created_at > NOW() - INTERVAL '7 days'
   GROUP BY event_type;
   ```

2. **Failed Quota Updates:**

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

3. **Quota Status per User:**
   ```sql
   SELECT
     u.email,
     us.tier,
     us.status,
     usq.total_simulations,
     usq.simulations_used,
     usq.simulations_remaining
   FROM users u
   LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.is_primary = true
   LEFT JOIN user_simulation_quota usq ON u.id = usq.user_id
     AND usq.period_start <= NOW()
     AND usq.period_end > NOW()
   WHERE us.status = 'active';
   ```

## Troubleshooting

### Issue: Quota not updating after subscription change

**Symptoms:**

- User subscribed but still sees 0 remaining simulations
- User upgraded but sees old quota limit

**Diagnosis:**

```sql
-- Check webhook events
SELECT event_type, status, event_data->'_quota_update'
FROM webhook_events
WHERE user_id = 'USER_UUID'
ORDER BY created_at DESC
LIMIT 5;
```

**Common Causes:**

1. `handle_subscription_change()` RPC doesn't exist (run migration)
2. RPC permissions not granted (check `GRANT EXECUTE`)
3. Invalid tier name passed (check tier mapping)

**Fix:**

```sql
-- Manually trigger quota update
SELECT handle_subscription_change('USER_UUID', 'profi');
```

### Issue: Webhook event processed but no database change

**Symptoms:**

- Webhook logs show success
- `user_subscriptions` updated
- `user_simulation_quota` not updated

**Diagnosis:**
Check the `_quota_update` field in `webhook_events`:

```sql
SELECT event_data->'_quota_update'
FROM webhook_events
WHERE id = 'EVENT_UUID';
```

**Common Causes:**

1. RPC call failed (check `error` field)
2. Database migration not applied
3. Service role key doesn't have permissions

### Issue: Double quota after webhook

**Symptoms:**

- User gets quota reset twice
- Unexpected quota values

**Cause:**
Multiple webhooks firing for the same event.

**Fix:**
Add idempotency key checking (future enhancement).

## Future Enhancements

1. **Idempotency:**
   - Add webhook event ID tracking
   - Prevent duplicate processing

2. **Retry Logic:**
   - Implement automatic retry for failed quota updates
   - Queue failed updates for manual review

3. **Alerting:**
   - Send notifications when quota updates fail
   - Alert on high failure rates

4. **Quota Prorating:**
   - Calculate prorated quota for mid-month changes
   - Preserve partial usage on upgrades

5. **Admin Dashboard:**
   - View failed quota updates
   - Manually retry failed updates
   - Audit quota history

## Summary

The webhook quota integration ensures that subscription changes are **immediately reflected** in the simulation quota system, providing a seamless user experience:

✅ New subscribers get instant access
✅ Upgrades immediately increase quota
✅ Downgrades adjust quota appropriately
✅ Expired subscriptions revert to free tier
✅ All changes are logged and auditable
✅ Failures don't break the webhook flow

This integration eliminates manual intervention and ensures data consistency across the subscription and quota systems.
