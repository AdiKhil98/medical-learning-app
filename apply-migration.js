/**
 * Apply Migration Script
 *
 * This script executes the subscription tier fix migration directly
 * against the Supabase database using the service role key.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Applying Subscription Tier Fix Migration                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Connected to: ${process.env.SUPABASE_URL}\n`);

  // Read the migration file
  const migrationPath = path.join(
    __dirname,
    'supabase',
    'migrations',
    '20251210000000_fix_subscription_tiers_to_correct_limits.sql'
  );

  console.log(`Reading migration file: ${migrationPath}\n`);

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found!');
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded successfully\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Executing Migration...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Split the SQL into individual statements
  // Remove comments and split by semicolons
  const statements = migrationSQL
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && stmt !== 'COMMIT');

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip empty statements
    if (!statement || statement.trim().length === 0) {
      continue;
    }

    // Get first line for logging (truncate if too long)
    const firstLine = statement.split('\n')[0].substring(0, 80);
    console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement,
      });

      if (error) {
        // Try direct execution via postgres
        const { error: directError } = await supabase.from('_exec').select('*').limit(0);

        // Since we can't execute arbitrary SQL directly via JS client,
        // we'll use a different approach - call individual functions
        console.log(`⚠️  Cannot execute via RPC (${error.message}), trying alternative method...`);

        // For critical functions, we'll execute them individually
        if (statement.includes('CREATE OR REPLACE FUNCTION get_tier_simulation_limit')) {
          console.log('   Skipping function creation - will execute as raw SQL');
        }

        errorCount++;
      } else {
        console.log('   ✅ Success\n');
        successCount++;
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}\n`);
      errorCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Migration Execution Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⚠️  Errors: ${errorCount}`);
  console.log(`📊 Total: ${statements.length}\n`);

  if (errorCount > 0) {
    console.log('⚠️  Some statements failed. This is expected since the Supabase JS client');
    console.log('   cannot execute all SQL statements directly. We need to use the Supabase');
    console.log('   SQL Editor or psql to execute the full migration.\n');
    console.log('📝 Alternative approach:');
    console.log('   1. Open Supabase Dashboard > SQL Editor');
    console.log('   2. Copy the contents of:');
    console.log('      supabase/migrations/20251210000000_fix_subscription_tiers_to_correct_limits.sql');
    console.log('   3. Paste and execute in SQL Editor\n');
  } else {
    console.log('🎉 Migration applied successfully!\n');
  }

  return errorCount === 0;
}

applyMigration()
  .then((success) => {
    if (success) {
      console.log('✅ Done!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Manual intervention required\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
