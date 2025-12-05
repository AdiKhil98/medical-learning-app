const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, userId, subscriptionId, email } = JSON.parse(event.body);
    if (!action) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing action' }) };
    }

    switch (action) {
      case 'list': return await listUserSubscriptions(userId, email);
      case 'check-duplicates': return await checkDuplicateSubscriptions();
      case 'cancel': return await cancelSubscription(subscriptionId);
      case 'sync': return await syncUserLimits(userId);
      case 'history': return await getSubscriptionHistory(userId);
      default: return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error', message: error.message })
    };
  }
};

async function listUserSubscriptions(userId, email) {
  if (!userId && !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Provide userId or email' }) };
  }

  if (email) {
    const { data } = await supabase.from('users').select('id').eq('email', email).single();
    if (!data) return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    userId = data.id;
  }

  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const { data: userData } = await supabase
    .from('users')
    .select('email, subscription_tier, simulation_limit, simulations_used_this_month')
    .eq('id', userId)
    .single();

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      user: userData,
      subscriptions: subscriptions,
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'active').length
    })
  };
}

async function checkDuplicateSubscriptions() {
  // Query to find users with multiple active subscriptions
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('user_id, lemonsqueezy_customer_email, lemonsqueezy_subscription_id, status')
    .in('status', ['active', 'on_trial']);

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', message: error.message })
    };
  }

  // Group by user_id to find duplicates
  const userGroups = {};
  data.forEach(sub => {
    if (!userGroups[sub.user_id]) {
      userGroups[sub.user_id] = {
        user_id: sub.user_id,
        user_email: sub.lemonsqueezy_customer_email,
        subscriptions: []
      };
    }
    userGroups[sub.user_id].subscriptions.push(sub.lemonsqueezy_subscription_id);
  });

  // Filter to only users with multiple subscriptions
  const duplicates = Object.values(userGroups).filter(user => user.subscriptions.length > 1);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      duplicates_found: duplicates.length,
      users: duplicates.map(d => ({
        user_id: d.user_id,
        user_email: d.user_email,
        subscription_count: d.subscriptions.length,
        subscription_ids: d.subscriptions
      }))
    })
  };
}

async function cancelSubscription(subscriptionId) {
  if (!subscriptionId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing subscriptionId' }) };
  }

  const response = await fetch(`${LEMONSQUEEZY_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: 'Failed', details: error.errors?.[0]?.detail })
    };
  }

  const result = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'Subscription cancelled',
      subscription_id: subscriptionId
    })
  };
}

async function syncUserLimits(userId) {
  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
  }

  const { data, error } = await supabase.rpc('sync_primary_subscription_to_user', {
    p_user_id: userId
  });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'User limits synced',
      result: data
    })
  };
}

async function getSubscriptionHistory(userId) {
  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
  }

  const { data } = await supabase
    .from('subscription_change_audit')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      history: data,
      total: data.length
    })
  };
}
