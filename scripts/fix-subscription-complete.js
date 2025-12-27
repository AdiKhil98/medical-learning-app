/**
 * Complete Subscription Fix - Update both users and quota tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = '3393a897-a54a-4abc-b764-0555d171ce97';

async function fixAll() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔧 COMPLETE SUBSCRIPTION FIX');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Fix users table - use 'basic' not 'basis'
  console.log('1️⃣ Updating users table...');
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_tier: 'basic', // Use 'basic' to match constraint
      subscription_status: 'active',
      simulation_limit: 30,
      simulations_used_this_month: 0,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', USER_ID);

  if (userError) {
    console.error('❌ Failed to update users:', userError.message);
  } else {
    console.log('✅ Users table updated\n');
  }

  // Fix quota table - use 'basic' not 'basis'
  console.log('2️⃣ Updating user_simulation_quota table...');
  const { error: quotaError } = await supabase
    .from('user_simulation_quota')
    .update({
      subscription_tier: 'basic', // Use 'basic' to match constraint
      total_simulations: 30,
      simulations_used: 0,
      simulations_remaining: 30,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', USER_ID);

  if (quotaError) {
    console.error('❌ Failed to update quota:', quotaError.message);
  } else {
    console.log('✅ Quota table updated\n');
  }

  // Verify
  console.log('3️⃣ Verifying changes...\n');

  const { data: user } = await supabase
    .from('users')
    .select('email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month')
    .eq('id', USER_ID)
    .single();

  const { data: quota } = await supabase.from('user_simulation_quota').select('*').eq('user_id', USER_ID).single();

  console.log('Users table:');
  console.log('  Email:', user?.email);
  console.log('  Tier:', user?.subscription_tier);
  console.log('  Status:', user?.subscription_status);
  console.log('  Limit:', user?.simulation_limit);
  console.log('  Used:', user?.simulations_used_this_month);
  console.log('');

  console.log('Quota table:');
  console.log('  Tier:', quota?.subscription_tier);
  console.log('  Total:', quota?.total_simulations);
  console.log('  Used:', quota?.simulations_used);
  console.log('  Remaining:', quota?.simulations_remaining);
  console.log('');

  if (user?.subscription_tier === 'basic' && quota?.subscription_tier === 'basic') {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Subscription upgraded to Basic (30 simulations)');
    console.log('   Please refresh the app to see the changes.');
    console.log('═══════════════════════════════════════════════════════════');
  } else {
    console.log('⚠️ Some updates may have failed - check errors above');
  }
}

fixAll().catch(console.error);
