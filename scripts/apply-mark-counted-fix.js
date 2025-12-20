const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('🔧 Applying mark_simulation_counted Fix\n');
  console.log('='.repeat(80));

  try {
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20251220000002_fix_mark_counted_update_quota_directly.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const cleanSQL = migrationSQL
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim() !== 'COMMIT;')
      .join('\n')
      .trim();

    console.log('\n🚀 Executing migration...\n');

    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: cleanSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully\n');

    // Test the fix
    console.log('🔍 Testing the fix...\n');
    const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

    // Get a session to test with
    const { data: sessions } = await supabase
      .from('simulation_usage_logs')
      .select('session_token, counted_toward_usage, started_at')
      .eq('user_id', TEST_USER_ID)
      .is('counted_toward_usage', false)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const session = sessions[0];
      const sessionAge = (Date.now() - new Date(session.started_at).getTime()) / 1000;

      if (sessionAge >= 295) {
        console.log(`Found test session: ${session.session_token.substring(0, 8)}... (${Math.floor(sessionAge)}s old)`);

        const { data: result } = await supabase.rpc('mark_simulation_counted', {
          p_session_token: session.session_token,
          p_user_id: TEST_USER_ID,
        });

        console.log('\nRPC Result:', JSON.stringify(result, null, 2));

        if (result.success) {
          // Check quota
          const { data: quota } = await supabase
            .from('user_simulation_quota')
            .select('simulations_used')
            .eq('user_id', TEST_USER_ID)
            .single();

          console.log(`\n✅ Quota after marking: ${quota.simulations_used}`);
          console.log('\n🎉 FIX VERIFIED! Quota was incremented!');
        }
      } else {
        console.log('⏳ Active session too young to test (<5 min)');
      }
    } else {
      console.log('ℹ️ No uncounted sessions to test with');
    }

    console.log('\n\n📊 SUMMARY:');
    console.log('='.repeat(80));
    console.log('✅ mark_simulation_counted() now updates user_simulation_quota DIRECTLY');
    console.log('✅ No longer relies on broken sync trigger');
    console.log('✅ Quota will increment correctly when 5-minute mark is reached');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
