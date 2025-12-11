/**
 * Check Supabase Database Status
 *
 * This script checks:
 * 1. Applied migrations
 * 2. Current tier limits configuration
 * 3. Existing user quota data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseStatus() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Supabase Database Status Check                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Connected to: ${process.env.SUPABASE_URL}\n`);

  // 1. Check applied migrations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. APPLIED MIGRATIONS (Last 20)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const { data: migrations, error: migrationsError } = await supabase
      .from('schema_migrations')
      .select('version, name')
      .order('version', { ascending: false })
      .limit(20);

    if (migrationsError) {
      console.log(`⚠️  Could not query schema_migrations table: ${migrationsError.message}`);
      console.log('   (This table might not exist or might be in a different schema)\n');
    } else if (migrations && migrations.length > 0) {
      console.log('Recent migrations:');
      migrations.forEach((m) => {
        console.log(`  ${m.version} - ${m.name || '(no name)'}`);
      });
      console.log('');

      // Check if our new migration is applied
      const ourMigration = migrations.find((m) => m.version === '20251210000000');
      if (ourMigration) {
        console.log('✅ Our tier fix migration (20251210000000) IS APPLIED\n');
      } else {
        console.log('⚠️  Our tier fix migration (20251210000000) NOT FOUND in applied migrations\n');
      }
    } else {
      console.log('No migrations found in schema_migrations table\n');
    }
  } catch (err) {
    console.log(`⚠️  Error checking migrations: ${err.message}\n`);
  }

  // 2. Check current tier limits using the database function
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2. CURRENT TIER LIMITS (Database Function)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tiers = ['free', 'basic', 'premium', 'basis', 'profi', 'unlimited'];

  console.log('Tier        | Limit | Status');
  console.log('----------- | ----- | ------');

  for (const tier of tiers) {
    try {
      const { data, error } = await supabase.rpc('get_tier_simulation_limit', {
        tier: tier,
      });

      if (error) {
        console.log(`${tier.padEnd(11)} | ERROR | ${error.message}`);
      } else {
        const limit = data;
        let status = '';

        // Check if it matches expected values
        if (tier === 'free' && limit === 3) status = '✅ Correct';
        else if (tier === 'free' && limit === 5) status = '❌ Wrong (should be 3)';
        else if (tier === 'basic' && limit === 30) status = '✅ Correct';
        else if (tier === 'basic' && limit === 20) status = '❌ Wrong (should be 30)';
        else if (tier === 'premium' && limit === 60) status = '✅ Correct';
        else if (tier === 'premium' && limit === 100) status = '❌ Wrong (should be 60)';
        else if (tier === 'basis' && limit === 30) status = '✅ Legacy compat';
        else if (tier === 'profi' && limit === 60) status = '✅ Legacy compat';
        else if (tier === 'unlimited' && limit === -1) status = '❌ Should not exist';
        else status = `⚠️  Unexpected (${limit})`;

        console.log(`${tier.padEnd(11)} | ${String(limit).padEnd(5)} | ${status}`);
      }
    } catch (err) {
      console.log(`${tier.padEnd(11)} | ERROR | ${err.message}`);
    }
  }

  console.log('');

  // 3. Check existing user quota data
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3. EXISTING USER QUOTA DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const { data: quotas, error: quotasError } = await supabase
      .from('user_simulation_quota')
      .select('subscription_tier, total_simulations, simulations_used, period_start, period_end');

    if (quotasError) {
      console.log(`❌ Error querying user_simulation_quota: ${quotasError.message}\n`);
    } else if (quotas && quotas.length > 0) {
      console.log(`Total quota records: ${quotas.length}\n`);

      // Group by tier
      const tierStats = {};
      quotas.forEach((q) => {
        const tier = q.subscription_tier || 'unknown';
        if (!tierStats[tier]) {
          tierStats[tier] = {
            count: 0,
            limits: [],
            used: [],
          };
        }
        tierStats[tier].count++;
        tierStats[tier].limits.push(q.total_simulations);
        tierStats[tier].used.push(q.simulations_used);
      });

      console.log('Tier        | Users | Min Limit | Max Limit | Avg Limit | Status');
      console.log('----------- | ----- | --------- | --------- | --------- | ------');

      Object.keys(tierStats).sort().forEach((tier) => {
        const stats = tierStats[tier];
        const minLimit = Math.min(...stats.limits);
        const maxLimit = Math.max(...stats.limits);
        const avgLimit = Math.round(stats.limits.reduce((a, b) => a + b, 0) / stats.limits.length);

        let status = '';
        if (tier === 'free' && avgLimit === 3) status = '✅ Correct';
        else if (tier === 'free' && avgLimit === 5) status = '❌ Wrong (should be 3)';
        else if (tier === 'basic' && avgLimit === 30) status = '✅ Correct';
        else if (tier === 'basic' && avgLimit === 20) status = '❌ Wrong (should be 30)';
        else if (tier === 'premium' && avgLimit === 60) status = '✅ Correct';
        else if (tier === 'premium' && avgLimit === 100) status = '❌ Wrong (should be 60)';
        else if (tier === 'basis') status = '⚠️  Legacy tier name';
        else if (tier === 'profi') status = '⚠️  Legacy tier name';
        else if (tier === 'unlimited') status = '❌ Should not exist';
        else status = '⚠️  Unknown tier';

        console.log(
          `${tier.padEnd(11)} | ${String(stats.count).padEnd(5)} | ${String(minLimit).padEnd(9)} | ${String(maxLimit).padEnd(9)} | ${String(avgLimit).padEnd(9)} | ${status}`
        );
      });

      console.log('');
    } else {
      console.log('No quota records found in user_simulation_quota table\n');
    }
  } catch (err) {
    console.log(`❌ Error checking quotas: ${err.message}\n`);
  }

  // 4. Summary and recommendations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4. SUMMARY & RECOMMENDATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Expected configuration:');
  console.log('  - Free tier: 3 simulations/month');
  console.log('  - Basic tier: 30 simulations/month');
  console.log('  - Premium tier: 60 simulations/month');
  console.log('  - No unlimited tier\n');

  console.log('Next steps:');
  console.log('  1. Review the output above');
  console.log('  2. If tier limits are wrong, run: supabase db push');
  console.log('  3. If user quotas need normalization, the migration will handle it');
  console.log('  4. Test webhook integration after migration\n');
}

checkDatabaseStatus()
  .then(() => {
    console.log('✅ Database status check complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
