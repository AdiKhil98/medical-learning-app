-- TEST: Verify Multiple Subscriptions Handling
-- Run these tests after applying handle_multiple_subscriptions.sql

-- ============================================
-- Setup: Get test user
-- ============================================
SELECT id, email FROM auth.users LIMIT 1;

-- For this test, let's say:
-- User ID: '11111111-1111-1111-1111-111111111111'
-- Email: 'test@example.com'

-- ============================================
-- TEST 1: Verify migration copied existing subscriptions
-- ============================================
SELECT
  user_id,
  tier,
  status,
  is_primary,
  created_at,
  last_webhook_event
FROM user_subscriptions
WHERE user_id IN (
  SELECT id FROM users WHERE subscription_tier IS NOT NULL LIMIT 5
);

-- Expected: All users with subscriptions in users table now have entries here
-- All should be marked is_primary = true

-- ============================================
-- TEST 2: Add second subscription (Basis plan)
-- ============================================
-- Simulate webhook creating a Basis subscription
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,  -- user_id
  'ls_sub_basis_123',                             -- lemonsqueezy_subscription_id
  'basis',                                        -- tier
  'active',                                       -- status
  'variant_basis',                                -- variant_id
  'Basis-Plan',                                   -- variant_name
  'test@example.com',                             -- customer_email
  30,                                             -- simulation_limit
  now() - interval '30 days',                     -- created_at
  now(),                                          -- updated_at
  now() + interval '30 days',                     -- expires_at
  now() + interval '30 days',                     -- renews_at
  now() - interval '30 days',                     -- period_start
  now() + interval '30 days',                     -- period_end
  'subscription_created'                          -- webhook_event
);

-- Verify it was added:
SELECT
  lemonsqueezy_subscription_id,
  tier,
  status,
  is_primary,
  tier_priority
FROM user_subscriptions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY tier_priority DESC;

-- Check users table:
SELECT subscription_tier, subscription_status, simulation_limit
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: subscription_tier = 'basis', is_primary = true

-- ============================================
-- TEST 3: Add HIGHER tier subscription (Profi)
-- ============================================
-- Now add a Profi subscription
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_profi_456',
  'profi',
  'active',
  'variant_profi',
  'Profi-Plan',
  'test@example.com',
  60,
  now() - interval '5 days',
  now(),
  now() + interval '25 days',
  now() + interval '25 days',
  now() - interval '5 days',
  now() + interval '25 days',
  'subscription_created'
);

-- Verify Profi is now primary:
SELECT
  lemonsqueezy_subscription_id,
  tier,
  status,
  is_primary,
  tier_priority
FROM user_subscriptions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY tier_priority DESC;

-- Expected:
-- Profi: is_primary = true, tier_priority = 100
-- Basis: is_primary = false, tier_priority = 10

-- Check users table (should now show Profi):
SELECT subscription_tier, subscription_status, simulation_limit
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: subscription_tier = 'profi', simulation_limit = 60

-- ============================================
-- TEST 4: Add HIGHEST tier (Unlimited)
-- ============================================
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_unlimited_789',
  'unlimited',
  'active',
  'variant_unlimited',
  'Unlimited-Plan',
  'test@example.com',
  NULL,  -- unlimited has no limit
  now() - interval '1 day',
  now(),
  NULL,  -- no expiry
  NULL,  -- no renewal (lifetime?)
  now() - interval '1 day',
  NULL,
  'subscription_created'
);

-- Verify Unlimited is now primary:
SELECT
  lemonsqueezy_subscription_id,
  tier,
  status,
  is_primary,
  tier_priority
FROM user_subscriptions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY tier_priority DESC;

-- Expected:
-- Unlimited: is_primary = true, tier_priority = 1000
-- Profi: is_primary = false, tier_priority = 100
-- Basis: is_primary = false, tier_priority = 10

-- Check users table (should now show Unlimited):
SELECT subscription_tier, subscription_status, simulation_limit
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: subscription_tier = 'unlimited', simulation_limit = NULL or 999999

-- ============================================
-- TEST 5: Cancel Unlimited (Profi should become primary)
-- ============================================
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_unlimited_789',
  'unlimited',
  'cancelled',  -- Status changed!
  'variant_unlimited',
  'Unlimited-Plan',
  'test@example.com',
  NULL,
  now() - interval '1 day',
  now(),
  now(),  -- expires now
  NULL,
  now() - interval '1 day',
  now(),
  'subscription_cancelled'
);

-- Verify Profi is now primary again:
SELECT
  lemonsqueezy_subscription_id,
  tier,
  status,
  is_primary,
  tier_priority
FROM user_subscriptions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY tier_priority DESC;

-- Expected:
-- Unlimited: is_primary = false, status = 'cancelled'
-- Profi: is_primary = true, tier_priority = 100
-- Basis: is_primary = false, tier_priority = 10

-- Check users table (should fallback to Profi):
SELECT subscription_tier, subscription_status, simulation_limit
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: subscription_tier = 'profi', simulation_limit = 60

-- ============================================
-- TEST 6: Cancel all subscriptions (user becomes free)
-- ============================================
-- Cancel Profi:
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_profi_456',
  'profi',
  'cancelled',
  'variant_profi',
  'Profi-Plan',
  'test@example.com',
  60,
  now() - interval '5 days',
  now(),
  now(),
  NULL,
  now() - interval '5 days',
  now(),
  'subscription_cancelled'
);

-- Cancel Basis:
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_basis_123',
  'basis',
  'cancelled',
  'variant_basis',
  'Basis-Plan',
  'test@example.com',
  30,
  now() - interval '30 days',
  now(),
  now(),
  NULL,
  now() - interval '30 days',
  now(),
  'subscription_cancelled'
);

-- Verify all are cancelled:
SELECT
  lemonsqueezy_subscription_id,
  tier,
  status,
  is_primary
FROM user_subscriptions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY tier_priority DESC;

-- Expected: All have status = 'cancelled', all is_primary = false

-- Check users table (should be free tier):
SELECT subscription_tier, subscription_status, simulation_limit
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected: subscription_tier = NULL, subscription_status = 'inactive'

-- ============================================
-- TEST 7: Test same tier priority (newer wins)
-- ============================================
-- Create two Basis subscriptions
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_basis_old',
  'basis',
  'active',
  'variant_basis',
  'Basis-Plan',
  'test@example.com',
  30,
  now() - interval '60 days',  -- Older
  now(),
  now() + interval '30 days',
  now() + interval '30 days',
  now() - interval '60 days',
  now() + interval '30 days',
  'subscription_created'
);

SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_basis_new',
  'basis',
  'active',
  'variant_basis',
  'Basis-Plan',
  'test@example.com',
  30,
  now() - interval '5 days',  -- Newer
  now(),
  now() + interval '25 days',
  now() + interval '25 days',
  now() - interval '5 days',
  now() + interval '25 days',
  'subscription_created'
);

-- Verify newer one is primary:
SELECT
  lemonsqueezy_subscription_id,
  tier,
  is_primary,
  created_at
FROM user_subscriptions
WHERE user_id = '11111111-1111-1111-1111-111111111111'
  AND status = 'active'
ORDER BY created_at DESC;

-- Expected: 'ls_sub_basis_new' has is_primary = true (newer)

-- ============================================
-- TEST 8: View subscription overview
-- ============================================
SELECT * FROM user_subscriptions_overview
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Expected:
-- total_subscriptions: 5 (or however many we created)
-- active_subscriptions: 2 (two Basis subscriptions)
-- primary_subscription_count: 1
-- primary_tier: 'basis'
-- primary_status: 'active'

-- ============================================
-- TEST 9: Find users with multiple active subscriptions
-- ============================================
SELECT
  user_id,
  email,
  total_subscriptions,
  active_subscriptions,
  primary_tier,
  current_tier_in_users_table
FROM user_subscriptions_overview
WHERE active_subscriptions > 1;

-- Shows users who have multiple active subscriptions
-- These users might want to cancel duplicates

-- ============================================
-- TEST 10: Verify tier priority calculation
-- ============================================
SELECT
  tier,
  calculate_tier_priority(tier) as priority
FROM (
  VALUES ('unlimited'), ('profi'), ('basis'), ('unknown')
) AS t(tier);

-- Expected:
-- unlimited: 1000
-- profi: 100
-- basis: 10
-- unknown: 1

-- ============================================
-- TEST 11: Test counter reset on tier change
-- ============================================
-- Set user to Basis with some usage
UPDATE users
SET
  subscription_tier = 'basis',
  simulations_used_this_month = 15
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Upgrade to Profi (tier change should reset counter)
SELECT upsert_subscription_from_webhook(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'ls_sub_profi_upgrade',
  'profi',
  'active',
  'variant_profi',
  'Profi-Plan',
  'test@example.com',
  60,
  now(),
  now(),
  now() + interval '30 days',
  now() + interval '30 days',
  now(),
  now() + interval '30 days',
  'subscription_created'
);

-- Check if counter was reset:
SELECT
  subscription_tier,
  simulations_used_this_month,
  last_counter_reset
FROM users
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Expected:
-- subscription_tier: 'profi'
-- simulations_used_this_month: 0 (reset!)
-- last_counter_reset: recent timestamp

-- ============================================
-- CLEANUP: Remove test data
-- ============================================
DELETE FROM user_subscriptions
WHERE lemonsqueezy_subscription_id LIKE 'ls_sub_%';

-- ============================================
-- SUMMARY
-- ============================================
-- After running these tests, you should verify:
-- ✅ Existing subscriptions migrated to user_subscriptions table
-- ✅ Multiple subscriptions can be stored per user
-- ✅ Higher tier subscription becomes primary (unlimited > profi > basis)
-- ✅ When higher tier is cancelled, next highest becomes primary
-- ✅ When all subscriptions cancelled, user becomes free tier
-- ✅ Same tier: newer subscription becomes primary
-- ✅ Subscription overview shows all subscriptions per user
-- ✅ Users with multiple active subscriptions can be identified
-- ✅ Tier priority calculation works correctly
-- ✅ Counter resets on tier change
-- ✅ Primary subscription syncs to users table correctly

-- ============================================
-- RECOMMENDED MONITORING
-- ============================================
-- 1. Check for users with multiple active subscriptions daily:
--    SELECT * FROM user_subscriptions_overview
--    WHERE active_subscriptions > 1;
--
-- 2. Notify users to cancel duplicate subscriptions
--
-- 3. Monitor primary subscription changes:
--    SELECT * FROM user_subscriptions
--    WHERE is_primary = true
--    ORDER BY updated_at_db DESC
--    LIMIT 10;
