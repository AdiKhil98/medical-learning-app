const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';
const SESSION_TOKEN_PREFIX = '52b31b7'; // From screenshot

async function diagnose() {
  console.log('🔍 SYSTEMATIC QUOTA INCREMENT FAILURE DIAGNOSIS\n');
  console.log('='.repeat(80));

  // STEP 1: Verify migration was applied
  console.log('\n📋 STEP 1: Verify Migration Applied\n');

  try {
    const { data: functionExists, error: fnError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          p.proname as function_name,
          pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'mark_simulation_counted'
          AND n.nspname = 'public';
      `,
    });

    if (fnError) {
      console.error('❌ Error checking function:', fnError);
    } else if (functionExists && functionExists.length > 0) {
      const def = functionExists[0].definition;
      const hasDirectUpdate = def.includes('UPDATE user_simulation_quota');
      const hasOldUpdate = def.includes('UPDATE users');

      console.log('✅ mark_simulation_counted function exists');
      console.log(`   Updates user_simulation_quota directly: ${hasDirectUpdate ? '✅ YES' : '❌ NO'}`);
      console.log(`   Updates users table (old bug): ${hasOldUpdate ? '❌ YES (PROBLEM!)' : '✅ NO'}`);

      if (!hasDirectUpdate) {
        console.log('\n🚨 CRITICAL: Migration was NOT applied! Function still has old buggy code!');
      }
    } else {
      console.log('❌ mark_simulation_counted function does NOT exist!');
    }
  } catch (error) {
    console.error('Error checking migration:', error.message);
  }

  // STEP 2: Find the session from screenshot
  console.log('\n\n📋 STEP 2: Find Session from Screenshot\n');

  const { data: sessions, error: sessError } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('started_at', { ascending: false })
    .limit(5);

  if (sessError) {
    console.error('❌ Error fetching sessions:', sessError);
  } else {
    console.log(`Found ${sessions.length} recent sessions:\n`);

    let targetSession = null;
    sessions.forEach((s, idx) => {
      const tokenShort = s.session_token.substring(0, 7);
      const isTarget = s.session_token.includes(SESSION_TOKEN_PREFIX);

      if (isTarget) targetSession = s;

      console.log(`${isTarget ? '🎯' : '  '} ${idx + 1}. ${tokenShort}... ${isTarget ? '(FROM SCREENSHOT)' : ''}`);
      console.log(`     Started: ${new Date(s.started_at).toLocaleTimeString()}`);
      console.log(`     Duration: ${s.duration_seconds || 'NULL'}s`);
      console.log(`     Counted: ${s.counted_toward_usage ? 'YES ✅' : 'NO ❌'}`);
      console.log(`     Ended: ${s.ended_at ? 'YES' : 'NO (still active)'}`);
      console.log('');
    });

    if (targetSession) {
      console.log('🎯 Screenshot session details:');
      console.log(`   Token: ${targetSession.session_token}`);
      console.log(`   Counted: ${targetSession.counted_toward_usage}`);
      console.log(`   Duration: ${targetSession.duration_seconds}s`);

      const elapsed = Math.floor((Date.now() - new Date(targetSession.started_at).getTime()) / 1000);
      console.log(`   Elapsed since start: ${elapsed}s (${Math.floor(elapsed / 60)} minutes)`);
    } else {
      console.log('⚠️ Could not find exact session from screenshot');
    }
  }

  // STEP 3: Check current quota
  console.log('\n\n📋 STEP 3: Current Quota State\n');

  const { data: quotaData, error: quotaError } = await supabase
    .from('user_simulation_quota')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .single();

  if (quotaError) {
    console.error('❌ Error fetching quota:', quotaError);
  } else {
    console.log(`Simulations used: ${quotaData.simulations_used}/${quotaData.total_simulations}`);
    console.log(`Last reset: ${new Date(quotaData.last_reset_date).toLocaleDateString()}`);
  }

  // STEP 4: Count actually counted sessions
  console.log('\n\n📋 STEP 4: Session Count Verification\n');

  const { count: countedCount, error: countError } = await supabase
    .from('simulation_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', TEST_USER_ID)
    .eq('counted_toward_usage', true);

  if (!countError) {
    console.log(`Sessions marked as counted: ${countedCount}`);
    console.log(`Quota shows: ${quotaData?.simulations_used || 'N/A'}`);

    if (countedCount !== quotaData?.simulations_used) {
      console.log(`\n❌ MISMATCH! Difference: ${Math.abs(countedCount - quotaData.simulations_used)} simulations`);
    } else {
      console.log(`\n✅ Counts match`);
    }
  }

  // STEP 5: Test the RPC directly
  console.log('\n\n📋 STEP 5: Test RPC Function Directly\n');

  if (sessions && sessions.length > 0) {
    // Find an old session that should be countable
    const testSession = sessions.find((s) => !s.counted_toward_usage && s.duration_seconds > 295) || sessions[0];

    console.log(`Testing with session: ${testSession.session_token.substring(0, 8)}...`);

    const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_simulation_counted', {
      p_session_token: testSession.session_token,
      p_user_id: TEST_USER_ID,
    });

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
    } else {
      console.log('RPC Response:', JSON.stringify(rpcResult, null, 2));

      // Check quota after RPC
      const { data: quotaAfter } = await supabase
        .from('user_simulation_quota')
        .select('simulations_used')
        .eq('user_id', TEST_USER_ID)
        .single();

      console.log(`\nQuota after RPC: ${quotaAfter?.simulations_used || 'ERROR'}`);

      if (rpcResult.success && !rpcResult.already_counted) {
        if (quotaAfter.simulations_used > quotaData.simulations_used) {
          console.log('✅ SUCCESS! Quota incremented!');
        } else {
          console.log('❌ FAILURE! RPC succeeded but quota did NOT increment!');
        }
      }
    }
  }

  console.log(`\n\n${  '='.repeat(80)}`);
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(80));
}

diagnose()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
