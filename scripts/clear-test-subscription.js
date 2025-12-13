/**
 * Clear Test Subscription Script
 *
 * This script removes test subscriptions from the database to allow testing
 * the subscription checkout flow as a new user.
 *
 * Usage:
 *   node scripts/clear-test-subscription.js <user-email>
 *
 * Example:
 *   node scripts/clear-test-subscription.js test@example.com
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nMake sure you have a .env file with these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearTestSubscription(userEmail) {
  try {
    console.log(`🔍 Looking for user with email: ${userEmail}`);

    // Step 1: Find the user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .maybeSingle();

    if (userError) {
      console.error('❌ Error finding user:', userError.message);
      return;
    }

    if (!userData) {
      console.log('⚠️  No user found with that email');
      return;
    }

    console.log(`✅ Found user: ${userData.email} (ID: ${userData.id})`);

    // Step 2: Check for existing subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userData.id);

    if (subError) {
      console.error('❌ Error checking subscriptions:', subError.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️  No subscriptions found for this user');
      return;
    }

    console.log(`\n📋 Found ${subscriptions.length} subscription(s):`);
    subscriptions.forEach((sub, index) => {
      console.log(`\n  ${index + 1}. Status: ${sub.status}`);
      console.log(`     Plan: ${sub.plan_name || 'N/A'}`);
      console.log(`     LemonSqueezy ID: ${sub.lemonsqueezy_subscription_id || 'N/A'}`);
      console.log(`     Created: ${new Date(sub.created_at).toLocaleString()}`);
    });

    // Step 3: Delete subscriptions
    console.log('\n🗑️  Deleting subscriptions...');

    const { error: deleteError } = await supabase.from('user_subscriptions').delete().eq('user_id', userData.id);

    if (deleteError) {
      console.error('❌ Error deleting subscriptions:', deleteError.message);
      return;
    }

    console.log('✅ Successfully deleted all subscriptions for this user');
    console.log('\n💡 The user can now test the subscription checkout flow as a new subscriber');

    // Step 4: Reset simulation count to 3 (free tier default)
    console.log('\n🔄 Resetting simulation count to 3...');

    const { error: updateError } = await supabase
      .from('users')
      .update({
        simulations_remaining: 3,
        current_plan: 'free',
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error('⚠️  Error resetting simulation count:', updateError.message);
    } else {
      console.log('✅ Simulation count reset to 3 (free tier)');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Main execution
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide a user email as an argument');
  console.error('\nUsage:');
  console.error('  node scripts/clear-test-subscription.js <user-email>');
  console.error('\nExample:');
  console.error('  node scripts/clear-test-subscription.js test@example.com');
  process.exit(1);
}

clearTestSubscription(userEmail);
