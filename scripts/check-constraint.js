/**
 * Check what subscription_tier values the database actually accepts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = '3393a897-a54a-4abc-b764-0555d171ce97';

async function testTiers() {
  console.log('Testing which tier values are accepted by the database...\n');

  // First delete the existing row
  console.log('Deleting existing quota record...');
  const { error: deleteError } = await supabase.from('user_simulation_quota').delete().eq('user_id', USER_ID);

  if (deleteError) {
    console.log('Delete result:', deleteError.message);
  } else {
    console.log('✅ Deleted existing record\n');
  }

  // Try different tier values
  const tiersToTest = ['free', 'basis', 'basic', 'profi', 'premium', 'unlimited'];

  for (const tier of tiersToTest) {
    console.log(`Testing tier: "${tier}"...`);

    const { error: insertError } = await supabase.from('user_simulation_quota').insert({
      user_id: USER_ID,
      subscription_tier: tier,
      total_simulations: 30,
      simulations_used: 0,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.log(`  ❌ "${tier}" - REJECTED: ${insertError.message.substring(0, 80)}`);
    } else {
      console.log(`  ✅ "${tier}" - ACCEPTED!`);

      // Clean up for next test
      await supabase.from('user_simulation_quota').delete().eq('user_id', USER_ID);
    }
  }

  console.log('\n');
}

testTiers().catch(console.error);
