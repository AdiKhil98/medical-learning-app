/**
 * Apply Session Recovery Timing Fix
 *
 * Updates get_active_simulation() to use timer_started_at instead of started_at
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('🔧 Applying Session Recovery Timing Fix\n');
  console.log('='.repeat(80));

  try {
    // Read migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20251219000001_fix_session_recovery_timing.sql'
    );

    console.log('\n📋 Reading migration file...');
    console.log(`   Path: ${migrationPath}\n`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments and COMMIT statement for RPC execution
    const cleanSQL = migrationSQL
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim() !== 'COMMIT;')
      .join('\n')
      .trim();

    console.log('📝 Migration SQL:');
    console.log('─'.repeat(80));
    console.log(`${cleanSQL.substring(0, 500)  }...\n`);

    // Execute migration using execute_sql function
    console.log('🚀 Executing migration...\n');

    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: cleanSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.error('\nPlease apply this migration manually in Supabase dashboard:');
      console.error('Dashboard → SQL Editor → New Query → Paste the migration SQL\n');
      process.exit(1);
    }

    console.log('✅ Migration executed successfully\n');

    // Verify the function was updated
    console.log('🔍 Verifying function update...\n');

    const { data: funcData, error: funcError } = await supabase.rpc('get_active_simulation', {
      p_user_id: '66da816e-844c-4e8a-85af-e7e286124133', // Test user
    });

    if (funcError && funcError.code !== 'PGRST116') {
      console.error('❌ Error verifying function:', funcError);
    } else {
      console.log('✅ Function is callable and working');
      if (funcData) {
        console.log('   Result:', JSON.stringify(funcData, null, 2));
      }
    }

    console.log('\n📊 SUMMARY:\n');
    console.log('='.repeat(80));
    console.log('✅ Migration applied successfully');
    console.log('');
    console.log('Changes:');
    console.log('  - get_active_simulation() now uses timer_started_at for elapsed time');
    console.log('  - Falls back to started_at if timer_started_at is null');
    console.log('  - Session recovery now uses accurate timer state');
    console.log('');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
