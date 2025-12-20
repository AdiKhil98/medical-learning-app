const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; // Using ANON key like browser does
const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

console.log('🧪 Testing RPC permissions with ANON key (like browser)...\n');

// Create client with ANON key (same as browser)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPermissions() {
  // Find a session to test with
  const { data: sessions, error: sessError } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('counted_toward_usage', false)
    .order('started_at', { ascending: false })
    .limit(1);

  if (sessError) {
    console.error('❌ Error fetching sessions:', sessError.message);
    process.exit(1);
  }

  if (!sessions || sessions.length === 0) {
    console.log('ℹ️ No uncounted sessions found. Creating a test will require a running simulation.');
    console.log('✅ But the important thing is: Can we CALL the RPC?');
  }

  const testSession = sessions?.[0] || { session_token: 'test-token-123' };
  console.log(`Testing with session: ${testSession.session_token.substring(0, 8)}...\n`);

  try {
    console.log('🔄 Calling mark_simulation_counted RPC with ANON key...');

    const { data, error } = await supabase.rpc('mark_simulation_counted', {
      p_session_token: testSession.session_token,
      p_user_id: TEST_USER_ID,
    });

    if (error) {
      if (error.code === '42501') {
        console.error('\n❌ PERMISSION DENIED!');
        console.error('The GRANT command did not work or was not applied correctly.');
        console.error('Error:', error.message);
        process.exit(1);
      } else {
        console.log('\n✅ RPC IS CALLABLE! (Got an error, but NOT a permission error)');
        console.log('Error:', error.message);
        console.log('This means the permissions are correct, the error is expected (session not found/too short/etc)');
      }
    } else {
      console.log('\n🎉 SUCCESS! RPC CALL COMPLETED!');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('\n❌ Exception:', err.message);
    process.exit(1);
  }

  console.log('\n✅ PERMISSIONS TEST COMPLETE');
  console.log('The browser should now be able to call the RPC function!');
}

testPermissions().then(() => process.exit(0));
