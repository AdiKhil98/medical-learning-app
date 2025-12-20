const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;

async function applyMigration() {
  console.log('🔧 Applying Migration Directly via PostgreSQL\n');
  console.log('='.repeat(80));

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file!');
    console.error('You need to add: DATABASE_URL=your_postgres_connection_string');
    console.error('\nAlternative: Apply this migration manually through Supabase dashboard:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Go to SQL Editor');
    console.error('4. Paste the contents of:');
    console.error('   supabase/migrations/20251220000002_fix_mark_counted_update_quota_directly.sql');
    console.error('5. Click "Run"');
    process.exit(1);
  }

  try {
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20251220000002_fix_mark_counted_update_quota_directly.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove COMMIT; as it's implicit
    const cleanSQL = migrationSQL.replace(/COMMIT;?\s*$/i, '').trim();

    console.log('📄 Executing migration SQL...\n');

    await client.query(cleanSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify the function was created
    const checkResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'mark_simulation_counted'
        AND n.nspname = 'public';
    `);

    if (checkResult.rows[0].count > 0) {
      console.log('✅ Verified: mark_simulation_counted function exists\n');
    } else {
      console.log('❌ Warning: Function was not found after migration\n');
    }

    await client.end();

    console.log(`\n${  '='.repeat(80)}`);
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\nNext step: Test the fix by starting a new simulation');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

applyMigration();
