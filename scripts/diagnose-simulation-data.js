/**
 * Simulation System Data Diagnostic
 * Uses Supabase client API to check data integrity
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runDataDiagnostic() {
  console.log('🔍 SIMULATION DATA DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log('');

  const issues = [];
  const warnings = [];

  // ============================================
  // 1. CHECK ORPHANED SESSIONS
  // ============================================
  console.log('📋 PART 1: ORPHANED SESSIONS CHECK');
  console.log('-'.repeat(80));

  const { data: orphaned, error: orphanedError } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .is('ended_at', null);

  if (orphanedError) {
    console.log(`❌ Error querying orphaned sessions: ${orphanedError.message}`);
    issues.push('Cannot query orphaned sessions');
  } else {
    console.log(`Found ${orphaned.length} orphaned sessions (ended_at IS NULL)\n`);

    if (orphaned.length > 0) {
      let oldSessions = 0;
      let missingTimerStart = 0;

      orphaned.forEach((session) => {
        const age = (Date.now() - new Date(session.started_at).getTime()) / 1000 / 60; // minutes
        if (age > 30) oldSessions++;
        if (!session.timer_started_at) missingTimerStart++;

        if (age > 60) {
          warnings.push(
            `Old orphaned session: ${session.session_token.substring(0, 8)}... (${Math.floor(age)} min old)`
          );
        }
      });

      console.log(`  Sessions older than 30 minutes: ${oldSessions}`);
      console.log(`  Sessions missing timer_started_at: ${missingTimerStart}`);

      if (oldSessions > 0) {
        warnings.push(`${oldSessions} orphaned sessions older than 30 minutes`);
      }
    } else {
      console.log(`  ✅ No orphaned sessions - system is clean!`);
    }
  }

  // ============================================
  // 2. CHECK ENDED SESSIONS WITHOUT DURATION
  // ============================================
  console.log('\n\n📋 PART 2: ENDED SESSIONS DATA INTEGRITY');
  console.log('-'.repeat(80));

  const { data: endedSessions, error: endedError } = await supabase
    .from('simulation_usage_logs')
    .select('*')
    .not('ended_at', 'is', null);

  if (endedError) {
    console.log(`❌ Error querying ended sessions: ${endedError.message}`);
    issues.push('Cannot query ended sessions');
  } else {
    console.log(`Total ended sessions: ${endedSessions.length}\n`);

    let missingDuration = 0;
    let zeroDuration = 0;
    let countedUnder5Min = 0;

    endedSessions.forEach((session) => {
      if (session.duration_seconds === null) {
        missingDuration++;
        issues.push(`Session ${session.session_token.substring(0, 8)}... ended but duration_seconds is NULL`);
      }
      if (session.duration_seconds === 0) zeroDuration++;
      if (session.counted_toward_usage && session.duration_seconds < 300) {
        countedUnder5Min++;
        warnings.push(
          `Session ${session.session_token.substring(0, 8)}... counted but duration < 5 min (${session.duration_seconds}s)`
        );
      }
    });

    console.log(`  Sessions with NULL duration: ${missingDuration}`);
    console.log(`  Sessions with 0 duration: ${zeroDuration}`);
    console.log(`  Counted sessions < 5 minutes: ${countedUnder5Min}`);

    if (missingDuration === 0 && countedUnder5Min === 0) {
      console.log(`\n  ✅ All ended sessions have valid data!`);
    }
  }

  // ============================================
  // 3. CHECK QUOTA INTEGRITY
  // ============================================
  console.log('\n\n📋 PART 3: QUOTA SYSTEM INTEGRITY');
  console.log('-'.repeat(80));

  const { data: quotas, error: quotaError } = await supabase.from('user_simulation_quota').select('*');

  if (quotaError) {
    console.log(`❌ Error querying quota: ${quotaError.message}`);
    issues.push('Cannot query quota table');
  } else {
    console.log(`Total users with quota: ${quotas.length}\n`);

    let nullTotal = 0;
    let nullUsed = 0;
    let exceeding = 0;

    quotas.forEach((quota) => {
      if (quota.total_simulations === null) {
        nullTotal++;
        warnings.push(`User ${quota.user_id.substring(0, 8)}... has NULL total_simulations`);
      }
      if (quota.simulations_used === null) {
        nullUsed++;
        warnings.push(`User ${quota.user_id.substring(0, 8)}... has NULL simulations_used`);
      }
      if (quota.total_simulations !== -1 && quota.simulations_used > quota.total_simulations) {
        exceeding++;
        issues.push(
          `User ${quota.user_id.substring(0, 8)}... exceeding quota: ${quota.simulations_used}/${quota.total_simulations}`
        );
      }

      console.log(
        `  User ${quota.user_id.substring(0, 8)}...: ${quota.simulations_used}/${quota.total_simulations === -1 ? '∞' : quota.total_simulations}`
      );
    });

    console.log(`\n  Users with NULL total: ${nullTotal}`);
    console.log(`  Users with NULL used: ${nullUsed}`);
    console.log(`  Users exceeding quota: ${exceeding}`);

    if (exceeding === 0 && nullTotal === 0 && nullUsed === 0) {
      console.log(`\n  ✅ All quota data is valid!`);
    }
  }

  // ============================================
  // 4. CHECK SUBSCRIPTION SYNC
  // ============================================
  console.log('\n\n📋 PART 4: SUBSCRIPTION-QUOTA SYNC');
  console.log('-'.repeat(80));

  const { data: userSubs, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('*, user_simulation_quota(*)');

  if (subsError) {
    console.log(`❌ Error querying subscriptions: ${subsError.message}`);
    issues.push('Cannot query subscriptions');
  } else {
    console.log(`Active user subscriptions: ${userSubs.length}\n`);

    userSubs.forEach((sub) => {
      const quota = sub.user_simulation_quota;
      console.log(`  Subscription ${sub.id}:`);
      console.log(`    User: ${sub.user_id.substring(0, 8)}...`);
      console.log(`    Tier: ${sub.tier || 'N/A'}`);

      if (quota && quota.length > 0) {
        const q = quota[0];
        console.log(`    Quota: ${q.simulations_used}/${q.total_simulations === -1 ? '∞' : q.total_simulations}`);

        // Check tier-quota matching
        const expectedQuota = {
          basis: 20,
          profi: 100,
          unlimited: -1,
          free: 3,
        };

        if (sub.tier && expectedQuota[sub.tier] !== undefined && q.total_simulations !== expectedQuota[sub.tier]) {
          warnings.push(
            `Tier-quota mismatch for user ${sub.user_id.substring(0, 8)}...: tier=${sub.tier}, quota=${q.total_simulations}, expected=${expectedQuota[sub.tier]}`
          );
          console.log(`    ⚠️ MISMATCH: Expected ${expectedQuota[sub.tier]}, got ${q.total_simulations}`);
        } else {
          console.log(`    ✅ Quota matches tier`);
        }
      } else {
        console.log(`    ❌ NO QUOTA ENTRY!`);
        issues.push(`User ${sub.user_id.substring(0, 8)}... has subscription but no quota entry`);
      }
    });
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));

  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n🎉 NO ISSUES FOUND - All simulation data is healthy!\n');
  } else {
    if (issues.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES (${issues.length}):`);
      issues.forEach((issue) => console.log(`  • ${issue}`));
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS (${warnings.length}):`);
      warnings.slice(0, 10).forEach((warning) => console.log(`  • ${warning}`));
      if (warnings.length > 10) {
        console.log(`  ... and ${warnings.length - 10} more warnings`);
      }
    }
  }

  console.log(`\n${  '='.repeat(80)}`);
  console.log('Diagnostic complete.\n');

  return { issues, warnings };
}

// Run diagnostic
runDataDiagnostic()
  .then(({ issues }) => {
    process.exit(issues.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
