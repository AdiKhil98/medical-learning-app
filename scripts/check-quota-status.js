/**
 * Diagnostic script to check quota and simulation tracking status
 * Run with: node scripts/check-quota-status.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuotaStatus() {
  try {
    console.log('🔍 Checking quota and simulation tracking status...\n');

    // Get current user (you'll need to be logged in)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      console.error('Error:', authError?.message);
      return;
    }

    console.log('✅ Authenticated as:', user.email);
    console.log('👤 User ID:', user.id);
    console.log('');

    // Check quota via can_start_simulation RPC (what useSubscription uses)
    console.log('📊 Checking quota via can_start_simulation RPC...');
    const { data: quotaData, error: quotaError } = await supabase.rpc('can_start_simulation', {
      p_user_id: user.id,
    });

    if (quotaError) {
      console.error('❌ Error checking quota:', quotaError.message);
    } else {
      console.log('✅ Quota Status:');
      console.log('  - Can start:', quotaData.can_start);
      console.log('  - Reason:', quotaData.reason);
      console.log('  - Used:', quotaData.simulations_used);
      console.log('  - Total:', quotaData.total_simulations);
      console.log('  - Remaining:', quotaData.simulations_remaining);
      console.log('  - Message:', quotaData.message);
    }
    console.log('');

    // Check simulation_usage_logs table
    console.log('📋 Checking simulation_usage_logs table...');
    const { data: logs, error: logsError } = await supabase
      .from('simulation_usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('❌ Error fetching logs:', logsError.message);
    } else {
      console.log(`✅ Found ${logs.length} simulation logs (showing last 10):`);
      logs.forEach((log, index) => {
        console.log(`\n  [${index + 1}] Session:`, `${log.session_token.substring(0, 16)  }...`);
        console.log('      Type:', log.simulation_type);
        console.log('      Started:', log.started_at);
        console.log('      Ended:', log.ended_at || 'STILL ACTIVE');
        console.log('      Duration:', log.duration_seconds || 'N/A', 'seconds');
        console.log('      Counted:', log.counted_toward_usage ? 'YES ✓' : 'NO ✗');
      });
    }
    console.log('');

    // Check user_simulation_quota table
    console.log('📊 Checking user_simulation_quota table...');
    const { data: quota, error: quotaTableError } = await supabase
      .from('user_simulation_quota')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (quotaTableError) {
      console.error('❌ Error fetching quota:', quotaTableError.message);
    } else if (!quota) {
      console.warn('⚠️ No quota record found for user');
    } else {
      console.log('✅ Quota Record:');
      console.log('  - Subscription tier:', quota.subscription_tier);
      console.log('  - Total simulations:', quota.total_simulations);
      console.log('  - Simulations used:', quota.simulations_used);
      console.log('  - Simulations remaining:', quota.total_simulations - quota.simulations_used);
      console.log('  - Period start:', quota.period_start);
      console.log('  - Period end:', quota.period_end);
      console.log('  - Last updated:', quota.updated_at);
    }
    console.log('');

    // Summary
    console.log('📝 SUMMARY:');
    console.log('  Database says used:', quotaData?.simulations_used || 0);
    console.log('  Quota table says:', quota?.simulations_used || 0);
    const countedLogs = logs?.filter((l) => l.counted_toward_usage && l.ended_at).length || 0;
    console.log('  Counted logs:', countedLogs);

    if (quotaData?.simulations_used !== quota?.simulations_used) {
      console.log('\n⚠️ WARNING: Mismatch between RPC response and quota table!');
    }

    if (countedLogs !== (quota?.simulations_used || 0)) {
      console.log('\n⚠️ WARNING: Mismatch between counted logs and quota used count!');
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkQuotaStatus();
