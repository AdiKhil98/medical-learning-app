/**
 * Fix Subscription Sync - Diagnose and fix subscription not syncing after payment
 *
 * Run with: node scripts/fix-subscription-sync.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.log('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// User ID to fix (your account)
const USER_ID = '3393a897-a54a-4abc-b764-0555d171ce97';

async function diagnoseAndFix() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 SUBSCRIPTION SYNC DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Step 1: Check current user data
  console.log('📊 Step 1: Checking current user data...\n');

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month')
    .eq('id', USER_ID)
    .single();

  if (userError) {
    console.error('❌ Error fetching user:', userError);
    return;
  }

  console.log('Current user state:');
  console.log('  Email:', user.email);
  console.log('  Subscription Tier:', user.subscription_tier || 'null (free)');
  console.log('  Subscription Status:', user.subscription_status || 'inactive');
  console.log('  Simulation Limit:', user.simulation_limit || '3 (free default)');
  console.log('  Simulations Used:', user.simulations_used_this_month || 0);
  console.log('');

  // Step 2: Check recent webhook events
  console.log('📊 Step 2: Checking recent webhook events...\n');

  const { data: webhookEvents, error: webhookError } = await supabase
    .from('webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (webhookError) {
    console.log('⚠️ Could not fetch webhook events (table might not exist):', webhookError.message);
  } else if (!webhookEvents || webhookEvents.length === 0) {
    console.log('⚠️ No webhook events found - webhook might not be reaching Netlify');
  } else {
    console.log(`Found ${webhookEvents.length} recent webhook events:`);
    webhookEvents.forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.event_type} - ${event.status} - ${new Date(event.created_at).toLocaleString()}`);
      if (event.error_message) {
        console.log(`     Error: ${event.error_message}`);
      }
      if (event.user_id) {
        console.log(`     User ID: ${event.user_id}`);
      }
    });
    console.log('');
  }

  // Step 3: Check user_subscriptions table
  console.log('📊 Step 3: Checking user_subscriptions table...\n');

  const { data: subscriptions, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', USER_ID);

  if (subError) {
    console.log('⚠️ Could not fetch subscriptions:', subError.message);
  } else if (!subscriptions || subscriptions.length === 0) {
    console.log('⚠️ No subscriptions found in user_subscriptions table');
  } else {
    console.log(`Found ${subscriptions.length} subscription(s):`);
    subscriptions.forEach((sub, i) => {
      console.log(`  ${i + 1}. Tier: ${sub.tier}, Status: ${sub.status}, Limit: ${sub.simulation_limit}`);
      console.log(`     LemonSqueezy ID: ${sub.lemonsqueezy_subscription_id}`);
      console.log(`     Created: ${new Date(sub.created_at).toLocaleString()}`);
    });
    console.log('');
  }

  // Step 4: Check user_simulation_quota table
  console.log('📊 Step 4: Checking user_simulation_quota table...\n');

  const { data: quota, error: quotaError } = await supabase
    .from('user_simulation_quota')
    .select('*')
    .eq('user_id', USER_ID)
    .single();

  if (quotaError) {
    console.log('⚠️ Could not fetch quota:', quotaError.message);
  } else {
    console.log('Current quota state:');
    console.log('  Simulations Used:', quota.simulations_used);
    console.log('  Max Simulations:', quota.max_simulations);
    console.log('  Subscription Tier:', quota.subscription_tier);
    console.log('  Period Start:', quota.period_start);
    console.log('  Period End:', quota.period_end);
    console.log('');
  }

  // Step 5: Apply manual fix
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔧 APPLYING FIX: Upgrading to Basic plan (30 simulations)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Update user table
  const { error: updateUserError } = await supabase
    .from('users')
    .update({
      subscription_tier: 'basis',
      subscription_status: 'active',
      simulation_limit: 30,
      simulations_used_this_month: 0, // Reset usage for new subscription
      subscription_updated_at: new Date().toISOString(),
      subscription_period_start: new Date().toISOString().split('T')[0],
      subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    .eq('id', USER_ID);

  if (updateUserError) {
    console.error('❌ Failed to update users table:', updateUserError);
  } else {
    console.log('✅ Updated users table');
  }

  // Update or insert into user_simulation_quota
  const { error: upsertQuotaError } = await supabase.from('user_simulation_quota').upsert(
    {
      user_id: USER_ID,
      subscription_tier: 'basis',
      max_simulations: 30,
      simulations_used: 0, // Reset for new subscription
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (upsertQuotaError) {
    console.error('❌ Failed to update user_simulation_quota:', upsertQuotaError);
  } else {
    console.log('✅ Updated user_simulation_quota table');
  }

  // Create subscription record if missing
  const { error: insertSubError } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: USER_ID,
      tier: 'basic',
      status: 'active',
      simulation_limit: 30,
      customer_email: user.email,
      variant_name: 'Basic-Plan',
      lemonsqueezy_subscription_id: `manual-sync-${  Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (insertSubError) {
    console.log('⚠️ Could not insert subscription record:', insertSubError.message);
  } else {
    console.log('✅ Created/updated user_subscriptions record');
  }

  // Verify the fix
  console.log('\n📊 Verifying fix...\n');

  const { data: fixedUser } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status, simulation_limit, simulations_used_this_month')
    .eq('id', USER_ID)
    .single();

  const { data: fixedQuota } = await supabase.from('user_simulation_quota').select('*').eq('user_id', USER_ID).single();

  console.log('After fix:');
  console.log('  Users table:');
  console.log('    - Tier:', fixedUser?.subscription_tier);
  console.log('    - Status:', fixedUser?.subscription_status);
  console.log('    - Limit:', fixedUser?.simulation_limit);
  console.log('    - Used:', fixedUser?.simulations_used_this_month);
  console.log('');
  console.log('  Quota table:');
  console.log('    - Tier:', fixedQuota?.subscription_tier);
  console.log('    - Max:', fixedQuota?.max_simulations);
  console.log('    - Used:', fixedQuota?.simulations_used);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ FIX COMPLETE - Please refresh the app to see changes');
  console.log('═══════════════════════════════════════════════════════════');
}

diagnoseAndFix().catch(console.error);
