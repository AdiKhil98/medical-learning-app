const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

async function checkQuotaSync() {
  console.log('🔍 Checking quota sync between tables...\n');

  // Get from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('simulations_used_this_month, free_simulations_used, subscription_tier')
    .eq('id', TEST_USER_ID)
    .single();

  if (userError) {
    console.error('❌ Error reading users table:', userError);
    return;
  }

  // Get from user_simulation_quota table
  const { data: quotaData, error: quotaError } = await supabase
    .from('user_simulation_quota')
    .select('simulations_used, total_simulations')
    .eq('user_id', TEST_USER_ID)
    .single();

  if (quotaError) {
    console.error('❌ Error reading quota table:', quotaError);
    return;
  }

  console.log('📊 USERS TABLE:');
  console.log(`   subscription_tier: ${userData.subscription_tier || 'free'}`);
  console.log(`   simulations_used_this_month: ${userData.simulations_used_this_month}`);
  console.log(`   free_simulations_used: ${userData.free_simulations_used}`);

  console.log('\n📊 USER_SIMULATION_QUOTA TABLE:');
  console.log(`   simulations_used: ${quotaData.simulations_used}`);
  console.log(`   total_simulations: ${quotaData.total_simulations}`);

  // Determine which counter should be used
  const expectedUsed =
    userData.subscription_tier && userData.subscription_tier !== ''
      ? userData.simulations_used_this_month
      : userData.free_simulations_used;

  console.log('\n🔍 SYNC CHECK:');
  console.log(`   Expected (from users table): ${expectedUsed}`);
  console.log(`   Actual (from quota table): ${quotaData.simulations_used}`);

  if (expectedUsed === quotaData.simulations_used) {
    console.log(`   ✅ SYNCED - Tables match!`);
  } else {
    console.log(`   ❌ OUT OF SYNC - Difference: ${Math.abs(expectedUsed - quotaData.simulations_used)}`);
    console.log('\n   This means the sync trigger is not working!');
  }

  // Count sessions that are marked as counted
  const { data: counted, error: countedError } = await supabase
    .from('simulation_usage_logs')
    .select('session_token', { count: 'exact', head: true })
    .eq('user_id', TEST_USER_ID)
    .eq('counted_toward_usage', true);

  if (!countedError) {
    console.log('\n📈 SESSIONS MARKED AS COUNTED:');
    console.log(`   Total: ${counted || 0} sessions with counted_toward_usage=true`);
  }
}

checkQuotaSync().then(() => process.exit(0));
