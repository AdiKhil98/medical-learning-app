// ============================================
// SYNC EXISTING USERS WITH LEMON SQUEEZY
// ============================================
// This script fetches billing data from Lemon Squeezy API
// and updates user quota periods to match their actual billing cycles
//
// USAGE:
//   node scripts/sync-billing-periods.js
//
// REQUIREMENTS:
//   - EXPO_PUBLIC_SUPABASE_URL in .env
//   - SUPABASE_SERVICE_ROLE_KEY in .env
//   - LEMONSQUEEZY_API_KEY in .env

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Need admin key
);

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;

if (!LEMONSQUEEZY_API_KEY) {
  console.error('❌ LEMONSQUEEZY_API_KEY not found in .env file');
  process.exit(1);
}

async function syncBillingPeriods() {
  console.log('');
  console.log('========================================');
  console.log('SYNC BILLING PERIODS FROM LEMON SQUEEZY');
  console.log('========================================');
  console.log('');
  console.log('🔄 Fetching all active subscriptions from database...\n');

  // Get all users with active subscriptions
  const { data: subscriptions, error } = await supabase
    .from('user_subscriptions')
    .select('user_id, lemonsqueezy_subscription_id, tier, status')
    .eq('status', 'active');

  if (error) {
    console.error('❌ Error fetching subscriptions:', error);
    return;
  }

  console.log(`📊 Found ${subscriptions.length} active subscriptions\n`);

  if (subscriptions.length === 0) {
    console.log('ℹ️  No active subscriptions to sync');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const sub of subscriptions) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Processing subscription ${sub.lemonsqueezy_subscription_id}...`);
      console.log(`   Tier: ${sub.tier}`);
      console.log(`   Status: ${sub.status}`);

      // Fetch fresh data from Lemon Squeezy API
      console.log('   📡 Fetching from Lemon Squeezy API...');
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${sub.lemonsqueezy_subscription_id}`,
        {
          headers: {
            'Accept': 'application/vnd.api+json',
            'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`   ❌ API error: ${response.status} ${response.statusText}`);
        errorCount++;
        continue;
      }

      const lsData = await response.json();
      const attrs = lsData.data.attributes;

      const billingAnchor = attrs.billing_anchor;
      const renewsAt = attrs.renews_at;
      const currentPeriodEnd = attrs.current_period_end || renewsAt;

      if (!currentPeriodEnd) {
        console.error(`   ⚠️  No period end date available, skipping...`);
        skippedCount++;
        continue;
      }

      // Extract billing day (e.g., 28 from "2024-12-28")
      const billingDay = billingAnchor ? new Date(billingAnchor).getDate() : null;

      console.log(`   📅 Billing anchor: ${billingAnchor} (day ${billingDay} of month)`);
      console.log(`   📅 Current period ends: ${currentPeriodEnd}`);
      console.log(`   📅 Next renewal: ${renewsAt}`);

      // Calculate period start (approximation: period end - 1 month)
      const periodEnd = new Date(currentPeriodEnd);
      const periodStart = new Date(periodEnd);
      periodStart.setMonth(periodStart.getMonth() - 1);

      console.log(`   ✅ Calculated period: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);

      // Get current quota to see what we're updating
      const { data: currentQuota } = await supabase
        .from('user_simulation_quota')
        .select('period_start, period_end, simulations_used')
        .eq('user_id', sub.user_id)
        .single();

      if (currentQuota) {
        console.log(`   📊 Current period in DB: ${currentQuota.period_start} → ${currentQuota.period_end}`);
        console.log(`   📊 Current usage: ${currentQuota.simulations_used} simulations`);
      }

      // Update user_simulation_quota with correct dates
      const { error: updateError } = await supabase
        .from('user_simulation_quota')
        .update({
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', sub.user_id);

      if (updateError) {
        console.error(`   ❌ Error updating quota:`, updateError);
        errorCount++;
      } else {
        console.log(`   ✅ Updated successfully`);

        // Also update user_subscriptions table with latest data
        await supabase
          .from('user_subscriptions')
          .update({
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            renews_at: renewsAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', sub.user_id)
          .eq('lemonsqueezy_subscription_id', sub.lemonsqueezy_subscription_id);

        successCount++;
      }

      // Rate limiting - wait 200ms between requests to avoid hitting API limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
      errorCount++;
    }
  }

  console.log('\n');
  console.log('========================================');
  console.log('SYNC COMPLETE');
  console.log('========================================');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`📊 Total: ${subscriptions.length}`);
  console.log('========================================');
  console.log('');
  console.log('ℹ️  Next steps:');
  console.log('   1. Deploy the updated webhook code');
  console.log('   2. Monitor webhook logs for renewal events');
  console.log('   3. Verify users reset on their billing dates');
  console.log('');
}

syncBillingPeriods()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
