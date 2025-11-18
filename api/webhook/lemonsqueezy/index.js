const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

// Helper function to verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = hmac.digest('hex');

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace(/^sha256=/, '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(cleanSignature, 'hex')
  );
}

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

// Main webhook handler
async function handleWebhook(req, res) {
  console.log('Lemon Squeezy webhook received:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the raw body and signature
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-signature'];
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!signature) {
      console.error('No signature provided in webhook');
      return res.status(400).json({ error: 'No signature provided' });
    }

    // Verify the webhook signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.meta?.event_name;

    console.log(`Processing webhook event: ${eventType}`);
    console.log('Event data:', JSON.stringify(event, null, 2));

    if (!eventType) {
      await logWebhookEvent('unknown', event, null, null, 'failed', 'Missing event_name in webhook');
      return res.status(400).json({ error: 'Missing event_name' });
    }

    // Extract subscription data
    const subscriptionData = event.data?.attributes;
    const subscriptionId = event.data?.id;
    const variantId = subscriptionData?.variant_id;
    const variantName = subscriptionData?.variant_name;
    const customerEmail = subscriptionData?.user_email;
    const status = subscriptionData?.status;

    if (!subscriptionId || !customerEmail) {
      await logWebhookEvent(eventType, event, subscriptionId, null, 'failed', 'Missing required subscription data');
      return res.status(400).json({ error: 'Missing subscription ID or customer email' });
    }

    // Find user by email
    const user = await findUserByEmail(customerEmail);
    if (!user) {
      await logWebhookEvent(eventType, event, subscriptionId, null, 'failed', `User not found for email: ${customerEmail}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.id;

    // Determine subscription tier
    const tier = determineSubscriptionTier(variantName, variantId);
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    // Handle different event types
    switch (eventType) {
      case 'subscription_created':
        console.log(`Creating subscription for user ${userId}`);

        // Reset counters when creating a new subscription
        await updateUserSubscription(userId, {
          subscription_id: subscriptionId,
          variant_id: variantId,
          subscription_status: 'active',
          subscription_type: tier,
          subscription_tier: tier,
          subscription_variant_name: tierConfig.name,
          simulation_limit: tierConfig.simulationLimit,
          simulations_used_this_month: 0, // Reset monthly counter
          lemon_squeezy_customer_email: customerEmail,
          subscription_created_at: new Date().toISOString(),
          subscription_expires_at: subscriptionData.ends_at ? new Date(subscriptionData.ends_at).toISOString() : null
        });

        await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
        console.log(`Subscription created successfully for user ${userId}, counters reset`);
        break;

      case 'subscription_updated':
        console.log(`Updating subscription for user ${userId}`);

        // Determine new tier (in case of upgrade/downgrade)
        const newTier = determineSubscriptionTier(variantName, variantId);
        const newTierConfig = SUBSCRIPTION_TIERS[newTier];

        // Prepare update data
        const updateData = {
          subscription_id: subscriptionId,
          variant_id: variantId,
          subscription_status: status === 'active' ? 'active' : status,
          subscription_type: newTier,
          subscription_tier: newTier,
          subscription_variant_name: newTierConfig.name,
          simulation_limit: newTierConfig.simulationLimit,
          subscription_expires_at: subscriptionData.ends_at ? new Date(subscriptionData.ends_at).toISOString() : null
        };

        // Reset counter when upgrading to unlimited tier
        if (newTier === 'unlimited') {
          updateData.simulations_used_this_month = 0;
          console.log(`Resetting simulation counter for unlimited upgrade (user ${userId})`);
        }

        await updateUserSubscription(userId, updateData);

        await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
        console.log(`Subscription updated successfully for user ${userId}`);
        break;

      case 'subscription_cancelled':
        console.log(`Cancelling subscription for user ${userId}`);

        // Mark as cancelled but keep access until end of period
        await updateUserSubscription(userId, {
          subscription_status: 'cancelled',
          subscription_expires_at: subscriptionData.ends_at ? new Date(subscriptionData.ends_at).toISOString() : null
        });

        await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
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

        await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
        console.log(`Subscription expired for user ${userId}, access removed`);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
        await logWebhookEvent(eventType, event, subscriptionId, userId, 'ignored', `Unhandled event type: ${eventType}`);
        break;
    }

    return res.status(200).json({
      success: true,
      message: `Event ${eventType} processed successfully`,
      user_id: userId,
      subscription_id: subscriptionId
    });

  } catch (error) {
    console.error('Webhook processing error:', error);

    // Try to log the error if we have enough data
    try {
      const event = req.body;
      const subscriptionId = event.data?.id;
      const eventType = event.meta?.event_name;
      await logWebhookEvent(eventType || 'error', event, subscriptionId, null, 'failed', error.message);
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = handleWebhook;