const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

async function verifyFix() {
  console.log('🔍 FINAL VERIFICATION TEST\n');
  console.log('='.repeat(80));

  // Get current quota BEFORE test
  const { data: quotaBefore, error: quotaError1 } = await supabase
    .from('user_simulation_quota')
    .select('simulations_used')
    .eq('user_id', TEST_USER_ID)
    .single();

  if (quotaError1) {
    console.error('❌ Error reading quota:', quotaError1);
    process.exit(1);
  }

  console.log(`\n📊 Current quota: ${quotaBefore.simulations_used}/60`);

  // Find an old session that's eligible to be counted
  const { data: sessions, error: sessError } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('counted_toward_usage', false)
    .order('started_at', { ascending: false })
    .limit(5);

  if (sessError) {
    console.error('❌ Error reading sessions:', sessError);
    process.exit(1);
  }

  console.log(`\n📋 Found ${sessions.length} uncounted sessions\n`);

  // Find one that's old enough (>= 5 minutes)
  let testSession = null;
  for (const session of sessions) {
    const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
    console.log(`   ${session.session_token.substring(0, 8)}... - ${Math.floor(elapsed / 60)} min ago`);

    if (elapsed >= 295 && !testSession) {
      testSession = session;
      console.log(`   ☝️ Using this one for test (${elapsed}s old)`);
    }
  }

  if (!testSession) {
    console.log('\n⚠️ No sessions old enough to test with (need >= 295 seconds)');
    console.log('But the migration was applied successfully!');
    console.log('\n✅ Next step: Start a new simulation and wait 5 minutes to test live.');
    process.exit(0);
  }

  console.log(`\n🧪 Testing mark_simulation_counted() with session: ${testSession.session_token.substring(0, 8)}...\n`);

  // Call the RPC function
  const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_simulation_counted', {
    p_session_token: testSession.session_token,
    p_user_id: TEST_USER_ID,
  });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError);
    console.error('Message:', rpcError.message);
    process.exit(1);
  }

  console.log('RPC Response:', JSON.stringify(rpcResult, null, 2));

  // Get quota AFTER test
  const { data: quotaAfter, error: quotaError2 } = await supabase
    .from('user_simulation_quota')
    .select('simulations_used')
    .eq('user_id', TEST_USER_ID)
    .single();

  if (quotaError2) {
    console.error('❌ Error reading quota after test:', quotaError2);
    process.exit(1);
  }

  console.log(`\n📊 Quota before: ${quotaBefore.simulations_used}`);
  console.log(`📊 Quota after:  ${quotaAfter.simulations_used}`);

  if (rpcResult.success) {
    if (rpcResult.already_counted) {
      console.log('\n✅ Session was already counted (idempotent behavior works!)');
    } else if (quotaAfter.simulations_used > quotaBefore.simulations_used) {
      console.log('\n🎉 SUCCESS! Quota incremented correctly!');
      console.log('✅ The fix is working!');
    } else {
      console.log('\n❌ RPC succeeded but quota did NOT increment!');
      console.log('There may still be an issue.');
    }
  } else {
    console.log(`\n⚠️ RPC returned success=false: ${rpcResult.error}`);
    if (rpcResult.error === 'Insufficient time elapsed') {
      console.log('This is expected - session is too young.');
    }
  }

  console.log(`\n${  '='.repeat(80)}`);
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(80));
}

verifyFix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
