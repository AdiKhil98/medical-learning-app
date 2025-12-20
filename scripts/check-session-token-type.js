const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumnType() {
  console.log('🔍 Checking session_token column type...\n');

  // Get a sample session to see the data type
  const { data, error } = await supabase.from('simulation_usage_logs').select('session_token').limit(1).single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample session_token:', data.session_token);
  console.log('JavaScript type:', typeof data.session_token);
  console.log(
    'Is valid UUID format:',
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.session_token)
  );

  // Try to check the actual database column type
  console.log('\n📋 Checking database schema...\n');

  const { data: schemaData, error: schemaError } = await supabase.rpc('execute_sql', {
    sql_query: `
        SELECT
          column_name,
          data_type,
          udt_name
        FROM information_schema.columns
        WHERE table_name = 'simulation_usage_logs'
          AND column_name = 'session_token';
      `,
  });

  if (schemaError) {
    console.log('⚠️ Could not query schema (execute_sql RPC not available)');
    console.log('This is expected - we need to check another way');
  } else {
    console.log('Column info:', schemaData);
  }
}

checkColumnType().then(() => process.exit(0));
