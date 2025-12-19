/**
 * Fix Data Inconsistencies
 *
 * Fixes:
 * 1. Quota counter mismatches
 * 2. Orphaned sessions (ended_at = NULL)
 * 3. Long uncounted sessions (>= 5 min but not counted)
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

async function fixDataInconsistencies() {
  console.log('🔧 Fixing Data Inconsistencies\n');
  console.log('='.repeat(80));

  try {
    const userId = '66da816e-844c-4e8a-85af-e7e286124133'; // zaid199660@gmail.com
    let fixesApplied = 0;

    console.log('\n📋 Analyzing issues for user:', `${userId.substring(0, 16)  }...\n`);

    // FIX 1: Close orphaned sessions
    console.log('🔧 FIX 1: Closing orphaned sessions...\n');

    const { data: orphanedSessions, error: orphanedError } = await supabase
      .from('simulation_usage_logs')
      .select('session_token, started_at, simulation_type')
      .eq('user_id', userId)
      .is('ended_at', null);

    if (orphanedError) {
      console.error('❌ Error finding orphaned sessions:', orphanedError);
    } else if (orphanedSessions && orphanedSessions.length > 0) {
      console.log(`Found ${orphanedSessions.length} orphaned session(s):`);

      for (const session of orphanedSessions) {
        console.log(`  - ${session.session_token.substring(0, 16)}... (${session.simulation_type})`);
        console.log(`    Started: ${session.started_at}`);

        // Calculate actual duration
        const startedAt = new Date(session.started_at);
        const now = new Date();
        const durationSeconds = Math.floor((now - startedAt) / 1000);

        // Cap at 1500 seconds (25 minutes max allowed by database constraint)
        const cappedDuration = Math.min(durationSeconds, 1500);
        const shouldCount = cappedDuration >= 300;

        // Set ended_at to match capped duration (to satisfy database constraint)
        const endedAt = new Date(startedAt.getTime() + cappedDuration * 1000);

        console.log(`    Actual duration: ${durationSeconds}s (capped to ${cappedDuration}s)`);
        console.log(`    Should count: ${shouldCount ? 'YES' : 'NO'}`);
        console.log(`    Setting ended_at to: ${endedAt.toISOString()}`);

        // Close the session with actual duration
        const { error: updateError } = await supabase
          .from('simulation_usage_logs')
          .update({
            ended_at: endedAt.toISOString(),
            duration_seconds: cappedDuration,
            counted_toward_usage: shouldCount,
          })
          .eq('session_token', session.session_token);

        if (updateError) {
          console.error(`    ❌ Error closing session:`, updateError);
        } else {
          console.log(`    ✅ Closed successfully`);

          // If session should count, increment quota
          if (shouldCount) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, subscription_tier, simulations_used_this_month, free_simulations_used')
              .eq('id', userId)
              .single();

            if (userError) {
              console.error(`    ❌ Error fetching user:`, userError);
            } else {
              const isFree = !userData.subscription_tier || userData.subscription_tier === '';
              const updateField = isFree ? 'free_simulations_used' : 'simulations_used_this_month';
              const currentValue = isFree ? userData.free_simulations_used : userData.simulations_used_this_month;

              const { error: quotaError } = await supabase
                .from('users')
                .update({
                  [updateField]: currentValue + 1,
                })
                .eq('id', userId);

              if (quotaError) {
                console.error(`    ❌ Error incrementing quota:`, quotaError);
              } else {
                console.log(`    ✅ Incremented quota counter (${currentValue} → ${currentValue + 1})`);
              }
            }
          }

          fixesApplied++;
        }
      }
    } else {
      console.log('✅ No orphaned sessions found');
    }

    // FIX 2: Count long uncounted sessions
    console.log('\n🔧 FIX 2: Counting long uncounted sessions...\n');

    const { data: uncountedLongSessions, error: uncountedError } = await supabase
      .from('simulation_usage_logs')
      .select('session_token, started_at, ended_at, duration_seconds, simulation_type')
      .eq('user_id', userId)
      .eq('counted_toward_usage', false)
      .not('ended_at', 'is', null)
      .gte('duration_seconds', 300);

    if (uncountedError) {
      console.error('❌ Error finding uncounted sessions:', uncountedError);
    } else if (uncountedLongSessions && uncountedLongSessions.length > 0) {
      console.log(`Found ${uncountedLongSessions.length} long uncounted session(s):`);

      for (const session of uncountedLongSessions) {
        console.log(`  - ${session.session_token.substring(0, 16)}... (${session.simulation_type})`);
        console.log(
          `    Duration: ${session.duration_seconds}s (${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s)`
        );
        console.log(`    Started: ${session.started_at}`);
        console.log(`    Ended: ${session.ended_at}`);

        // Mark as counted
        const { error: markError } = await supabase
          .from('simulation_usage_logs')
          .update({
            counted_toward_usage: true,
          })
          .eq('session_token', session.session_token);

        if (markError) {
          console.error(`    ❌ Error marking as counted:`, markError);
        } else {
          console.log(`    ✅ Marked as counted`);

          // Increment quota counter (this will trigger the sync to user_simulation_quota)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, subscription_tier, simulations_used_this_month, free_simulations_used')
            .eq('id', userId)
            .single();

          if (userError) {
            console.error(`    ❌ Error fetching user:`, userError);
          } else {
            const isFree = !userData.subscription_tier || userData.subscription_tier === '';
            const updateField = isFree ? 'free_simulations_used' : 'simulations_used_this_month';
            const currentValue = isFree ? userData.free_simulations_used : userData.simulations_used_this_month;

            const { error: quotaError } = await supabase
              .from('users')
              .update({
                [updateField]: currentValue + 1,
              })
              .eq('id', userId);

            if (quotaError) {
              console.error(`    ❌ Error incrementing quota:`, quotaError);
            } else {
              console.log(`    ✅ Incremented quota counter (${currentValue} → ${currentValue + 1})`);
              fixesApplied++;
            }
          }
        }
      }
    } else {
      console.log('✅ No uncounted long sessions found');
    }

    // FIX 3: Verify quota counter consistency
    console.log('\n🔧 FIX 3: Verifying quota counter consistency...\n');

    const {
      data: countedSessions,
      count: countedCount,
      error: countError,
    } = await supabase
      .from('simulation_usage_logs')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', userId)
      .eq('counted_toward_usage', true);

    if (countError) {
      console.error('❌ Error counting sessions:', countError);
    } else {
      const actualCount = countedCount || 0;
      console.log(`Actual counted sessions: ${actualCount}`);

      // Get quota counter
      const { data: quotaData, error: quotaError } = await supabase
        .from('user_simulation_quota')
        .select('simulations_used')
        .eq('user_id', userId)
        .single();

      if (quotaError && quotaError.code !== 'PGRST116') {
        console.error('❌ Error fetching quota:', quotaError);
      } else if (quotaData) {
        const quotaCount = quotaData.simulations_used;
        console.log(`Quota counter: ${quotaCount}`);

        if (quotaCount !== actualCount) {
          console.log(`⚠️  Mismatch detected: quota (${quotaCount}) vs actual (${actualCount})`);
          console.log(`   Difference: ${quotaCount - actualCount}`);

          // Sync quota to match actual count
          const { error: syncError } = await supabase
            .from('user_simulation_quota')
            .update({
              simulations_used: actualCount,
            })
            .eq('user_id', userId);

          if (syncError) {
            console.error('❌ Error syncing quota:', syncError);
          } else {
            console.log(`✅ Synced quota counter to match actual count (${quotaCount} → ${actualCount})`);
            fixesApplied++;
          }
        } else {
          console.log('✅ Quota counter matches actual count');
        }
      } else {
        console.log('⚠️  No quota record found');
      }
    }

    // SUMMARY
    console.log('\n📊 SUMMARY:\n');
    console.log('='.repeat(80));
    console.log(`Total fixes applied: ${fixesApplied}`);
    console.log('');
    console.log('Fixed issues:');
    console.log('  1. Orphaned sessions closed');
    console.log('  2. Long uncounted sessions marked as counted');
    console.log('  3. Quota counter synchronized with actual count');
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Data cleanup complete');
    console.log('='.repeat(80));

    // Run consistency check again to verify
    console.log('\n🔍 Running consistency check to verify fixes...\n');
    const { spawn } = require('child_process');
    const checkProcess = spawn('node', ['scripts/check-db-consistency.js'], {
      stdio: 'inherit',
      shell: true,
    });

    checkProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Verification complete');
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run cleanup
fixDataInconsistencies();
