/**
 * Test script to verify registration limit RPC functions
 * Run with: node scripts/testRegistrationLimit.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRegistrationStatus() {
  console.log('🧪 Testing can_register_new_user() RPC function...\n');

  try {
    const { data, error } = await supabase
      .rpc('can_register_new_user')
      .single();

    if (error) {
      console.error('❌ RPC Error:', error);
      return;
    }

    console.log('✅ RPC call successful!\n');
    console.log('📊 Result:');
    console.log('   Allowed:', data.allowed);
    console.log('   Current count:', data.current_count);
    console.log('   Max users:', data.max_users);
    console.log('   Message:', data.message);
    console.log('   Spots remaining:', data.max_users - data.current_count);
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

async function testActiveUserCount() {
  console.log('\n🧪 Testing get_active_user_count() RPC function...\n');

  try {
    const { data, error } = await supabase
      .rpc('get_active_user_count');

    if (error) {
      console.error('❌ RPC Error:', error);
      return;
    }

    console.log('✅ RPC call successful!\n');
    console.log('📊 Active user count:', data);
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

async function testWaitlistInsert() {
  console.log('\n🧪 Testing waitlist table insert...\n');

  const testEmail = `test-${Date.now()}@example.com`;

  try {
    const { data, error } = await supabase
      .from('waitlist')
      .insert([{
        email: testEmail,
        name: 'Test User',
        reason: 'Testing waitlist functionality'
      }])
      .select();

    if (error) {
      console.error('❌ Insert Error:', error);
      return;
    }

    console.log('✅ Waitlist insert successful!');
    console.log('📧 Test email added:', testEmail);

    // Clean up test data
    await supabase
      .from('waitlist')
      .delete()
      .eq('email', testEmail);

    console.log('🧹 Test data cleaned up');
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

// Run all tests
(async () => {
  console.log('='.repeat(60));
  console.log('Registration Limit System Tests');
  console.log('='.repeat(60));

  await testRegistrationStatus();
  await testActiveUserCount();
  await testWaitlistInsert();

  console.log('\n' + '='.repeat(60));
  console.log('Tests completed');
  console.log('='.repeat(60));
})();
