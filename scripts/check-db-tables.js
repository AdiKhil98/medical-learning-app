const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTables() {
  console.log('Checking database tables...\n');

  // Check for simulation-related tables
  const tables = [
    'simulation_usage_logs',
    'user_simulation_quota',
    'subscriptions',
    'user_subscriptions',
    'subscription_tiers',
  ];

  for (const tableName of tables) {
    const { data, error, count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${tableName}: NOT FOUND or NO ACCESS`);
    } else {
      console.log(`✅ ${tableName}: EXISTS (${count} rows)`);
    }
  }
}

checkTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
