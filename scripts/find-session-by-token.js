const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Session token from the screenshot
const SESSION_TOKEN = '8531e8a7-9a98-d7bd-9727-17f69af56abe';

async function findSession() {
  console.log(`🔍 Searching for session: ${SESSION_TOKEN}\n`);

  const { data, error } = await supabase.from('simulation_usage_logs').select('*').eq('session_token', SESSION_TOKEN);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Session not found in database!');
    console.log('This means the frontend is using a stale/cached session token.');
    return;
  }

  console.log(`✅ Found ${data.length} session(s) with this token:\n`);

  data.forEach((session, idx) => {
    if (data.length > 1) console.log(`\n=== SESSION ${idx + 1} ===`);
    const data = session;
    console.log('✅ Session found in database:\n');
    console.log(`Session Token: ${data.session_token}`);
    console.log(`User ID: ${data.user_id}`);
    console.log(`Started: ${new Date(data.started_at).toLocaleString()}`);
    console.log(
      `Timer Started: ${data.timer_started_at ? new Date(data.timer_started_at).toLocaleString() : 'NOT SET ❌'}`
    );
    console.log(`Ended: ${data.ended_at ? new Date(data.ended_at).toLocaleString() : 'STILL ACTIVE ⚠️'}`);
    console.log(`Duration: ${data.duration_seconds !== null ? `${data.duration_seconds  }s` : 'NULL'}`);
    console.log(`Counted: ${data.counted_toward_usage ? 'YES ✅' : 'NO'}`);

    const now = new Date();
    const started = new Date(data.started_at);
    const timerStarted = data.timer_started_at ? new Date(data.timer_started_at) : null;

    const ageFromStarted = Math.floor((now - started) / 1000 / 60);
    const ageFromTimer = timerStarted ? Math.floor((now - timerStarted) / 1000 / 60) : null;

    console.log(`\n⏱️ Session age:`);
    console.log(`  From started_at: ${ageFromStarted} minutes ago`);
    console.log(`  From timer_started_at: ${ageFromTimer !== null ? `${ageFromTimer  } minutes ago` : 'N/A'}`);

    if (data.ended_at) {
      const sessionDuration = Math.floor((new Date(data.ended_at) - started) / 1000 / 60);
      console.log(`  Total session duration: ${sessionDuration} minutes`);
    }
  });
}

findSession().then(() => process.exit(0));
