/**
 * Comprehensive Simulation System Diagnostic
 *
 * Checks all functions, triggers, and data integrity related to simulation counting
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test user ID (replace with actual test user if needed)
const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

async function runDiagnostic() {
  console.log('🔍 SIMULATION SYSTEM DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log('Checking all functions, triggers, and data integrity...\n');

  const results = {
    functions: {},
    triggers: {},
    data: {},
    issues: [],
    warnings: [],
  };

  // ============================================
  // 1. CHECK RPC FUNCTIONS
  // ============================================
  console.log('📋 PART 1: RPC FUNCTIONS');
  console.log('-'.repeat(80));

  const rpcFunctions = [
    { name: 'can_start_simulation', params: { p_user_id: TEST_USER_ID } },
    { name: 'get_active_simulation', params: { p_user_id: TEST_USER_ID } },
    { name: 'cleanup_orphaned_sessions_for_user', params: { p_user_id: TEST_USER_ID } },
    { name: 'set_simulation_timer_start', params: { p_session_token: 'test-token', p_user_id: TEST_USER_ID } },
  ];

  for (const func of rpcFunctions) {
    try {
      console.log(`\n  Testing: ${func.name}()`);
      const { data, error } = await supabase.rpc(func.name, func.params);

      if (error) {
        if (error.code === 'PGRST202') {
          results.issues.push(`❌ Function ${func.name} does not exist in database`);
          console.log(`    ❌ NOT FOUND (schema cache issue or function doesn't exist)`);
        } else if (error.code === 'PGRST116') {
          results.warnings.push(`⚠️ Function ${func.name} exists but session not found (expected for test)`);
          console.log(`    ✅ EXISTS (returned expected error for test data)`);
        } else {
          results.warnings.push(`⚠️ Function ${func.name} error: ${error.message}`);
          console.log(`    ⚠️ ERROR: ${error.message}`);
        }
      } else {
        results.functions[func.name] = 'OK';
        console.log(`    ✅ WORKING`);
        console.log(`       Response: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (err) {
      results.issues.push(`❌ Function ${func.name} exception: ${err.message}`);
      console.log(`    ❌ EXCEPTION: ${err.message}`);
    }
  }

  // ============================================
  // 2. CHECK DATABASE TRIGGERS
  // ============================================
  console.log('\n\n📋 PART 2: DATABASE TRIGGERS');
  console.log('-'.repeat(80));

  try {
    const { data: triggers, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          trigger_name,
          event_manipulation,
          event_object_table,
          action_timing,
          action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'simulation_usage_logs'
        ORDER BY trigger_name;
      `,
    });

    if (error) {
      results.issues.push(`❌ Cannot query triggers: ${error.message}`);
      console.log(`  ❌ Cannot query triggers: ${error.message}`);
    } else if (triggers && triggers.length > 0) {
      console.log(`\n  Found ${triggers.length} triggers on simulation_usage_logs:\n`);
      triggers.forEach((trigger) => {
        console.log(`    • ${trigger.trigger_name}`);
        console.log(`      Timing: ${trigger.action_timing} ${trigger.event_manipulation}`);
        results.triggers[trigger.trigger_name] = 'EXISTS';
      });

      // Check for critical triggers
      const criticalTriggers = [
        'trg_calculate_duration_before_update',
        'trg_sync_quota_on_simulation_end',
        'trg_prevent_concurrent_simulations',
      ];

      criticalTriggers.forEach((triggerName) => {
        const exists = triggers.some((t) => t.trigger_name === triggerName);
        if (!exists) {
          results.warnings.push(`⚠️ Critical trigger ${triggerName} not found`);
          console.log(`\n  ⚠️ WARNING: Critical trigger ${triggerName} not found`);
        }
      });
    } else {
      results.warnings.push('⚠️ No triggers found on simulation_usage_logs table');
      console.log('  ⚠️ No triggers found on simulation_usage_logs table');
    }
  } catch (err) {
    results.issues.push(`❌ Trigger check exception: ${err.message}`);
    console.log(`  ❌ Exception: ${err.message}`);
  }

  // ============================================
  // 3. CHECK QUOTA SYSTEM INTEGRITY
  // ============================================
  console.log('\n\n📋 PART 3: QUOTA SYSTEM INTEGRITY');
  console.log('-'.repeat(80));

  try {
    const { data: quotaCheck, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN total_simulations IS NULL THEN 1 END) as users_with_null_total,
          COUNT(CASE WHEN simulations_used IS NULL THEN 1 END) as users_with_null_used,
          COUNT(CASE WHEN simulations_used > total_simulations AND total_simulations != -1 THEN 1 END) as users_exceeding_quota
        FROM user_simulation_quota;
      `,
    });

    if (error) {
      results.issues.push(`❌ Quota integrity check failed: ${error.message}`);
      console.log(`  ❌ Cannot check quota: ${error.message}`);
    } else if (quotaCheck && quotaCheck.length > 0) {
      const stats = quotaCheck[0];
      console.log(`\n  Total users with quota: ${stats.total_users}`);
      console.log(`  Users with NULL total_simulations: ${stats.users_with_null_total}`);
      console.log(`  Users with NULL simulations_used: ${stats.users_with_null_used}`);
      console.log(`  Users exceeding quota: ${stats.users_exceeding_quota}`);

      if (stats.users_with_null_total > 0) {
        results.warnings.push(`⚠️ ${stats.users_with_null_total} users have NULL total_simulations`);
      }
      if (stats.users_with_null_used > 0) {
        results.warnings.push(`⚠️ ${stats.users_with_null_used} users have NULL simulations_used`);
      }
      if (stats.users_exceeding_quota > 0) {
        results.issues.push(`❌ ${stats.users_exceeding_quota} users exceeding their quota!`);
      }

      results.data.quota_integrity = stats.users_exceeding_quota === 0 ? 'OK' : 'ISSUES FOUND';
    }
  } catch (err) {
    results.issues.push(`❌ Quota check exception: ${err.message}`);
    console.log(`  ❌ Exception: ${err.message}`);
  }

  // ============================================
  // 4. CHECK ORPHANED SESSIONS
  // ============================================
  console.log('\n\n📋 PART 4: ORPHANED SESSIONS');
  console.log('-'.repeat(80));

  try {
    const { data: orphanedSessions, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          COUNT(*) as total_orphaned,
          COUNT(CASE WHEN timer_started_at IS NULL THEN 1 END) as missing_timer_start,
          COUNT(CASE WHEN duration_seconds IS NULL THEN 1 END) as missing_duration,
          MAX(EXTRACT(EPOCH FROM (NOW() - started_at)))::integer as oldest_age_seconds
        FROM simulation_usage_logs
        WHERE ended_at IS NULL;
      `,
    });

    if (error) {
      results.issues.push(`❌ Orphaned sessions check failed: ${error.message}`);
      console.log(`  ❌ Cannot check orphaned sessions: ${error.message}`);
    } else if (orphanedSessions && orphanedSessions.length > 0) {
      const stats = orphanedSessions[0];
      console.log(`\n  Total orphaned sessions (ended_at IS NULL): ${stats.total_orphaned}`);
      console.log(`  Sessions missing timer_started_at: ${stats.missing_timer_start}`);
      console.log(`  Sessions missing duration_seconds: ${stats.missing_duration}`);
      if (stats.oldest_age_seconds) {
        const ageMinutes = Math.floor(stats.oldest_age_seconds / 60);
        console.log(`  Oldest orphaned session age: ${ageMinutes} minutes`);

        if (ageMinutes > 30) {
          results.warnings.push(`⚠️ Orphaned sessions older than 30 minutes exist (${ageMinutes} min)`);
        }
      }

      results.data.orphaned_sessions = stats.total_orphaned;
    }
  } catch (err) {
    results.issues.push(`❌ Orphaned sessions check exception: ${err.message}`);
    console.log(`  ❌ Exception: ${err.message}`);
  }

  // ============================================
  // 5. CHECK CONSTRAINT VIOLATIONS
  // ============================================
  console.log('\n\n📋 PART 5: CONSTRAINT VIOLATIONS');
  console.log('-'.repeat(80));

  try {
    const { data: constraints, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN ended_at IS NOT NULL AND duration_seconds IS NULL THEN 1 END) as ended_missing_duration,
          COUNT(CASE WHEN ended_at IS NOT NULL AND duration_seconds = 0 THEN 1 END) as ended_zero_duration,
          COUNT(CASE WHEN counted_toward_usage = true AND duration_seconds < 300 THEN 1 END) as counted_under_5min
        FROM simulation_usage_logs;
      `,
    });

    if (error) {
      results.issues.push(`❌ Constraint check failed: ${error.message}`);
      console.log(`  ❌ Cannot check constraints: ${error.message}`);
    } else if (constraints && constraints.length > 0) {
      const stats = constraints[0];
      console.log(`\n  Total simulation sessions: ${stats.total_sessions}`);
      console.log(`  Ended sessions missing duration: ${stats.ended_missing_duration}`);
      console.log(`  Ended sessions with zero duration: ${stats.ended_zero_duration}`);
      console.log(`  Counted sessions under 5 minutes: ${stats.counted_under_5min}`);

      if (stats.ended_missing_duration > 0) {
        results.issues.push(`❌ ${stats.ended_missing_duration} ended sessions have NULL duration!`);
      }
      if (stats.counted_under_5min > 0) {
        results.warnings.push(`⚠️ ${stats.counted_under_5min} sessions counted despite being under 5 minutes`);
      }

      results.data.constraint_violations =
        stats.ended_missing_duration === 0 && stats.counted_under_5min === 0 ? 'OK' : 'ISSUES FOUND';
    }
  } catch (err) {
    results.issues.push(`❌ Constraint check exception: ${err.message}`);
    console.log(`  ❌ Exception: ${err.message}`);
  }

  // ============================================
  // 6. CHECK SUBSCRIPTION SYNC
  // ============================================
  console.log('\n\n📋 PART 6: SUBSCRIPTION-QUOTA SYNC');
  console.log('-'.repeat(80));

  try {
    const { data: syncCheck, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          COUNT(*) as users_with_subscriptions,
          COUNT(CASE WHEN q.total_simulations IS NULL THEN 1 END) as missing_quota_entry,
          COUNT(CASE WHEN s.tier = 'basis' AND q.total_simulations != 20 THEN 1 END) as basis_mismatch,
          COUNT(CASE WHEN s.tier = 'profi' AND q.total_simulations != 100 THEN 1 END) as profi_mismatch,
          COUNT(CASE WHEN s.tier = 'unlimited' AND q.total_simulations != -1 THEN 1 END) as unlimited_mismatch
        FROM subscriptions s
        LEFT JOIN user_simulation_quota q ON s.user_id = q.user_id
        WHERE s.status = 'active';
      `,
    });

    if (error) {
      results.issues.push(`❌ Subscription sync check failed: ${error.message}`);
      console.log(`  ❌ Cannot check subscription sync: ${error.message}`);
    } else if (syncCheck && syncCheck.length > 0) {
      const stats = syncCheck[0];
      console.log(`\n  Active subscriptions: ${stats.users_with_subscriptions}`);
      console.log(`  Missing quota entries: ${stats.missing_quota_entry}`);
      console.log(`  Basis tier mismatches: ${stats.basis_mismatch}`);
      console.log(`  Profi tier mismatches: ${stats.profi_mismatch}`);
      console.log(`  Unlimited tier mismatches: ${stats.unlimited_mismatch}`);

      const totalMismatches = stats.basis_mismatch + stats.profi_mismatch + stats.unlimited_mismatch;
      if (totalMismatches > 0) {
        results.issues.push(`❌ ${totalMismatches} subscription-quota mismatches found!`);
      }
      if (stats.missing_quota_entry > 0) {
        results.issues.push(`❌ ${stats.missing_quota_entry} active subscriptions missing quota entries!`);
      }

      results.data.subscription_sync = totalMismatches === 0 && stats.missing_quota_entry === 0 ? 'OK' : 'ISSUES FOUND';
    }
  } catch (err) {
    results.issues.push(`❌ Subscription sync check exception: ${err.message}`);
    console.log(`  ❌ Exception: ${err.message}`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));

  console.log('\n✅ SYSTEMS CHECKED:');
  console.log(`  • RPC Functions: ${Object.keys(results.functions).length} tested`);
  console.log(`  • Database Triggers: ${Object.keys(results.triggers).length} found`);
  console.log(`  • Data Integrity: ${Object.keys(results.data).length} checks performed`);

  if (results.issues.length === 0 && results.warnings.length === 0) {
    console.log('\n🎉 NO ISSUES FOUND - System is healthy!');
  } else {
    if (results.issues.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES (${results.issues.length}):`);
      results.issues.forEach((issue) => console.log(`  ${issue}`));
    }

    if (results.warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS (${results.warnings.length}):`);
      results.warnings.forEach((warning) => console.log(`  ${warning}`));
    }
  }

  console.log(`\n${  '='.repeat(80)}`);
  console.log('Diagnostic complete.\n');

  return results;
}

// Run diagnostic
runDiagnostic()
  .then((results) => {
    const exitCode = results.issues.length > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
