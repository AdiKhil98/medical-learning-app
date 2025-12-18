/**
 * Database Consistency Checker
 *
 * Checks for inconsistencies in simulation tracking:
 * - Simulations marked as counted vs quota counter
 * - Orphaned sessions (ended_at = NULL)
 * - Sessions that passed 5 minutes but not counted
 * - Duplicate counting
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

// Support both EXPO_PUBLIC and NEXT_PUBLIC prefixes
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Environment check:');
console.log('  SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('  SUPABASE_KEY:', SUPABASE_KEY ? '✅ Set' : '❌ Missing');
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkConsistency() {
  console.log('🔍 Checking database consistency...\n');

  try {
    // Get current user (you can pass userId as argument if needed)
    const {
      data: { users },
      error: usersError,
    } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    // Check each user
    for (const user of users) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`👤 USER: ${user.email} (${user.id})`);
      console.log('='.repeat(80));

      // 1. Check quota counter
      const { data: quotaData, error: quotaError } = await supabase
        .from('user_simulation_quota')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (quotaError && quotaError.code !== 'PGRST116') {
        console.error('❌ Error fetching quota:', quotaError);
        continue;
      }

      console.log('\n📊 QUOTA COUNTER:');
      if (quotaData) {
        console.log(`  Used: ${quotaData.simulations_used}`);
        console.log(`  Limit: ${quotaData.simulation_limit}`);
        console.log(`  Period Start: ${quotaData.period_start_date}`);
        console.log(`  Period End: ${quotaData.period_end_date}`);
      } else {
        console.log('  ⚠️  No quota record found');
      }

      // 2. Check simulation_usage_logs
      const { data: sessions, error: sessionsError } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (sessionsError) {
        console.error('❌ Error fetching sessions:', sessionsError);
        continue;
      }

      console.log(`\n📝 SIMULATION SESSIONS: ${sessions?.length || 0} total`);

      // Count sessions by status
      const orphaned = sessions?.filter((s) => !s.ended_at) || [];
      const counted = sessions?.filter((s) => s.counted_toward_usage) || [];
      const notCounted = sessions?.filter((s) => !s.counted_toward_usage && s.ended_at) || [];
      const shouldBeCounted =
        sessions?.filter((s) => {
          if (!s.duration_seconds) return false;
          return s.duration_seconds >= 300 && !s.counted_toward_usage;
        }) || [];

      console.log(`  ✅ Counted: ${counted.length}`);
      console.log(`  ❌ Not Counted: ${notCounted.length}`);
      console.log(`  ⚠️  Orphaned (no ended_at): ${orphaned.length}`);
      console.log(`  🚨 Should be counted but aren't: ${shouldBeCounted.length}`);

      // 3. Check for inconsistencies
      const inconsistencies = [];

      if (quotaData && counted.length !== quotaData.simulations_used) {
        inconsistencies.push({
          type: 'QUOTA_MISMATCH',
          message: `Quota counter (${quotaData.simulations_used}) doesn't match counted sessions (${counted.length})`,
          severity: 'HIGH',
        });
      }

      if (orphaned.length > 0) {
        inconsistencies.push({
          type: 'ORPHANED_SESSIONS',
          message: `${orphaned.length} orphaned session(s) without ended_at`,
          severity: 'MEDIUM',
          sessions: orphaned.map((s) => ({
            token: `${s.session_token.substring(0, 16)  }...`,
            started: s.started_at,
            type: s.simulation_type,
          })),
        });
      }

      if (shouldBeCounted.length > 0) {
        inconsistencies.push({
          type: 'UNCOUNTED_LONG_SESSIONS',
          message: `${shouldBeCounted.length} session(s) >= 5 minutes but not counted`,
          severity: 'HIGH',
          sessions: shouldBeCounted.map((s) => ({
            token: `${s.session_token.substring(0, 16)  }...`,
            duration: s.duration_seconds,
            started: s.started_at,
            ended: s.ended_at,
            type: s.simulation_type,
          })),
        });
      }

      // 4. Display inconsistencies
      if (inconsistencies.length > 0) {
        console.log('\n🚨 INCONSISTENCIES FOUND:');
        inconsistencies.forEach((inc, i) => {
          console.log(`\n  ${i + 1}. [${inc.severity}] ${inc.type}`);
          console.log(`     ${inc.message}`);
          if (inc.sessions) {
            console.log('     Sessions:');
            inc.sessions.forEach((s) => {
              console.log(`       - Token: ${s.token}`);
              console.log(`         Type: ${s.type}`);
              console.log(`         Started: ${s.started}`);
              if (s.duration !== undefined) {
                console.log(`         Duration: ${s.duration}s`);
              }
              if (s.ended) {
                console.log(`         Ended: ${s.ended}`);
              }
            });
          }
        });
      } else {
        console.log('\n✅ No inconsistencies found for this user');
      }

      // 5. Show recent sessions
      console.log('\n📋 RECENT SESSIONS (last 5):');
      const recentSessions = sessions?.slice(0, 5) || [];
      recentSessions.forEach((session, i) => {
        console.log(
          `\n  ${i + 1}. ${session.simulation_type.toUpperCase()} - ${session.session_token.substring(0, 16)}...`
        );
        console.log(`     Started: ${session.started_at}`);
        console.log(`     Ended: ${session.ended_at || 'STILL ACTIVE'}`);
        console.log(`     Duration: ${session.duration_seconds || 'N/A'}s`);
        console.log(`     Counted: ${session.counted_toward_usage ? 'YES ✅' : 'NO ❌'}`);
      });
    }

    console.log(`\n${  '='.repeat(80)}`);
    console.log('✅ Consistency check complete');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the check
checkConsistency()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
