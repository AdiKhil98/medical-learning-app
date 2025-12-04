const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

/**
 * Change user's subscription plan
 * Uses Lemon Squeezy's PATCH API to update existing subscription
 * This PREVENTS double subscriptions!
 */
exports.handler = async (event, context) => {
  console.log('🔄 Change plan request received');

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if API key is configured
  if (!LEMONSQUEEZY_API_KEY) {
    console.error('❌ LEMONSQUEEZY_API_KEY not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { userId, newVariantId } = JSON.parse(event.body);

    if (!userId || !newVariantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or newVariantId' })
      };
    }

    console.log(`📋 Changing plan for user ${userId} to variant ${newVariantId}`);

    // STEP 1: Get user's current active subscription from user_subscriptions table
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'on_trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      console.error('❌ No active subscription found:', subError);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'No active subscription found',
          message: 'User must have an active subscription to change plans'
        })
      };
    }

    console.log(`✅ Found subscription: ${subscription.lemonsqueezy_subscription_id}`);

    // STEP 2: Check if already on this plan
    if (parseInt(subscription.lemonsqueezy_variant_id) === parseInt(newVariantId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Already on this plan',
          message: 'User is already subscribed to this plan'
        })
      };
    }

    // STEP 3: Call Lemon Squeezy API to UPDATE subscription (not create new!)
    console.log(`🔄 Calling Lemon Squeezy API to update subscription...`);
    
    const response = await fetch(
      `${LEMONSQUEEZY_API_URL}/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
      {
        method: 'PATCH',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
        },
        body: JSON.stringify({
          data: {
            type: 'subscriptions',
            id: subscription.lemonsqueezy_subscription_id,
            attributes: {
              variant_id: parseInt(newVariantId),
              invoice_immediately: true  // Charge proration now for clarity
            }
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Lemon Squeezy API error:', error);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'Plan change failed', 
          details: error.errors?.[0]?.detail || 'Unknown error',
          message: 'Failed to update subscription with Lemon Squeezy'
        })
      };
    }

    const updated = await response.json();
    
    console.log('✅ Lemon Squeezy API success:', updated.data);

    // STEP 4: The webhook will handle updating our database
    // (subscription_updated event will fire and update everything)
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Plan changed successfully',
        subscription_id: subscription.lemonsqueezy_subscription_id,
        old_variant_id: subscription.lemonsqueezy_variant_id,
        new_variant_id: newVariantId,
        data: updated.data
      })
    };

  } catch (error) {
    console.error('❌ Change plan error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
