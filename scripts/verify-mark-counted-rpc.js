const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

async function verifyMarkCountedRPC() {
  console.log('🔍 Verifying mark_simulation_counted RPC function...\n');

  // First, get an active or recent session to test with
  const { data: sessions } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('started_at', { ascending: false })
    .limit(1);

  if (!sessions || sessions.length === 0) {
    console.log('ℹ️ No sessions found to test with');
    return;
  }

  const testSession = sessions[0];
  console.log(`Testing with session: ${testSession.session_token.substring(0, 8)}...`);
  console.log(`  Started: ${new Date(testSession.started_at).toLocaleString()}`);
  console.log(`  Duration: ${testSession.duration_seconds}s`);
  console.log(`  Already counted: ${testSession.counted_toward_usage}\n`);

  try {
    // Test calling the function
    const { data, error } = await supabase.rpc('mark_simulation_counted', {
      p_session_token: testSession.session_token,
      p_user_id: TEST_USER_ID,
    });

    if (error) {
      console.error('❌ RPC function error:', error);
      console.error('\nError details:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Details:', error.details);
      console.error('  Hint:', error.hint);

      if (error.code === 'PGRST202') {
        console.error('\n🚨 CRITICAL: mark_simulation_counted RPC function does NOT exist in database!');
        console.error('   This is why simulations are not being counted!');
      }

      process.exit(1);
    }

    console.log('✅ RPC function exists and is callable');
    console.log('\nResponse:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Function executed successfully!');
      if (data.already_counted) {
        console.log('   (Session was already counted before)');
      } else {
        console.log('   Session was just marked as counted!');
      }
    } else {
      console.log('\n⚠️ Function returned success=false');
      console.log('   Error:', data.error || 'Unknown');
    }
  } catch (error) {
    console.error('❌ Exception:', error);
    process.exit(1);
  }
}

verifyMarkCountedRPC().then(() => process.exit(0));
