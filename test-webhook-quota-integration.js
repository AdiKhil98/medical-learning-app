/**
 * Test script for webhook quota integration
 *
 * This script tests that the Lemon Squeezy webhook correctly updates
 * the user_simulation_quota table when subscription events occur.
 *
 * Usage:
 *   node test-webhook-quota-integration.js
 */

const crypto = require('crypto');
require('dotenv').config();

const WEBHOOK_URL = process.env.WEBHOOK_TEST_URL || 'http://localhost:8888/.netlify/functions/lemonsqueezy';
const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || 'kpmedsecret';

// Helper to generate HMAC signature
function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}

// Test scenarios
const testScenarios = [
  {
    name: 'Subscription Created - Basis Tier',
    event: {
      meta: {
        event_name: 'subscription_created',
      },
      data: {
        id: 'test-sub-001',
        attributes: {
          variant_id: '1006948',
          variant_name: 'Basis-Plan',
          user_email: 'test@example.com',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    expectedTier: 'basis',
    expectedLimit: 20,
  },
  {
    name: 'Subscription Updated - Upgrade to Profi',
    event: {
      meta: {
        event_name: 'subscription_updated',
      },
      data: {
        id: 'test-sub-001',
        attributes: {
          variant_id: '1006934',
          variant_name: 'Profi-Plan',
          user_email: 'test@example.com',
          status: 'active',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
    expectedTier: 'profi',
    expectedLimit: 100,
  },
  {
    name: 'Subscription Expired - Reset to Free',
    event: {
      meta: {
        event_name: 'subscription_expired',
      },
      data: {
        id: 'test-sub-001',
        attributes: {
          variant_id: '1006934',
          variant_name: 'Profi-Plan',
          user_email: 'test@example.com',
          status: 'expired',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          ends_at: new Date().toISOString(),
        },
      },
    },
    expectedTier: 'free',
    expectedLimit: 5,
  },
];

async function testWebhook(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);

  const payload = JSON.stringify(scenario.event);
  const signature = generateSignature(payload, WEBHOOK_SECRET);

  console.log(`📤 Sending webhook request to: ${WEBHOOK_URL}`);
  console.log(`📋 Event: ${scenario.event.meta.event_name}`);
  console.log(`👤 User: ${scenario.event.data.attributes.user_email}`);
  console.log(`📦 Variant: ${scenario.event.data.attributes.variant_name}`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
      },
      body: payload,
    });

    const responseData = await response.json();

    console.log(`\n📥 Response Status: ${response.status}`);
    console.log(`📥 Response Body:`, JSON.stringify(responseData, null, 2));

    if (response.status === 200 && responseData.success) {
      console.log(`\n✅ Webhook processed successfully!`);
      console.log(`   Expected tier: ${scenario.expectedTier}`);
      console.log(`   Expected limit: ${scenario.expectedLimit}`);
      console.log(`\n   ℹ️  Check the database to verify:`);
      console.log(`   - user_subscriptions table has correct tier and status`);
      console.log(`   - user_simulation_quota table has correct total_simulations`);
      console.log(`   - webhook_events table has _quota_update metadata`);
      return true;
    } else {
      console.log(`\n❌ Webhook failed!`);
      console.log(`   Error: ${responseData.error || responseData.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`\n❌ Request failed!`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Webhook Quota Integration Test Suite                    ║
╚═══════════════════════════════════════════════════════════╝

Configuration:
- Webhook URL: ${WEBHOOK_URL}
- Webhook Secret: ${WEBHOOK_SECRET ? '✓ Set' : '✗ Not Set'}

Prerequisites:
1. User with email 'test@example.com' must exist in database
2. Netlify Dev server must be running (npm run netlify dev)
3. Environment variables must be configured

⚠️  Note: This will actually modify data in your database!
         Use a test/development database only!

Starting tests in 3 seconds...
`);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  let passed = 0;
  let failed = 0;

  for (const scenario of testScenarios) {
    const result = await testWebhook(scenario);
    if (result) {
      passed++;
    } else {
      failed++;
    }

    // Wait between tests
    if (testScenarios.indexOf(scenario) < testScenarios.length - 1) {
      console.log(`\n⏳ Waiting 2 seconds before next test...\n`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test Results:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${testScenarios.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (failed === 0) {
    console.log(`🎉 All tests passed!`);
    console.log(`\nNext steps:`);
    console.log(`1. Check the database to verify quota was updated`);
    console.log(`2. Query: SELECT * FROM user_simulation_quota WHERE user_id = [user_id];`);
    console.log(`3. Check webhook_events for _quota_update metadata`);
    console.log(`4. Verify the simulation screens show correct remaining count\n`);
  } else {
    console.log(`⚠️  Some tests failed. Check the errors above.\n`);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
