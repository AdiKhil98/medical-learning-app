/**
 * Fix Quota Table - Update subscription tier in quota table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USER_ID = '3393a897-a54a-4abc-b764-0555d171ce97';

async function fixQuota() {
  console.log('🔧 Fixing user_simulation_quota table...\n');

  // First, let's see what columns exist
  const { data: currentQuota, error: fetchError } = await supabase
    .from('user_simulation_quota')
    .select('*')
    .eq('user_id', USER_ID)
    .single();

  console.log('Current quota record:', currentQuota);
  console.log('');

  // Update with correct column names
  const { data, error } = await supabase
    .from('user_simulation_quota')
    .update({
      subscription_tier: 'basis',
      simulations_used: 0, // Reset for new subscription
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', USER_ID)
    .select();

  if (error) {
    console.error('❌ Error updating quota:', error);

    // Try upsert
    console.log('\nTrying upsert...');
    const { data: upsertData, error: upsertError } = await supabase
      .from('user_simulation_quota')
      .upsert(
        {
          user_id: USER_ID,
          subscription_tier: 'basis',
          simulations_used: 0,
        },
        { onConflict: 'user_id' }
      )
      .select();

    if (upsertError) {
      console.error('❌ Upsert also failed:', upsertError);
    } else {
      console.log('✅ Upsert succeeded:', upsertData);
    }
  } else {
    console.log('✅ Quota updated:', data);
  }

  // Verify
  const { data: verified } = await supabase.from('user_simulation_quota').select('*').eq('user_id', USER_ID).single();

  console.log('\nVerified quota:', verified);
}

fixQuota().catch(console.error);
