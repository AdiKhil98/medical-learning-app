const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const USER_ID = '3393a897-a54a-4abc-b764-0555d171ce97';

async function checkSubscriptions() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 CHECKING USER SUBSCRIPTIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check user_subscriptions table
  console.log('📊 user_subscriptions table:');
  const { data: subs, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false });

  if (subError) {
    console.log('  Error:', subError.message);
  } else if (!subs || subs.length === 0) {
    console.log('  No records found');
  } else {
    console.log('  Found', subs.length, 'subscription(s):');
    subs.forEach((sub, i) => {
      console.log('');
      console.log(`  Subscription #${  i + 1  }:`);
      console.log('    LemonSqueezy ID:', sub.lemonsqueezy_subscription_id);
      console.log('    Tier:', sub.tier);
      console.log('    Status:', sub.status);
      console.log('    Simulation Limit:', sub.simulation_limit);
      console.log('    Created:', new Date(sub.created_at).toLocaleString());
    });
  }

  // Check user_simulation_quota table
  console.log('\n📊 user_simulation_quota table:');
  const { data: quotas, error: quotaError } = await supabase
    .from('user_simulation_quota')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false });

  if (quotaError) {
    console.log('  Error:', quotaError.message);
  } else if (!quotas || quotas.length === 0) {
    console.log('  No records found');
  } else {
    console.log('  Found', quotas.length, 'quota record(s):');
    quotas.forEach((q, i) => {
      console.log('');
      console.log(`  Quota #${  i + 1  }:`);
      console.log('    Tier:', q.subscription_tier);
      console.log('    Total:', q.total_simulations);
      console.log('    Used:', q.simulations_used);
      console.log('    Remaining:', q.simulations_remaining);
    });
  }

  // Check users table
  console.log('\n📊 users table:');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status, simulation_limit, simulations_used_this_month')
    .eq('id', USER_ID)
    .single();

  if (userError) {
    console.log('  Error:', userError.message);
  } else {
    console.log('  Tier:', user.subscription_tier);
    console.log('  Status:', user.subscription_status);
    console.log('  Limit:', user.simulation_limit);
    console.log('  Used this month:', user.simulations_used_this_month);
  }

  // Check webhook events for this user
  console.log('\n📊 Recent webhook events:');
  const { data: events } = await supabase
    .from('webhook_events')
    .select('event_type, status, created_at, event_data')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(10);

  if (events && events.length > 0) {
    events.forEach((e, i) => {
      const tier = e.event_data?.data?.attributes?.variant_name || 'unknown';
      console.log(
        `  ${ 
          i + 1 
          }. ${ 
          e.event_type 
          } (${ 
          tier 
          }) - ${ 
          e.status 
          } - ${ 
          new Date(e.created_at).toLocaleString()}`
      );
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
}

checkSubscriptions();
