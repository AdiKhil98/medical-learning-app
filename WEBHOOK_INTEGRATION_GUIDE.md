# LemonSqueezy Webhook Integration Guide
## Multi-Subscription Support

### Overview
The subscription system has been updated to support **multiple active subscriptions** per user. The webhook code needs to be updated to use the new `upsert_subscription_from_webhook()` function instead of directly updating the `users` table.

---

## What Changed?

### Before (OLD System)
- Webhook directly updated `users` table
- Only ONE subscription per user
- Last webhook to fire would overwrite previous subscription
- **Problem**: User could be downgraded if old subscription webhook fired

### After (NEW System)
- Webhook calls `upsert_subscription_from_webhook()` function
- ALL subscriptions stored in `user_subscriptions` table
- System automatically determines "primary" subscription
- **Primary Selection Logic**:
  1. Only active subscriptions (`active`, `on_trial`, `past_due`)
  2. Highest tier wins (`unlimited` > `profi` > `basis`)
  3. If same tier, most recently created wins

---

## Required Webhook Changes

### Step 1: Update `subscription_created` Handler

**NEW CODE** (replace existing handler in `api/webhook/lemonsqueezy/index.js`):
```javascript
case 'subscription_created':
  console.log(`Creating subscription for user ${userId}`);

  const { data: createResult, error: createError } = await supabase
    .rpc('upsert_subscription_from_webhook', {
      p_user_id: userId,
      p_lemonsqueezy_subscription_id: subscriptionId,
      p_tier: tier,
      p_status: 'active',
      p_variant_id: variantId,
      p_variant_name: variantName || tierConfig.name,
      p_customer_email: customerEmail,
      p_simulation_limit: tier === 'unlimited' ? 999999 : (tierConfig.simulationLimit || null),
      p_created_at: subscriptionData.created_at || new Date().toISOString(),
      p_updated_at: new Date().toISOString(),
      p_expires_at: subscriptionData.ends_at || null,
      p_renews_at: subscriptionData.renews_at || null,
      p_period_start: subscriptionData.current_period_start || new Date().toISOString(),
      p_period_end: subscriptionData.current_period_end || subscriptionData.renews_at || null,
      p_webhook_event: 'subscription_created'
    });

  if (createError) {
    console.error('Error creating subscription:', createError);
    await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', createError.message);
    return res.status(500).json({ error: 'Failed to create subscription' });
  }

  console.log('Subscription created:', createResult);

  // Check if this is now the primary subscription
  const syncResult = createResult?.sync_result;
  if (syncResult?.tier_changed) {
    console.log(`✅ Tier changed from ${syncResult.old_tier} to ${syncResult.new_tier}, counter reset`);
  }

  await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
  console.log(`Subscription created successfully for user ${userId}`);
  break;
```

### Step 2: Update `subscription_updated` Handler

**NEW CODE**:
```javascript
case 'subscription_updated':
  console.log(`Updating subscription ${subscriptionId} for user ${userId}`);

  const { data: updateResult, error: updateError } = await supabase
    .rpc('upsert_subscription_from_webhook', {
      p_user_id: userId,
      p_lemonsqueezy_subscription_id: subscriptionId,
      p_tier: tier,
      p_status: status,
      p_variant_id: variantId,
      p_variant_name: variantName || tierConfig.name,
      p_customer_email: customerEmail,
      p_simulation_limit: tier === 'unlimited' ? 999999 : (tierConfig.simulationLimit || null),
      p_created_at: subscriptionData.created_at || new Date().toISOString(),
      p_updated_at: new Date().toISOString(),
      p_expires_at: subscriptionData.ends_at || null,
      p_renews_at: subscriptionData.renews_at || null,
      p_period_start: subscriptionData.current_period_start || new Date().toISOString(),
      p_period_end: subscriptionData.current_period_end || subscriptionData.renews_at || null,
      p_webhook_event: 'subscription_updated'
    });

  if (updateError) {
    console.error('Error updating subscription:', updateError);
    await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', updateError.message);
    return res.status(500).json({ error: 'Failed to update subscription' });
  }

  console.log('Subscription updated:', updateResult);
  await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
  break;
```

### Step 3: Apply to All Subscription Events

The same pattern applies to:
- `subscription_cancelled`
- `subscription_expired`
- `subscription_paused`
- `subscription_resumed`
- `subscription_payment_success`

Just change the `p_status` and `p_webhook_event` parameters accordingly.

---

## Benefits

✅ **Prevents downgrade bug**: User with Unlimited won't be downgraded by old Basis webhook
✅ **Handles duplicates**: If user subscribes twice, highest tier is used
✅ **Automatic tier management**: System determines primary subscription automatically
✅ **Full audit trail**: All subscriptions tracked in `user_subscriptions` table
✅ **Counter reset on upgrade**: Monthly counter automatically resets when tier changes

---

## Testing

Run: `test_multiple_subscriptions.sql` for comprehensive tests

---

## Monitoring

```sql
-- Check users with multiple active subscriptions
SELECT * FROM user_subscriptions_overview
WHERE active_subscriptions > 1;
```

---

## Migration Complete

All existing subscriptions have been automatically migrated to the new `user_subscriptions` table.
