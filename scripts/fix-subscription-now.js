/**
 * NOW FIX - Using the correct tier value 'basic' that production accepts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = '3393a897-a54a-4abc-b764-0555d171ce97';

async function fixNow() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔧 FIXING SUBSCRIPTION WITH CORRECT TIER VALUE');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Insert quota record with 'basic' (the accepted value)
  console.log('1️⃣ Inserting quota record with tier="basic" (30 simulations)...');

  const { data: insertData, error: insertError } = await supabase
    .from('user_simulation_quota')
    .insert({
      user_id: USER_ID,
      subscription_tier: 'basic',
      total_simulations: 30,
      simulations_used: 0,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select();

  if (insertError) {
    console.error('❌ Insert error:', insertError.message);
  } else {
    console.log('✅ Quota record created:', insertData);
  }

  // Update users table - 'basis' works there (different constraint)
  console.log('\n2️⃣ Updating users table...');

  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_tier: 'basis',
      subscription_status: 'active',
      simulation_limit: 30,
      simulations_used_this_month: 0,
    })
    .eq('id', USER_ID);

  if (userError) {
    console.error('❌ Users table error:', userError.message);
  } else {
    console.log('✅ Users table updated');
  }

  // Verify
  console.log('\n3️⃣ Verification:\n');

  const { data: quota } = await supabase.from('user_simulation_quota').select('*').eq('user_id', USER_ID).single();

  const { data: user } = await supabase
    .from('users')
    .select('email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month')
    .eq('id', USER_ID)
    .single();

  console.log('📊 Quota table:');
  console.log('  Tier:', quota?.subscription_tier);
  console.log('  Total Simulations:', quota?.total_simulations);
  console.log('  Used:', quota?.simulations_used);
  console.log('  Remaining:', quota?.simulations_remaining);
  console.log('');

  console.log('👤 Users table:');
  console.log('  Email:', user?.email);
  console.log('  Tier:', user?.subscription_tier);
  console.log('  Status:', user?.subscription_status);
  console.log('  Limit:', user?.simulation_limit);
  console.log('  Used:', user?.simulations_used_this_month);
  console.log('');

  if (quota?.subscription_tier === 'basic' && quota?.total_simulations === 30) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Your subscription has been fixed.');
    console.log('   You now have 30 simulations available.');
    console.log('   Please refresh the app to see the changes.');
    console.log('═══════════════════════════════════════════════════════════');
  }
}

fixNow().catch(console.error);
