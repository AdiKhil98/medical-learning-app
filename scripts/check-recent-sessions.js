const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

async function checkRecentSessions() {
  console.log('🔍 Checking recent sessions for user...\\n');

  const { data: sessions, error } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('started_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${sessions.length} recent sessions:\\n`);

  sessions.forEach((session, idx) => {
    const num = idx + 1;
    console.log(`${num}. Session ${session.session_token.substring(0, 8)}...`);
    console.log(`   Started: ${new Date(session.started_at).toLocaleString()}`);
    console.log(`   Ended: ${session.ended_at ? new Date(session.ended_at).toLocaleString() : 'STILL ACTIVE ❌'}`);
    console.log(`   Duration: ${session.duration_seconds !== null ? `${session.duration_seconds  }s` : 'NULL'}`);
    console.log(`   Status: ${session.status || 'N/A'}`);
    console.log(`   Counted: ${session.counted_toward_usage ? 'YES ✅' : 'NO'}`);
    console.log('');
  });

  // Check quota
  const { data: quota } = await supabase.from('user_simulation_quota').select('*').eq('user_id', TEST_USER_ID).single();

  if (quota) {
    console.log(`📊 Current Quota: ${quota.simulations_used}/${quota.total_simulations}`);
  }
}

checkRecentSessions().then(() => process.exit(0));
