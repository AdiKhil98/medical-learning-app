const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

async function verifyCleanupRPC() {
  console.log('🔍 Verifying cleanup_orphaned_sessions_for_user RPC function...\n');

  try {
    // Test calling the function
    const { data, error } = await supabase.rpc('cleanup_orphaned_sessions_for_user', {
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
        console.error('\n🚨 CRITICAL: RPC function does not exist in database!');
        console.error('   Migration needs to be applied: 20251219100000_add_cleanup_orphaned_sessions_rpc.sql');
      }

      process.exit(1);
    }

    console.log('✅ RPC function exists and is callable');
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    console.log('\n✅ Cleanup RPC function is working correctly!');
  } catch (error) {
    console.error('❌ Exception:', error);
    process.exit(1);
  }
}

verifyCleanupRPC().then(() => process.exit(0));
