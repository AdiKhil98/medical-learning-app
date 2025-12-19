/**
 * Apply Session Recovery Timing Fix
 *
 * Fixes get_active_simulation to use timer_started_at for accurate elapsed time
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
  console.log('🔧 Applying Session Recovery Timing Fix\\n');
  console.log('='.repeat(80));

  try {
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20251219000001_fix_session_recovery_timing.sql'
    );

    console.log('\\n📋 Reading migration file...');
    console.log(`   Path: ${migrationPath}\\n`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const cleanSQL = migrationSQL
      .split('\\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim() !== 'COMMIT;')
      .join('\\n')
      .trim();

    console.log('📝 Migration SQL Preview:');
    console.log('─'.repeat(80));
    const preview = cleanSQL.substring(0, 500);
    console.log(`${preview}...\\n`);

    console.log('🚀 Executing migration...\\n');

    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: cleanSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.error('\\nPlease apply this migration manually in Supabase dashboard:');
      console.error('Dashboard → SQL Editor → New Query → Paste the migration SQL\\n');
      process.exit(1);
    }

    console.log('✅ Migration executed successfully\\n');

    console.log('\\n📊 SUMMARY:\\n');
    console.log('='.repeat(80));
    console.log('✅ Migration applied successfully');
    console.log('');
    console.log('Changes:');
    console.log('  - Fixed get_active_simulation() to use timer_started_at');
    console.log('  - Accurate elapsed time calculation for session recovery');
    console.log('  - Timer will now show correct remaining time');
    console.log('');
    console.log('Benefits:');
    console.log('  - No more inflated elapsed_seconds values');
    console.log('  - Session recovery uses correct timing');
    console.log('  - Timer displays properly (counts down, not up)');
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
