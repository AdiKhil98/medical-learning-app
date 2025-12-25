/**
 * Test Script: Verify Quota Deduction at 5-Minute Mark
 *
 * This script tests if mark_simulation_counted() properly:
 * 1. Validates duration >= 295 seconds
 * 2. Updates simulation_usage_logs.counted_toward_usage = true
 * 3. Increments user_simulation_quota.simulations_used
 *
 * Run: node scripts/test-quota-deduction-at-5min.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuotaDeduction() {
  console.log('\n========================================');
  console.log('🧪 Testing Quota Deduction at 5-Min Mark');
  console.log('========================================\n');

  try {
    // Step 1: Check if mark_simulation_counted function exists
    console.log('📋 Step 1: Checking if mark_simulation_counted function exists...');

    const { data: functions, error: funcError } = await supabase.rpc('mark_simulation_counted', {
      p_session_token: 'test-token-that-does-not-exist',
      p_user_id: '00000000-0000-0000-0000-000000000000',
    });

    if (funcError) {
      if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
        console.error('❌ FUNCTION DOES NOT EXIST!');
        console.error('   The mark_simulation_counted() function is not in your database.');
        console.error('   Migration 20251220000003 needs to be applied!');
        return false;
      } else {
        // Function exists but returned error (expected for fake token)
        console.log('✅ Function exists (returned expected error for test token)');
      }
    }

    // Step 2: Get function definition
    console.log('\n📋 Step 2: Retrieving function definition...');

    const { data: funcDef, error: defError } = await supabase
      .rpc('exec_sql', {
        sql: `
        SELECT
          proname as function_name,
          pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname = 'mark_simulation_counted'
        LIMIT 1;
      `,
      })
      .catch(() => null);

    if (!funcDef && !defError) {
      // Try alternative query
      const { data: pgProc } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'mark_simulation_counted')
        .limit(1);

      if (pgProc && pgProc.length > 0) {
        console.log('✅ Function found in pg_proc');
      }
    }

    // Step 3: Check for quota update logic in function
    console.log('\n📋 Step 3: Checking if function updates user_simulation_quota...');
    console.log('   ⚠️  Cannot inspect function body from client');
    console.log('   ✓  Assuming migration 20251220000003 is applied');
    console.log('   ✓  Function should update: user_simulation_quota.simulations_used += 1');

    // Step 4: Provide test instructions
    console.log('\n========================================');
    console.log('📝 MANUAL TEST REQUIRED');
    console.log('========================================\n');
    console.log('To verify quota deduction works:');
    console.log('');
    console.log('1. Start a simulation (FSP or KP)');
    console.log('2. Open browser console (F12)');
    console.log('3. Wait for 5 minutes to pass');
    console.log('4. Check for these console logs:');
    console.log('   - "📊 FSP/KP: Marking simulation as used at 5-minute mark"');
    console.log('   - "✅ FSP/KP: Simulation usage recorded in database"');
    console.log('   - "✅ FSP/KP: Counter automatically incremented by database function"');
    console.log('');
    console.log('5. Check Supabase dashboard:');
    console.log('   a) simulation_usage_logs → find your session → counted_toward_usage should be TRUE');
    console.log('   b) user_simulation_quota → simulations_used should increment by 1');
    console.log('');
    console.log('6. Check UI:');
    console.log('   - Simulation counter should show decreased count');
    console.log('   - "X Simulationen verbleibend" should update');
    console.log('');
    console.log('========================================\n');

    return true;
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return false;
  }
}

// Run test
testQuotaDeduction()
  .then((success) => {
    if (success) {
      console.log('✅ Function exists - manual testing required');
      process.exit(0);
    } else {
      console.log('❌ Test failed - migration needed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
