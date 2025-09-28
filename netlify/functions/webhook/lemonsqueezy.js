const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Subscription tier mapping
const SUBSCRIPTION_TIERS = {
  'basis': {
    name: 'Basis-Plan',
    simulationLimit: 30
  },
  'profi': {
    name: 'Profi-Plan',
    simulationLimit: 60
  },
  'unlimited': {
    name: 'Unlimited-Plan',
    simulationLimit: null
  }
};

// Helper function to verify webhook signature (Lemon Squeezy format)function verifyWebhookSignature(payload, signature, secret) {  const hmac = crypto.createHmac('sha256', secret);  const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');  const signatureBuffer = Buffer.from(signature || ', 'utf8');  return crypto.timingSafeEqual(digest, signatureBuffer);}

// Helper function to determine subscription tier from variant name or ID
function determineSubscriptionTier(variantName, variantId) {
  const name = variantName?.toLowerCase() || '';

  if (name.includes('basis') || name.includes('basic')) {
    return 'basis';
  } else if (name.includes('profi') || name.includes('pro')) {
    return 'profi';
  } else if (name.includes('unlimited') || name.includes('premium')) {
    return 'unlimited';
  }

  // Fallback based on variant ID or default
  console.warn(`Unknown subscription tier for variant: ${variantName} (${variantId}), defaulting to basis`);
  return 'basis';
}

// Helper function to log webhook events
async function logWebhookEvent(eventType, eventData, subscriptionId, userId, status = 'processed', errorMessage = null) {
  try {
    const { error } = await supabase
      .from('webhook_events')
      .insert({
        event_type: eventType,
        event_data: eventData,
        subscription_id: subscriptionId,
        user_id: userId,
        status: status,
        error_message: errorMessage
      });

    if (error) {
      console.error('Failed to log webhook event:', error);
    }
  } catch (err) {
    console.error('Error logging webhook event:', err);
  }
}

// Helper function to find user by email
async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error finding user by email:', error);
    return null;
  }

  return data;
}

// Helper function to update user subscription
async function updateUserSubscription(userId, subscriptionData) {
  const { error } = await supabase
    .from('users')
    .update({
      ...subscriptionData,
      subscription_updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
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
          hasSupabaseUrl: !!process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        }
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get the raw body and signature
    const payload = event.body;
    const signature = event.headers['X-Signature'];
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Webhook secret not configured' })
      };
    }

    if (!signature) {
      console.error('No signature provided in webhook');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No signature provided' })
      };
    }

    // Verify the webhook signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' })
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
        body: JSON.stringify({ error: 'Missing event_name' })
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
        body: JSON.stringify({ error: 'Missing subscription ID or customer email' })
      };
    }

    // Find user by email
    const user = await findUserByEmail(customerEmail);
    if (!user) {
      await logWebhookEvent(eventType, eventData, subscriptionId, null, 'failed', `User not found for email: ${customerEmail}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userId = user.id;

    // Determine subscription tier
    const tier = determineSubscriptionTier(variantName, variantId);
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    // Handle different event types
    switch (eventType) {
      case 'subscription_created':
        console.log(`Creating subscription for user ${userId}`);

        await updateUserSubscription(userId, {
          subscription_id: subscriptionId,
          variant_id: variantId,
          subscription_status: 'active',
          subscription_tier: tier,
          subscription_variant_name: tierConfig.name,
          simulation_limit: tierConfig.simulationLimit,
          lemon_squeezy_customer_email: customerEmail,
          subscription_created_at: new Date().toISOString(),
          subscription_expires_at: subscriptionData.ends_at ? new Date(subscriptionData.ends_at).toISOString() : null
        });

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(`Subscription created successfully for user ${userId}`);
        break;

      case 'subscription_updated':
        console.log(`Updating subscription for user ${userId}`);

        // Determine new tier (in case of upgrade/downgrade)
        const newTier = determineSubscriptionTier(variantName, variantId);
        const newTierConfig = SUBSCRIPTION_TIERS[newTier];

        await updateUserSubscription(userId, {
          subscription_id: subscriptionId,
          variant_id: variantId,
          subscription_status: status === 'active' ? 'active' : status,
          subscription_tier: newTier,
          subscription_variant_name: newTierConfig.name,
          simulation_limit: newTierConfig.simulationLimit,
          subscription_expires_at: subscriptionData.ends_at ? new Date(subscriptionData.ends_at).toISOString() : null
        });

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(`Subscription updated successfully for user ${userId}`);
        break;

      case 'subscription_cancelled':
        console.log(`Cancelling subscription for user ${userId}`);

        // Mark as cancelled but keep access until end of period
        await updateUserSubscription(userId, {
          subscription_status: 'cancelled',
          subscription_expires_at: subscriptionData.ends_at ? new Date(subscriptionData.ends_at).toISOString() : null
        });

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(`Subscription cancelled for user ${userId}, access until ${subscriptionData.ends_at}`);
        break;

      case 'subscription_expired':
        console.log(`Expiring subscription for user ${userId}`);

        // Remove access when subscription expires
        await updateUserSubscription(userId, {
          subscription_status: 'expired',
          subscription_tier: null,
          subscription_variant_name: null,
          simulation_limit: null,
          subscription_expires_at: new Date().toISOString()
        });

        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'processed');
        console.log(`Subscription expired for user ${userId}, access removed`);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
        await logWebhookEvent(eventType, eventData, subscriptionId, userId, 'ignored', `Unhandled event type: ${eventType}`);
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
        subscription_id: subscriptionId
      })
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
        message: error.message
      })
    };
  }
};