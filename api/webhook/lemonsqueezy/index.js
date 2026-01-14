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
  if (!payload || !signature || !secret) {
    console.error('Missing required parameters for signature verification');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = hmac.digest('hex');

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace(/^sha256=/, '');

  // SECURITY FIX: Validate signature format (must be 64 hex characters for SHA-256)
  if (!/^[a-f0-9]{64}$/i.test(cleanSignature)) {
    console.error('Invalid signature format - not 64 hex characters:', cleanSignature.length);
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(expectedSignature)) {
    console.error('Invalid expected signature format');
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(cleanSignature, 'hex'));
  } catch (error) {
    console.error('Error comparing signatures:', error);
    return false;
  }
}

// Valid subscription tiers
const VALID_TIERS = ['free', 'basic', 'premium'];

// Helper function to validate tier value
function isValidTier(tier) {
  return VALID_TIERS.includes(tier);
}

// Helper function to determine subscription tier from variant name or ID
function determineSubscriptionTier(variantName, variantId) {
  const name = variantName?.toLowerCase() || '';

  let tier = null;

  if (name.includes('basis') || name.includes('basic')) {
    tier = 'basic';
  } else if (name.includes('profi') || name.includes('pro') || name.includes('premium')) {
    tier = 'premium';
  }

  // Validate the determined tier
  if (tier && isValidTier(tier)) {
    return tier;
  }

  // Fallback based on variant ID or default
  console.warn(`Unknown subscription tier for variant: ${variantName} (${variantId}), defaulting to basic`);
  return 'basic';
}

// Helper function to log webhook events
async function logWebhookEvent(
  eventType,
  eventData,
  subscriptionId,
  userId,
  status = 'processed',
  errorMessage = null
) {
  try {
    const { error } = await supabase.from('webhook_events').insert({
      event_type: eventType,
      event_data: eventData,
      subscription_id: subscriptionId,
      user_id: userId,
      status,
      error_message: errorMessage,
    });

    if (error) {
      console.error('Failed to log webhook event:', error);
    }
  } catch (err) {
    console.error('Error logging webhook event:', err);
  }
}

// Helper function to find user by email (case-insensitive)
async function findUserByEmail(email) {
  if (!email) {
    console.error('findUserByEmail: email is null or undefined');
    return null;
  }

  // ISSUE #17 FIX: Trim whitespace only, use ilike for case-insensitive search
  // This avoids redundant normalization since ilike handles case sensitivity
  const trimmedEmail = email.trim();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', trimmedEmail) // Case-insensitive search handles casing
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error finding user by email:', error);
    return null;
  }

  if (!data) {
    console.warn(`User not found for email: ${trimmedEmail}`);
  }

  return data;
}

// Helper function to update user subscription with retry logic (LEGACY - kept for backward compatibility)
async function updateUserSubscription(userId, subscriptionData, retries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error, data } = await supabase
        .from('users')
        .update({
          ...subscriptionData,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select();

      if (error) {
        lastError = error;
        console.error(`Attempt ${attempt}/${retries} - Error updating user subscription:`, error);

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
      } else {
        console.log(`✅ Successfully updated subscription for user ${userId}`, data);
        return true;
      }
    } catch (err) {
      lastError = err;
      console.error(`Attempt ${attempt}/${retries} - Exception updating subscription:`, err);

      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  // All retries failed
  console.error(`❌ Failed to update subscription after ${retries} attempts`);
  throw lastError || new Error('Failed to update subscription');
}

// NEW: Helper function to upsert subscription using the multi-subscription system
async function upsertSubscription(
  userId,
  subscriptionId,
  tier,
  status,
  variantId,
  variantName,
  customerEmail,
  tierConfig,
  subscriptionData,
  webhookEvent,
  retries = 3
) {
  // ISSUE #14 FIX: Validate tier before database operation
  if (!isValidTier(tier)) {
    console.error(`❌ Invalid tier value: ${tier}. Must be one of: ${VALID_TIERS.join(', ')}`);
    throw new Error(`Invalid subscription tier: ${tier}`);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.rpc('upsert_subscription_from_webhook', {
        p_user_id: userId,
        p_lemonsqueezy_subscription_id: subscriptionId,
        p_tier: tier,
        p_status: status,
        p_variant_id: variantId?.toString() || null,
        p_variant_name: variantName || tierConfig.name,
        p_customer_email: customerEmail,
        p_simulation_limit: tierConfig.simulationLimit || null,
        p_created_at: subscriptionData.created_at || new Date().toISOString(),
        p_updated_at: new Date().toISOString(),
        p_expires_at: subscriptionData.ends_at || null,
        p_renews_at: subscriptionData.renews_at || null,
        p_period_start: subscriptionData.current_period_start || new Date().toISOString(),
        p_period_end: subscriptionData.current_period_end || subscriptionData.renews_at || null,
        p_webhook_event: webhookEvent,
      });

      if (error) {
        lastError = error;
        console.error(`Attempt ${attempt}/${retries} - Error upserting subscription:`, error);

        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
      } else {
        console.log(`✅ Successfully upserted subscription for user ${userId}`, data);

        // Check if tier changed
        const syncResult = data?.sync_result;
        if (syncResult?.tier_changed) {
          console.log(`📊 Tier changed from ${syncResult.old_tier} to ${syncResult.new_tier}, counter reset`);
        }

        return data;
      }
    } catch (err) {
      lastError = err;
      console.error(`Attempt ${attempt}/${retries} - Exception upserting subscription:`, err);

      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  console.error(`❌ Failed to upsert subscription after ${retries} attempts`);
  throw lastError || new Error('Failed to upsert subscription');
}

// Main webhook handler
async function handleWebhook(req, res) {
  console.log('Lemon Squeezy webhook received:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SECURITY FIX: Use raw body for signature verification if available
    // This ensures the exact bytes sent by LemonSqueezy are used for verification
    // req.rawBody is set by Vercel/Next.js when bodyParser is disabled
    const payload = req.rawBody
      ? typeof req.rawBody === 'string'
        ? req.rawBody
        : req.rawBody.toString('utf8')
      : JSON.stringify(req.body);

    const signature = req.headers['x-signature'];
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    console.log('Webhook payload type:', req.rawBody ? 'raw' : 'stringified');

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
      await logWebhookEvent(
        eventType,
        event,
        subscriptionId,
        null,
        'failed',
        `User not found for email: ${customerEmail}`
      );
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.id;

    // Determine subscription tier
    const tier = determineSubscriptionTier(variantName, variantId);
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    // Handle different event types using the new multi-subscription system
    switch (eventType) {
      case 'subscription_created':
        console.log(`Creating subscription for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'active',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_created'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Subscription created successfully for user ${userId}`);
        } catch (error) {
          console.error('Error creating subscription:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to create subscription' });
        }
        break;

      case 'subscription_updated':
        console.log(`Updating subscription ${subscriptionId} for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            status,
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_updated'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Subscription updated successfully for user ${userId}`);
        } catch (error) {
          console.error('Error updating subscription:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to update subscription' });
        }
        break;

      case 'subscription_cancelled':
        console.log(`Cancelling subscription for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'cancelled',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_cancelled'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Subscription cancelled for user ${userId}, access until ${subscriptionData.ends_at}`);
        } catch (error) {
          console.error('Error cancelling subscription:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to cancel subscription' });
        }
        break;

      case 'subscription_expired':
        console.log(`Expiring subscription for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'expired',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_expired'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Subscription expired for user ${userId}`);
        } catch (error) {
          console.error('Error expiring subscription:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to expire subscription' });
        }
        break;

      case 'subscription_payment_success':
        console.log(`Payment successful for user ${userId} - resetting monthly counter`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'active',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_payment_success'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Payment successful for user ${userId}, counter reset for new billing period`);
        } catch (error) {
          console.error('Error processing payment success:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to process payment success' });
        }
        break;

      case 'subscription_payment_failed':
        console.log(`Payment failed for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'past_due',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_payment_failed'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Payment failed for user ${userId}, marked as past_due`);
        } catch (error) {
          console.error('Error processing payment failure:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to process payment failure' });
        }
        break;

      case 'subscription_payment_recovered':
        console.log(`Payment recovered for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'active',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_payment_recovered'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Payment recovered for user ${userId}, subscription reactivated`);
        } catch (error) {
          console.error('Error processing payment recovery:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to process payment recovery' });
        }
        break;

      case 'subscription_resumed':
        console.log(`Subscription resumed for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'active',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_resumed'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Subscription resumed for user ${userId}`);
        } catch (error) {
          console.error('Error resuming subscription:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to resume subscription' });
        }
        break;

      case 'subscription_paused':
        console.log(`Subscription paused for user ${userId}`);

        try {
          await upsertSubscription(
            userId,
            subscriptionId,
            tier,
            'paused',
            variantId,
            variantName,
            customerEmail,
            tierConfig,
            subscriptionData,
            'subscription_paused'
          );

          await logWebhookEvent(eventType, event, subscriptionId, userId, 'processed');
          console.log(`Subscription paused for user ${userId}`);
        } catch (error) {
          console.error('Error pausing subscription:', error);
          await logWebhookEvent(eventType, event, subscriptionId, userId, 'failed', error.message);
          return res.status(500).json({ error: 'Failed to pause subscription' });
        }
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
        await logWebhookEvent(
          eventType,
          event,
          subscriptionId,
          userId,
          'ignored',
          `Unhandled event type: ${eventType}`
        );
        break;
    }

    return res.status(200).json({
      success: true,
      message: `Event ${eventType} processed successfully`,
      user_id: userId,
      subscription_id: subscriptionId,
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    console.error('Error stack:', error.stack);

    // Try to log the error if we have enough data
    try {
      const event = req.body;
      const subscriptionId = event.data?.id;
      const eventType = event.meta?.event_name;
      const customerEmail = event.data?.attributes?.user_email;

      const errorDetails = {
        message: error.message,
        stack: error.stack,
        eventType,
        subscriptionId,
        customerEmail,
      };

      await logWebhookEvent(eventType || 'error', event, subscriptionId, null, 'failed', JSON.stringify(errorDetails));

      console.log('✅ Error logged to webhook_events table');
    } catch (logError) {
      console.error('❌ Failed to log webhook error:', logError);
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

module.exports = handleWebhook;
