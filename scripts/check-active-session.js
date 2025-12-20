const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

async function checkActiveSession() {
  console.log('🔍 Checking for active session...\n');

  // Check via get_active_simulation RPC
  const { data: activeSession, error } = await supabase.rpc('get_active_simulation', {
    p_user_id: TEST_USER_ID,
  });

  if (error) {
    console.error('❌ Error calling get_active_simulation:', error);
    return;
  }

  if (activeSession) {
    console.log('✅ Active session found:');
    console.log(JSON.stringify(activeSession, null, 2));
  } else {
    console.log('ℹ️ No active session found');
  }

  // Also check database directly
  console.log('\n📊 Checking database directly for sessions with ended_at IS NULL:\n');
  const { data: orphaned, error: orphanedError } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .is('ended_at', null)
    .order('started_at', { ascending: false });

  if (orphanedError) {
    console.error('❌ Error:', orphanedError);
    return;
  }

  if (orphaned && orphaned.length > 0) {
    console.log(`Found ${orphaned.length} sessions with ended_at IS NULL:`);
    orphaned.forEach((session) => {
      console.log(`\nSession ${session.session_token.substring(0, 8)}...`);
      console.log(`  Started: ${new Date(session.started_at).toLocaleString()}`);
      console.log(
        `  Timer started: ${session.timer_started_at ? new Date(session.timer_started_at).toLocaleString() : 'NOT SET'}`
      );

      const now = new Date();
      const started = new Date(session.started_at);
      const timerStarted = session.timer_started_at ? new Date(session.timer_started_at) : null;

      const ageFromStarted = Math.floor((now - started) / 1000);
      const ageFromTimer = timerStarted ? Math.floor((now - timerStarted) / 1000) : null;

      console.log(`  Age from started_at: ${ageFromStarted}s`);
      console.log(`  Age from timer_started_at: ${ageFromTimer ? `${ageFromTimer  }s` : 'N/A'}`);
      console.log(
        `  Should use for elapsed: ${ageFromTimer !== null ? `timer_started_at (${  ageFromTimer  }s)` : `started_at (${  ageFromStarted  }s)`}`
      );
    });
  } else {
    console.log('No orphaned sessions found');
  }
}

checkActiveSession().then(() => process.exit(0));
