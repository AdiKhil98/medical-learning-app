/**
 * FINAL FIX - Use the correct German tier name 'basis' for quota table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = '3393a897-a54a-4abc-b764-0555d171ce97';

async function finalFix() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔧 FINAL SUBSCRIPTION FIX');
  console.log('═══════════════════════════════════════════════════════════\n');

  // The issue: webhook sends 'basic' but DB constraint requires 'basis'
  // Use the database function handle_subscription_change with correct German name

  console.log('1️⃣ Calling handle_subscription_change RPC with tier="basis"...');

  const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_subscription_change', {
    p_user_id: USER_ID,
    p_new_tier: 'basis', // German name - this is what the DB expects!
  });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError.message);
    console.log('\nFalling back to direct update...');

    // Direct update of quota table with German tier name
    const { error: updateError } = await supabase
      .from('user_simulation_quota')
      .update({
        subscription_tier: 'basis',
        total_simulations: 20, // basis tier = 20 simulations
        simulations_used: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', USER_ID);

    if (updateError) {
      console.error('❌ Direct update also failed:', updateError.message);
    } else {
      console.log('✅ Direct update succeeded');
    }
  } else {
    console.log('✅ RPC succeeded:', rpcResult);
  }

  // Also update users table to be consistent
  console.log('\n2️⃣ Updating users table...');

  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_tier: 'basis',
      subscription_status: 'active',
      simulation_limit: 30, // You bought 30 simulations
      simulations_used_this_month: 0,
    })
    .eq('id', USER_ID);

  if (userError) {
    console.error('❌ Users update error:', userError.message);
  } else {
    console.log('✅ Users table updated');
  }

  // Verify
  console.log('\n3️⃣ Verifying...\n');

  const { data: quota } = await supabase.from('user_simulation_quota').select('*').eq('user_id', USER_ID).single();

  const { data: user } = await supabase
    .from('users')
    .select('email, subscription_tier, subscription_status, simulation_limit')
    .eq('id', USER_ID)
    .single();

  console.log('Quota table:');
  console.log('  Tier:', quota?.subscription_tier);
  console.log('  Total:', quota?.total_simulations);
  console.log('  Used:', quota?.simulations_used);
  console.log('  Remaining:', quota?.simulations_remaining);
  console.log('');

  console.log('Users table:');
  console.log('  Email:', user?.email);
  console.log('  Tier:', user?.subscription_tier);
  console.log('  Status:', user?.subscription_status);
  console.log('  Limit:', user?.simulation_limit);
  console.log('');

  if (quota?.subscription_tier === 'basis') {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Please refresh the app to see the changes.');
    console.log('   You should now have access to your Basic plan simulations.');
    console.log('═══════════════════════════════════════════════════════════');
  }
}

finalFix().catch(console.error);
