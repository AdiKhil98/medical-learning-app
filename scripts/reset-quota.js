const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseServiceKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetQuota() {
  // Test user ID from the logs
  const userId = '3393a897-a54a-4abc-b764-0555d171ce97';
  const newCount = 2;

  console.log(`\n🔧 Resetting quota for user ${userId} to ${newCount}/3...`);

  // Update user_simulation_quota table
  const { data, error } = await supabase
    .from('user_simulation_quota')
    .update({ simulations_used: newCount })
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('❌ Error updating quota:', error);
    return;
  }

  console.log('✅ Quota updated:', data);

  // Verify the update
  const { data: verify, error: verifyError } = await supabase
    .from('user_simulation_quota')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
    return;
  }

  console.log(`\n✅ Current quota: ${verify.simulations_used}/${verify.max_simulations}`);
}

resetQuota();
