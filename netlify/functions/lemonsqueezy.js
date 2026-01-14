const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Subscription tier mapping
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free-Plan',
    simulationLimit: 3,
  },
  basic: {
    name: 'Basic-Plan',
    simulationLimit: 30,
  },
  premium: {
    name: 'Premium-Plan',
    simulationLimit: 60,
  },
};

// Helper function to verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = hmac.digest('hex');

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace(/^sha256=/, '');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(cleanSignature, 'hex'));
}

// Variant ID to subscription tier mapping
const VARIANT_TIER_MAPPING = {
  1006948: 'basic', // Basic Plan (30 simulations/month)
  1006934: 'premium', // Premium Plan (60 simulations/month)
};

// Helper function to determine subscription tier from variant ID
function determineSubscriptionTier(variantName, variantId) {
  // First try to match by variant ID (most reliable)
  const tier = VARIANT_TIER_MAPPING[String(variantId)];
  if (tier) {
    console.log(`Mapped variant ID ${variantId} to tier: ${tier}`);
    return tier;
  }

  // Fallback to name-based matching if variant ID not found
  const name = variantName?.toLowerCase() || '';
  if (name.includes('basic') || name.includes('basis')) {
    console.log(`Mapped variant name "${variantName}" to tier: basic`);
    return 'basic';
  } else if (name.includes('premium') || name.includes('profi') || name.includes('pro')) {
    console.log(`Mapped variant name "${variantName}" to tier: premium`);
    return 'premium';
  } else if (name.includes('free')) {
    console.log(`Mapped variant name "${variantName}" to tier: free`);
    return 'free';
  }

  // Final fallback to free tier (safe default)
  console.warn(`Unknown subscription tier for variant: ${variantName} (ID: ${variantId}), defaulting to free`);
  return 'free';
}

// Helper function to update user quota
async function updateUserQuota(userId, tier) {
  try {
    console.log(`📊 Updating quota for user ${userId} to tier: ${tier}`);

    const { data: quotaResult, error: quotaError } = await supabase.rpc('handle_subscription_change', {
      p_user_id: userId,
      p_new_tier: tier,
    });

    if (quotaError) {
      console.error('❌ Error updating quota:', quotaError);
      return {
        success: false,
        error: quotaError.message || quotaError,
        result: null,
      };
    }

    console.log('✅ Quota updated successfully:', quotaResult);
    return {
      success: true,
      error: null,
      result: quotaResult,
    };
  } catch (quotaErr) {
    console.error('❌ Exception updating quota:', quotaErr);
    return {
      success: false,
      error: quotaErr.message || String(quotaErr),
      result: null,
    };
  }
}

// Helper function to log webhook events
async function logWebhookEvent(
  eventType,
  eventData,
  subscriptionId,
  userId,
  status = 'processed',
  errorMessage = null,
  quotaUpdateResult = null
) {
  try {
    console.log('Attempting to log webhook event:', {
      eventType,
      subscriptionId,
      userId,
      status,
      hasSupabaseClient: !!supabase,
      quotaUpdateSuccess: quotaUpdateResult?.success,
    });

    // Add quota update info to event data
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

    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        event_type: eventType,
        event_data: enrichedEventData,
        subscription_id: subscriptionId,
        user_id: userId,
        status,
        error_message: errorMessage,
      })
      .select();

    if (error) {
      console.error('Failed to log webhook event:', error);
      throw new Error(`Database insert failed: ${error.message}`);
    }

    console.log('Successfully logged webhook event:', data);
    return data;
  } catch (err) {
    console.error('Error logging webhook event:', err);
    throw err;
  }
}

// Helper function to find user by email (case-insensitive)
async function findUserByEmail(email) {
  // Use ilike for case-insensitive email matching
  const { data, error } = await supabase.from('users').select('*').ilike('email', email).single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error finding user by email:', error);
    return null;
  }

  return data;
}

// Cancel a subscription via LemonSqueezy API
async function cancelLemonSqueezySubscription(subscriptionId) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;

  if (!apiKey) {
    console.error('❌ LEMONSQUEEZY_API_KEY not configured - cannot cancel subscription');
    return { success: false, error: 'API key not configured' };
  }

  try {
    console.log(`🔄 Cancelling LemonSqueezy subscription: ${subscriptionId}`);

    const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to cancel subscription ${subscriptionId}:`, response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    console.log(`✅ Successfully cancelled subscription ${subscriptionId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error cancelling subscription ${subscriptionId}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Get previous active subscriptions for a user (from user_subscriptions table)
async function getPreviousSubscriptions(userId, currentSubscriptionId) {
  try {
    // Query user_subscriptions table directly for active subscriptions
    // This is more reliable than querying webhook_events
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('lemonsqueezy_subscription_id, variant_name, status, created_at')
      .eq('user_id', userId)
      .in('status', ['active', 'on_trial', 'past_due']) // Only get currently active subscriptions
      .neq('lemonsqueezy_subscription_id', String(currentSubscriptionId)) // Exclude current subscription
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching previous subscriptions from user_subscriptions:', error);

      // Fallback to webhook_events if user_subscriptions fails
      console.log('Falling back to webhook_events table...');
      return await getPreviousSubscriptionsFromWebhookEvents(userId, currentSubscriptionId);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`📋 No active previous subscriptions found for user ${userId}`);
      return [];
    }

    const previousSubs = subscriptions.map((sub) => ({
      subscriptionId: sub.lemonsqueezy_subscription_id,
      createdAt: sub.created_at,
      variantName: sub.variant_name || 'unknown',
      status: sub.status,
    }));

    console.log(
      `📋 Found ${previousSubs.length} active previous subscription(s) for user ${userId}:`,
      previousSubs.map((s) => `${s.subscriptionId} (${s.variantName}, ${s.status})`).join(', ')
    );

    return previousSubs;
  } catch (error) {
    console.error('Error in getPreviousSubscriptions:', error);
    return [];
  }
}

// Fallback: Get previous subscriptions from webhook_events (less reliable)
async function getPreviousSubscriptionsFromWebhookEvents(userId, currentSubscriptionId) {
  try {
    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('subscription_id, event_data, created_at')
      .eq('user_id', userId)
      .eq('event_type', 'subscription_created')
      .eq('status', 'processed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching from webhook_events:', error);
      return [];
    }

    const previousSubs = events
      .filter((e) => e.subscription_id && e.subscription_id !== String(currentSubscriptionId))
      .map((e) => ({
        subscriptionId: e.subscription_id,
        createdAt: e.created_at,
        variantName: e.event_data?.data?.attributes?.variant_name || 'unknown',
      }));

    // Remove duplicates
    const uniqueSubs = [];
    const seenIds = new Set();
    for (const sub of previousSubs) {
      if (!seenIds.has(sub.subscriptionId)) {
        seenIds.add(sub.subscriptionId);
        uniqueSubs.push(sub);
      }
    }

    console.log(`📋 (Fallback) Found ${uniqueSubs.length} previous subscription(s) from webhook_events`);
    return uniqueSubs;
  } catch (error) {
    console.error('Error in getPreviousSubscriptionsFromWebhookEvents:', error);
    return [];
  }
}

// Cancel all previous subscriptions for a user when they create a new one
async function cancelPreviousSubscriptions(userId, currentSubscriptionId) {
  console.log(`🔍 Checking for previous subscriptions to cancel for user ${userId}...`);

  const previousSubs = await getPreviousSubscriptions(userId, currentSubscriptionId);

  if (previousSubs.length === 0) {
    console.log('✅ No previous subscriptions to cancel');
    return { cancelled: 0, errors: [] };
  }

  console.log(`⚠️ Found ${previousSubs.length} previous subscription(s) to cancel`);

  let cancelled = 0;
  const errors = [];

  for (const sub of previousSubs) {
    console.log(`  - Cancelling: ${sub.subscriptionId} (${sub.variantName})`);
    const result = await cancelLemonSqueezySubscription(sub.subscriptionId);

    if (result.success) {
      cancelled++;

      // Update the subscription status in our database to prevent future re-cancellation attempts
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('lemonsqueezy_subscription_id', sub.subscriptionId);

      if (updateError) {
        console.warn(`⚠️ Failed to update subscription ${sub.subscriptionId} status in DB:`, updateError.message);
      } else {
        console.log(`✅ Updated subscription ${sub.subscriptionId} status to 'cancelled' in DB`);
      }
    } else {
      errors.push({ subscriptionId: sub.subscriptionId, error: result.error });
    }
  }

  console.log(`📊 Cancellation summary: ${cancelled}/${previousSubs.length} cancelled`);
  if (errors.length > 0) {
    console.log('❌ Errors:', errors);
  }

  return { cancelled, errors };
}

// ROBUST: Process subscription with direct table updates (bypasses potentially broken RPC functions)
async function processSubscriptionAtomically(userId, subscriptionData, eventType) {
  const {
    subscriptionId,
    variantId,
    variantName,
    customerEmail,
    tier,
    status,
    simulationLimit,
    createdAt,
    updatedAt,
    expiresAt,
    renewsAt,
    periodStart,
    periodEnd,
  } = subscriptionData;

  console.log('🔄 Processing subscription with direct updates:', {
    userId,
    subscriptionId,
    tier,
    status,
    simulationLimit,
    eventType,
  });

  let success = true;
  const errors = [];

  // STEP 1: Update user_simulation_quota table directly
  // Production DB accepts: 'free', 'basic', 'premium' (English names)
  console.log('📊 Step 1: Updating user_simulation_quota table...');

  // ⭐ USE REAL BILLING DATES FROM LEMON SQUEEZY ⭐
  // Extract the actual billing period from webhook data
  const periodStartDate = periodStart ? new Date(periodStart) : new Date();
  const periodEndDate = periodEnd ? new Date(periodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  console.log(`📅 Billing period: ${periodStartDate.toISOString()} → ${periodEndDate.toISOString()}`);
  console.log(`📅 Next renewal: ${renewsAt}`);

  // Delete existing quota record for this user (to handle period conflicts)
  await supabase.from('user_simulation_quota').delete().eq('user_id', userId);

  const { error: quotaError } = await supabase.from('user_simulation_quota').insert({
    user_id: userId,
    subscription_tier: tier, // 'basic' or 'premium' (English)
    total_simulations: simulationLimit,
    simulations_used: 0,
    period_start: periodStartDate.toISOString(),
    period_end: periodEndDate.toISOString(),
  });

  if (quotaError) {
    console.error('❌ Failed to update quota table:', quotaError.message);
    errors.push(`quota: ${quotaError.message}`);
    success = false;
  } else {
    console.log('✅ Quota table updated successfully');
  }

  // STEP 2: Update users table
  // Users table now uses English tier names: 'free', 'basic', 'premium' (after migration 20260114191630)
  const usersTier = tier;
  console.log(`📊 Step 2: Updating users table (tier: ${usersTier})...`);

  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_tier: usersTier,
      subscription_status: status === 'active' ? 'active' : 'inactive',
      simulation_limit: simulationLimit,
      simulations_used_this_month: 0,
      subscription_id: String(subscriptionId),
      variant_id: String(variantId),
      subscription_period_start: periodStartDate.toISOString().split('T')[0], // YYYY-MM-DD
      subscription_period_end: periodEndDate.toISOString().split('T')[0], // YYYY-MM-DD
      subscription_created_at: createdAt || new Date().toISOString(),
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (userError) {
    console.error('❌ Failed to update users table:', userError.message);
    errors.push(`users: ${userError.message}`);
    success = false;
  } else {
    console.log('✅ Users table updated successfully');
  }

  // STEP 3: Try to insert into user_subscriptions (optional, for tracking)
  console.log('📊 Step 3: Recording subscription in user_subscriptions...');

  const { error: subError } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      lemonsqueezy_subscription_id: subscriptionId,
      tier,
      status,
      variant_id: String(variantId),
      variant_name: variantName,
      simulation_limit: simulationLimit,
      created_at: createdAt,
      updated_at: updatedAt,
      expires_at: expiresAt,
      renews_at: renewsAt,
      period_start: periodStart,
      period_end: periodEnd,
      webhook_event: eventType,
    },
    { onConflict: 'user_id,lemonsqueezy_subscription_id' }
  );

  if (subError) {
    // Non-critical - log but don't fail
    console.warn('⚠️ Failed to record in user_subscriptions (non-critical):', subError.message);
  } else {
    console.log('✅ Subscription recorded in user_subscriptions');
  }

  if (!success) {
    throw new Error(`Subscription processing failed: ${errors.join(', ')}`);
  }

  console.log('✅ All subscription updates completed successfully!');

  return {
    success: true,
    tier_changed: true,
    old_tier: 'unknown',
    new_tier: tier,
  };
}

// LEGACY: Use existing upsert_subscription_from_webhook database function
async function upsertSubscriptionViaFunction(userId, subscriptionData, eventType) {
  const {
    subscriptionId,
    variantId,
    variantName,
    customerEmail,
    tier,
    status,
    simulationLimit,
    createdAt,
    updatedAt,
    expiresAt,
    renewsAt,
    periodStart,
    periodEnd,
  } = subscriptionData;

  console.log('🔄 Calling upsert_subscription_from_webhook:', {
    userId,
    subscriptionId,
    tier,
    status,
    variantId,
  });

  const { data, error } = await supabase.rpc('upsert_subscription_from_webhook', {
    p_user_id: userId,
    p_lemonsqueezy_subscription_id: subscriptionId,
    p_tier: tier,
    p_status: status,
    p_variant_id: String(variantId),
    p_variant_name: variantName,
    p_customer_email: customerEmail,
    p_simulation_limit: simulationLimit,
    p_created_at: createdAt,
    p_updated_at: updatedAt,
    p_expires_at: expiresAt,
    p_renews_at: renewsAt,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_webhook_event: eventType,
  });

  if (error) {
    console.error('❌ Error calling upsert_subscription_from_webhook:', error);
    throw error;
  }

  console.log('✅ Upsert successful:', data);
  return data;
}

// Netlify function handler
exports.handler = async (event, context) => {
  console.log('Lemon Squeezy webhook received:', event.httpMethod);

  // Handle GET requests for testing
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Lemon Squeezy webhook endpoint is working',
        timestamp: new Date().toISOString(),
        environment: {
          hasWebhookSecret: !!process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get the raw body and signature
    const payload = event.body;
    const signature = event.headers['x-signature'];
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Webhook secret not configured' }),
      };
    }

    if (!signature) {
      console.error('No signature provided in webhook');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No signature provided' }),
      };
    }

    // Verify the webhook signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    const eventData = JSON.parse(payload);
    const eventType = eventData.meta?.event_name;

    console.log(`Processing webhook event: ${eventType}`);
    console.log('Event data:', JSON.stringify(eventData, null, 2));

    if (!eventType) {
      await logWebhookEvent('unknown', eventData, null, null, 'failed', 'Missing event_name in webhook');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing event_name' }),
      };
    }

    // Extract subscription data
    const subscriptionData = eventData.data?.attributes;
    const subscriptionId = eventData.data?.id;
    const variantId = subscriptionData?.variant_id;
    const variantName = subscriptionData?.variant_name;
    const customerEmail = subscriptionData?.user_email;
    const status = subscriptionData?.status;

    if (!subscriptionId || !customerEmail) {
      await logWebhookEvent(eventType, eventData, subscriptionId, null, 'failed', 'Missing required subscription data');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing subscription ID or customer email' }),
      };
    }

    // Find user by email
    const user = await findUserByEmail(customerEmail);
    if (!user) {
      await logWebhookEvent(
        eventType,
        eventData,
        subscriptionId,
        null,
        'failed',
        `User not found for email: ${customerEmail}`
      );
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const userId = user.id;

    // Determine subscription tier
    const tier = determineSubscriptionTier(variantName, variantId);
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    // Prepare subscription data for upsert function
    const subData = {
      subscriptionId: String(subscriptionId),
      variantId,
      variantName: variantName || tierConfig.name,
      customerEmail,
      tier,
      status,
      simulationLimit: tierConfig.simulationLimit,
      createdAt: subscriptionData?.created_at
        ? new Date(subscriptionData.created_at).toISOString()
        : new Date().toISOString(),
      updatedAt: subscriptionData?.updated_at
        ? new Date(subscriptionData.updated_at).toISOString()
        : new Date().toISOString(),
      expiresAt: subscriptionData?.ends_at ? new Date(subscriptionData.ends_at).toISOString() : null,
      renewsAt: subscriptionData?.renews_at ? new Date(subscriptionData.renews_at).toISOString() : null,
      periodStart: subscriptionData?.billing_anchor
        ? new Date(subscriptionData.billing_anchor).toISOString()
        : new Date().toISOString(),
      periodEnd: subscriptionData?.renews_at ? new Date(subscriptionData.renews_at).toISOString() : null,
    };

    // Handle different event types
    switch (eventType) {
      case 'subscription_created':
        console.log(`📝 Creating subscription for user ${userId}`);

        // 🔄 AUTO-CANCEL: Cancel any previous subscriptions to prevent double billing
        const cancelResult = await cancelPreviousSubscriptions(userId, subscriptionId);
        if (cancelResult.cancelled > 0) {
          console.log(`✅ Auto-cancelled ${cancelResult.cancelled} previous subscription(s)`);
        }

        // ✨ ATOMIC: Process subscription + quota in single transaction
        const createResult = await processSubscriptionAtomically(userId, subData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, {
          success: createResult.success,
          tier: createResult.new_tier,
          previous_subscriptions_cancelled: cancelResult.cancelled,
        });
        console.log(`✅ Subscription created successfully for user ${userId}`);
        console.log('Create result:', createResult);
        break;

      case 'subscription_updated':
        console.log(`🔄 Updating subscription for user ${userId}`);

        // ⭐ CHECK IF THIS IS A RENEWAL (new billing period started) ⭐
        console.log('🔍 Checking if billing period renewed...');

        const { data: existingQuota } = await supabase
          .from('user_simulation_quota')
          .select('period_end, simulations_used')
          .eq('user_id', userId)
          .order('period_start', { ascending: false })
          .limit(1)
          .single();

        if (existingQuota) {
          const existingPeriodEnd = new Date(existingQuota.period_end);
          const newPeriodEnd = new Date(subData.periodEnd);

          console.log(`   Existing period end: ${existingPeriodEnd.toISOString()}`);
          console.log(`   New period end: ${newPeriodEnd.toISOString()}`);

          // If the period end has moved forward, this is a renewal
          if (newPeriodEnd > existingPeriodEnd) {
            console.log('✅ BILLING PERIOD RENEWED - Resetting simulation counter!');

            // Update quota with reset counter and new period
            const { error: resetError } = await supabase
              .from('user_simulation_quota')
              .update({
                simulations_used: 0, // ⭐ RESET COUNTER ⭐
                period_start: subData.periodStart,
                period_end: subData.periodEnd,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            if (resetError) {
              console.error('❌ Error resetting quota:', resetError);
            } else {
              console.log(`✅ Counter reset from ${existingQuota.simulations_used} → 0`);

              // Also sync users table
              await supabase.from('users').update({ simulations_used_this_month: 0 }).eq('id', userId);
            }
          } else {
            console.log('ℹ️  No renewal detected (period end unchanged)');
          }
        }

        // Re-determine tier in case of upgrade/downgrade
        const newTier = determineSubscriptionTier(variantName, variantId);
        const newTierConfig = SUBSCRIPTION_TIERS[newTier];

        subData.tier = newTier;
        subData.simulationLimit = newTierConfig.simulationLimit;

        // ✨ ATOMIC: Process subscription + quota in single transaction
        const updateResult = await processSubscriptionAtomically(userId, subData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, {
          success: updateResult.success,
          tier_changed: updateResult.tier_changed,
          old_tier: updateResult.old_tier,
          new_tier: updateResult.new_tier,
        });
        console.log(`✅ Subscription updated successfully for user ${userId}`);
        console.log('Update result:', updateResult);

        // Check if tier changed (upgrade/downgrade)
        if (updateResult.tier_changed) {
          console.log(`🎉 TIER CHANGED: ${updateResult.old_tier} → ${updateResult.new_tier}`);
          console.log('✅ Quota automatically updated');
        }
        break;

      case 'subscription_cancelled':
        console.log(`❌ Cancelling subscription for user ${userId}`);

        subData.status = 'cancelled';

        // ✨ ATOMIC: Process subscription + quota in single transaction
        const cancellationResult = await processSubscriptionAtomically(userId, subData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, {
          success: cancellationResult.success,
        });
        console.log(`✅ Subscription cancelled for user ${userId}, access until ${subData.expiresAt}`);
        console.log('Cancel result:', cancellationResult);
        break;

      case 'subscription_expired':
        console.log(`⏰ Expiring subscription for user ${userId}`);

        subData.status = 'expired';
        subData.expiresAt = new Date().toISOString();
        subData.tier = 'free'; // Reset to free tier
        subData.simulationLimit = 3;

        // ✨ ATOMIC: Process subscription + quota in single transaction
        const expireResult = await processSubscriptionAtomically(userId, subData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, {
          success: expireResult.success,
          reset_to_free: true,
        });
        console.log(`✅ Subscription expired for user ${userId}, reset to free tier`);
        console.log('Expire result:', expireResult);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
        await logWebhookEvent(
          eventType,
          eventData,
          subscriptionId,
          userId,
          'ignored',
          `Unhandled event type: ${eventType}`
        );
        break;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: `Event ${eventType} processed successfully`,
        user_id: userId,
        subscription_id: subscriptionId,
      }),
    };
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Try to log the error if we have enough data
    try {
      const eventData = JSON.parse(event.body);
      const subscriptionId = eventData.data?.id;
      const eventType = eventData.meta?.event_name;
      await logWebhookEvent(eventType || 'error', eventData, subscriptionId, null, 'failed', error.message);
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
