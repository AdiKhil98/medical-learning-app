const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('🔧 Applying Cleanup RPC Bug Fix\n');
  console.log('='.repeat(80));

  try {
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20251220000001_fix_cleanup_rpc_bug.sql'
    );

    console.log('\n📋 Reading migration file...');
    console.log(`   Path: ${migrationPath}\n`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const cleanSQL = migrationSQL
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim() !== 'COMMIT;')
      .join('\n')
      .trim();

    console.log('📝 Migration SQL Preview:');
    console.log('─'.repeat(80));
    const preview = cleanSQL.substring(0, 500);
    console.log(`${preview}...\n`);

    console.log('🚀 Executing migration...\n');

    // For CREATE OR REPLACE FUNCTION, we can execute directly
    // No need for execute_sql RPC
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: cleanSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.error('\nIf execute_sql RPC is not available, apply this migration manually in Supabase dashboard:');
      console.error('Dashboard → SQL Editor → New Query → Paste the migration SQL\n');

      // Try direct execution as fallback
      console.log('\n⚠️ Trying direct execution...');
      const queries = cleanSQL
        .split(';')
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      for (const query of queries) {
        if (query.toLowerCase().startsWith('grant')) {
          console.log('Skipping GRANT (requires elevated permissions)');
          continue;
        }

        const { error: queryError } = await supabase.rpc('execute_sql', {
          sql_query: query,
        });

        if (queryError) {
          console.error('❌ Query failed:', queryError);
        }
      }

      process.exit(1);
    }

    console.log('✅ Migration executed successfully\n');

    // Verify the fix worked
    console.log('🔍 Verifying fix...\n');
    const TEST_USER_ID = '66da816e-844c-4e8a-85af-e7e286124133';

    const { data: testData, error: testError } = await supabase.rpc('cleanup_orphaned_sessions_for_user', {
      p_user_id: TEST_USER_ID,
    });

    if (testError) {
      console.error('❌ Verification failed:', testError);
      process.exit(1);
    }

    console.log('✅ Verification passed!');
    console.log('   Response:', JSON.stringify(testData, null, 2));

    console.log('\n\n📊 SUMMARY:\n');
    console.log('='.repeat(80));
    console.log('✅ Migration applied successfully');
    console.log('');
    console.log('Changes:');
    console.log('  - Fixed array_agg/unnest bug causing UUID parsing errors');
    console.log('  - Simplified loop to iterate directly over query results');
    console.log('  - Removed manual duration_seconds setting (let trigger handle it)');
    console.log('  - Removed status field update (not needed for counting)');
    console.log('');
    console.log('Benefits:');
    console.log('  - Cleanup RPC will no longer fail with "invalid input syntax for type uuid"');
    console.log('  - Orphaned sessions will be properly closed and counted');
    console.log('  - No more stale sessions causing constraint errors');
    console.log('');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
