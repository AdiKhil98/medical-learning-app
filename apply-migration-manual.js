/**
 * Manual Migration Application Guide
 *
 * Since the Supabase JS client cannot execute arbitrary SQL,
 * this script provides instructions and verification for manual migration.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Subscription Tier Fix Migration - Manual Application     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Read migration file
const migrationPath = path.join(
  __dirname,
  'supabase',
  'migrations',
  '20251210000000_fix_subscription_tiers_to_correct_limits.sql'
);

if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file not found!');
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Migration file loaded successfully\n');
console.log(`📍 File location: ${migrationPath}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('MANUAL MIGRATION STEPS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Option 1: Supabase Dashboard SQL Editor (Recommended)');
console.log('─────────────────────────────────────────────────────────────\n');
console.log('1. Open your Supabase project dashboard:');
console.log(`   ${process.env.SUPABASE_URL.replace('//', '//app.')}/project/_/sql\n`);
console.log('2. Click "New Query" in the SQL Editor');
console.log('3. Copy the SQL from:');
console.log(`   ${migrationPath}\n`);
console.log('4. Paste into the SQL Editor');
console.log('5. Click "Run" to execute the migration\n');

console.log('Option 2: Using psql (Command Line)');
console.log('─────────────────────────────────────────────────────────────\n');
console.log('If you have psql installed, run:\n');
console.log(`psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" < "${migrationPath}"\n`);

console.log('Option 3: Using Supabase CLI (After Login)');
console.log('─────────────────────────────────────────────────────────────\n');
console.log('1. Login to Supabase CLI:');
console.log('   npx supabase login\n');
console.log('2. Link your project:');
console.log('   npx supabase link --project-ref pavjavrijaihnwbydfrk\n');
console.log('3. Push migrations:');
console.log('   npx supabase db push\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('WHAT THIS MIGRATION DOES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ Updates get_tier_simulation_limit() function:');
console.log('   - free: 3 simulations/month');
console.log('   - basic: 30 simulations/month');
console.log('   - premium: 60 simulations/month\n');

console.log('✅ Normalizes tier names in existing data:');
console.log('   - "basis" → "basic"');
console.log('   - "profi" → "premium"');
console.log('   - "unlimited" → "premium"\n');

console.log('✅ Fixes total_simulations in user quotas');
console.log('✅ Adds check constraint for valid tiers');
console.log('✅ Creates normalize_tier_name() helper function');
console.log('✅ Maintains backward compatibility\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('AFTER APPLYING THE MIGRATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Run this command to verify the migration was successful:\n');
console.log('   node check-supabase-status.js\n');

console.log('Expected results after migration:');
console.log('   - free tier: 3 simulations ✅');
console.log('   - basic tier: 30 simulations ✅');
console.log('   - premium tier: 60 simulations ✅');
console.log('   - No unlimited tier ✅\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 Migration SQL Preview (First 30 lines):\n');
console.log('─────────────────────────────────────────────────────────────');

const lines = migrationSQL.split('\n').slice(0, 30);
lines.forEach((line, idx) => {
  console.log(`${String(idx + 1).padStart(3, ' ')} | ${line}`);
});

console.log('─────────────────────────────────────────────────────────────');
console.log(`... (${migrationSQL.split('\n').length - 30} more lines)\n`);

console.log('🔗 Full SQL available at:');
console.log(`   ${migrationPath}\n`);
