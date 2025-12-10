const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Subscription tier mapping
const SUBSCRIPTION_TIERS = {
  basis: {
    name: 'Basis-Plan',
    simulationLimit: 30,
  },
  profi: {
    name: 'Profi-Plan',
    simulationLimit: 60,
  },
  unlimited: {
    name: 'Unlimited-Plan',
    simulationLimit: null,
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
  1006948: 'basis', // Basis Plan
  1006934: 'profi', // Profi Plan
  1006947: 'unlimited', // Unlimited Plan
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
  if (name.includes('basis') || name.includes('basic')) {
    console.log(`Mapped variant name "${variantName}" to tier: basis`);
    return 'basis';
  } else if (name.includes('profi') || name.includes('pro')) {
    console.log(`Mapped variant name "${variantName}" to tier: profi`);
    return 'profi';
  } else if (name.includes('unlimited') || name.includes('premium')) {
    console.log(`Mapped variant name "${variantName}" to tier: unlimited`);
    return 'unlimited';
  }

  // Final fallback
  console.warn(`Unknown subscription tier for variant: ${variantName} (ID: ${variantId}), defaulting to basis`);
  return 'basis';
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

// Helper function to find user by email
async function findUserByEmail(email) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error finding user by email:', error);
    return null;
  }

  return data;
}

// NEW: Use existing upsert_subscription_from_webhook database function
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

        const createResult = await upsertSubscriptionViaFunction(userId, subData, eventType);

        // ✨ NEW: Update quota for the new subscription
        const createQuotaUpdate = await updateUserQuota(userId, tier);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, createQuotaUpdate);
        console.log(`✅ Subscription created successfully for user ${userId}`);
        console.log('Create result:', createResult);
        break;

      case 'subscription_updated':
        console.log(`🔄 Updating subscription for user ${userId}`);

        // Re-determine tier in case of upgrade/downgrade
        const newTier = determineSubscriptionTier(variantName, variantId);
        const newTierConfig = SUBSCRIPTION_TIERS[newTier];

        subData.tier = newTier;
        subData.simulationLimit = newTierConfig.simulationLimit;

        const updateResult = await upsertSubscriptionViaFunction(userId, subData, eventType);

        // ✨ NEW: Update quota for the updated subscription
        const updateQuotaUpdate = await updateUserQuota(userId, newTier);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, updateQuotaUpdate);
        console.log(`✅ Subscription updated successfully for user ${userId}`);
        console.log('Update result:', updateResult);

        // Check if tier changed (upgrade/downgrade)
        if (updateResult && updateResult.sync_result && updateResult.sync_result.tier_changed) {
          console.log(`🎉 TIER CHANGED: ${updateResult.sync_result.old_tier} → ${updateResult.sync_result.new_tier}`);
          console.log('✅ Counter and quota automatically reset');
        }
        break;

      case 'subscription_cancelled':
        console.log(`❌ Cancelling subscription for user ${userId}`);

        subData.status = 'cancelled';

        const cancelResult = await upsertSubscriptionViaFunction(userId, subData, eventType);

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(`✅ Subscription cancelled for user ${userId}, access until ${subData.expiresAt}`);
        console.log('Cancel result:', cancelResult);
        break;

      case 'subscription_expired':
        console.log(`⏰ Expiring subscription for user ${userId}`);

        subData.status = 'expired';
        subData.expiresAt = new Date().toISOString();

        const expireResult = await upsertSubscriptionViaFunction(userId, subData, eventType);

        // ✨ NEW: Reset quota to free tier when subscription expires
        const expireQuotaUpdate = await updateUserQuota(userId, 'free');

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed', null, expireQuotaUpdate);
        console.log(`✅ Subscription expired for user ${userId}, access removed`);
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
