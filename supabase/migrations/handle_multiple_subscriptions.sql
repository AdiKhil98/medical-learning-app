-- CRITICAL FIX: Handle Multiple Active Subscriptions
-- Migration: handle_multiple_subscriptions
-- Date: 2025-11-18
-- Issue: User could have multiple active subscriptions, system doesn't know which to use

-- ============================================
-- PROBLEM
-- ============================================
-- Current system stores only ONE subscription per user in users table
-- But LemonSqueezy allows:
-- 1. User subscribes to Basis plan
-- 2. User subscribes to Profi plan (doesn't cancel Basis)
-- 3. Both subscriptions are active
-- 4. Webhooks update user based on whichever fires
-- 5. User could be downgraded if old subscription webhook fires after new one

-- Example scenario:
-- 1. User has Unlimited subscription (active)
-- 2. User's old Basis subscription (also active, not cancelled) sends webhook
-- 3. User gets downgraded to Basis tier!

-- ============================================
-- Solution: Multi-Subscription Table + Primary Selection
-- ============================================

-- Step 1: Create subscriptions table to store ALL subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- LemonSqueezy subscription data
  lemonsqueezy_subscription_id TEXT NOT NULL,
  lemonsqueezy_variant_id TEXT,
  lemonsqueezy_variant_name TEXT,
  lemonsqueezy_customer_email TEXT,

  -- Subscription details
  tier TEXT NOT NULL, -- 'basis', 'profi', 'unlimited'
  status TEXT NOT NULL, -- 'active', 'on_trial', 'past_due', 'cancelled', 'expired', 'paused'
  simulation_limit INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  -- Priority for determining primary subscription
  -- Calculated: 1000 for unlimited, 100 for profi, 10 for basis
  tier_priority INTEGER NOT NULL DEFAULT 10,

  -- Metadata
  is_primary BOOLEAN DEFAULT false, -- Only one subscription can be primary
  last_webhook_event TEXT, -- Last event that updated this subscription
  last_webhook_at TIMESTAMPTZ,

  created_at_db TIMESTAMPTZ DEFAULT NOW(),
  updated_at_db TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_lemonsqueezy_subscription UNIQUE (lemonsqueezy_subscription_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_primary ON user_subscriptions(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(user_id, status) WHERE status IN ('active', 'on_trial', 'past_due');

COMMENT ON TABLE user_subscriptions IS
'Stores ALL user subscriptions from LemonSqueezy. Supports multiple active subscriptions per user.';

-- ============================================
-- Step 2: Create function to calculate tier priority
-- ============================================
CREATE OR REPLACE FUNCTION calculate_tier_priority(p_tier TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'unlimited' THEN 1000
    WHEN 'profi' THEN 100
    WHEN 'basis' THEN 10
    ELSE 1  -- Unknown tiers get lowest priority
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Step 3: Create function to determine primary subscription
-- ============================================
CREATE OR REPLACE FUNCTION determine_primary_subscription(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_primary_subscription_id UUID;
BEGIN
  -- Select the best subscription based on:
  -- 1. Status must be active (active, on_trial, past_due)
  -- 2. Highest tier priority (unlimited > profi > basis)
  -- 3. Most recently created if same tier
  SELECT id
  INTO v_primary_subscription_id
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'on_trial', 'past_due')
  ORDER BY
    tier_priority DESC,  -- Higher tier wins
    created_at DESC      -- Newer wins if same tier
  LIMIT 1;

  RETURN v_primary_subscription_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION determine_primary_subscription(UUID) IS
'Determines which subscription should be primary based on tier priority and creation date.';

-- ============================================
-- Step 4: Create function to sync primary subscription to users table
-- ============================================
CREATE OR REPLACE FUNCTION sync_primary_subscription_to_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_primary_subscription RECORD;
  v_old_tier TEXT;
  v_new_tier TEXT;
BEGIN
  -- Get current user tier
  SELECT subscription_tier INTO v_old_tier
  FROM users
  WHERE id = p_user_id;

  -- Find and mark primary subscription
  UPDATE user_subscriptions
  SET is_primary = false
  WHERE user_id = p_user_id;

  -- Get the best subscription
  SELECT *
  INTO v_primary_subscription
  FROM user_subscriptions
  WHERE id = determine_primary_subscription(p_user_id);

  IF v_primary_subscription.id IS NULL THEN
    -- No active subscriptions, set user to free tier
    UPDATE users
    SET
      subscription_tier = NULL,
      subscription_status = 'inactive',
      subscription_type = NULL,
      subscription_variant_name = NULL,
      simulation_limit = NULL,
      subscription_id = NULL,
      variant_id = NULL
    WHERE id = p_user_id;

    RETURN json_build_object(
      'success', true,
      'primary_subscription_id', null,
      'tier', 'free',
      'message', 'No active subscriptions, user set to free tier'
    );
  END IF;

  -- Mark as primary
  UPDATE user_subscriptions
  SET is_primary = true
  WHERE id = v_primary_subscription.id;

  v_new_tier := v_primary_subscription.tier;

  -- Sync to users table
  UPDATE users
  SET
    subscription_id = v_primary_subscription.lemonsqueezy_subscription_id,
    variant_id = v_primary_subscription.lemonsqueezy_variant_id,
    subscription_status = v_primary_subscription.status,
    subscription_type = v_primary_subscription.tier,
    subscription_tier = v_primary_subscription.tier,
    subscription_variant_name = v_primary_subscription.lemonsqueezy_variant_name,
    simulation_limit = v_primary_subscription.simulation_limit,
    lemon_squeezy_customer_email = v_primary_subscription.lemonsqueezy_customer_email,
    subscription_created_at = v_primary_subscription.created_at,
    subscription_updated_at = v_primary_subscription.updated_at,
    subscription_expires_at = v_primary_subscription.expires_at,
    subscription_period_start = v_primary_subscription.period_start,
    subscription_period_end = v_primary_subscription.period_end
  WHERE id = p_user_id;

  -- Check if tier changed (upgrade/downgrade)
  IF v_old_tier IS DISTINCT FROM v_new_tier THEN
    -- Tier changed, reset monthly counter
    UPDATE users
    SET
      simulations_used_this_month = 0,
      last_counter_reset = NOW()
    WHERE id = p_user_id;

    RAISE NOTICE 'Tier changed from % to % for user %, counter reset', v_old_tier, v_new_tier, p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'primary_subscription_id', v_primary_subscription.id,
    'tier', v_new_tier,
    'status', v_primary_subscription.status,
    'tier_changed', v_old_tier IS DISTINCT FROM v_new_tier,
    'old_tier', v_old_tier,
    'new_tier', v_new_tier,
    'message', 'Primary subscription synced to user'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to service_role only (for webhooks)
REVOKE ALL ON FUNCTION sync_primary_subscription_to_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_primary_subscription_to_user(UUID) TO service_role;

COMMENT ON FUNCTION sync_primary_subscription_to_user(UUID) IS
'Determines primary subscription and syncs it to users table. Called by webhooks.';

-- ============================================
-- Step 5: Create function to upsert subscription from webhook
-- ============================================
CREATE OR REPLACE FUNCTION upsert_subscription_from_webhook(
  p_user_id UUID,
  p_lemonsqueezy_subscription_id TEXT,
  p_tier TEXT,
  p_status TEXT,
  p_variant_id TEXT,
  p_variant_name TEXT,
  p_customer_email TEXT,
  p_simulation_limit INTEGER,
  p_created_at TIMESTAMPTZ,
  p_updated_at TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ,
  p_renews_at TIMESTAMPTZ,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_webhook_event TEXT
)
RETURNS JSON AS $$
DECLARE
  v_tier_priority INTEGER;
  v_subscription_id UUID;
  v_sync_result JSON;
BEGIN
  -- Calculate tier priority
  v_tier_priority := calculate_tier_priority(p_tier);

  -- Upsert subscription
  INSERT INTO user_subscriptions (
    user_id,
    lemonsqueezy_subscription_id,
    lemonsqueezy_variant_id,
    lemonsqueezy_variant_name,
    lemonsqueezy_customer_email,
    tier,
    status,
    simulation_limit,
    tier_priority,
    created_at,
    updated_at,
    expires_at,
    renews_at,
    period_start,
    period_end,
    last_webhook_event,
    last_webhook_at
  ) VALUES (
    p_user_id,
    p_lemonsqueezy_subscription_id,
    p_variant_id,
    p_variant_name,
    p_customer_email,
    p_tier,
    p_status,
    p_simulation_limit,
    v_tier_priority,
    p_created_at,
    p_updated_at,
    p_expires_at,
    p_renews_at,
    p_period_start,
    p_period_end,
    p_webhook_event,
    NOW()
  )
  ON CONFLICT (lemonsqueezy_subscription_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    tier = EXCLUDED.tier,
    tier_priority = EXCLUDED.tier_priority,
    simulation_limit = EXCLUDED.simulation_limit,
    updated_at = EXCLUDED.updated_at,
    expires_at = EXCLUDED.expires_at,
    renews_at = EXCLUDED.renews_at,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    cancelled_at = CASE
      WHEN EXCLUDED.status IN ('cancelled', 'expired') THEN NOW()
      ELSE user_subscriptions.cancelled_at
    END,
    last_webhook_event = EXCLUDED.last_webhook_event,
    last_webhook_at = NOW(),
    updated_at_db = NOW()
  RETURNING id INTO v_subscription_id;

  -- Sync primary subscription to users table
  v_sync_result := sync_primary_subscription_to_user(p_user_id);

  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'sync_result', v_sync_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to service_role only (for webhooks)
REVOKE ALL ON FUNCTION upsert_subscription_from_webhook(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ,
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_subscription_from_webhook(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ,
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT
) TO service_role;

COMMENT ON FUNCTION upsert_subscription_from_webhook IS
'Called by LemonSqueezy webhook to upsert subscription and sync primary to user. Service role only.';

-- ============================================
-- Step 6: Create view for subscription overview
-- ============================================
CREATE OR REPLACE VIEW user_subscriptions_overview AS
SELECT
  u.id as user_id,
  u.email,
  u.subscription_tier as current_tier_in_users_table,
  COUNT(us.id) as total_subscriptions,
  COUNT(us.id) FILTER (WHERE us.status IN ('active', 'on_trial', 'past_due')) as active_subscriptions,
  COUNT(us.id) FILTER (WHERE us.is_primary = true) as primary_subscription_count,
  MAX(us.tier) FILTER (WHERE us.is_primary = true) as primary_tier,
  MAX(us.status) FILTER (WHERE us.is_primary = true) as primary_status,
  ARRAY_AGG(
    json_build_object(
      'tier', us.tier,
      'status', us.status,
      'is_primary', us.is_primary,
      'created_at', us.created_at
    ) ORDER BY us.tier_priority DESC, us.created_at DESC
  ) FILTER (WHERE us.id IS NOT NULL) as all_subscriptions
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
GROUP BY u.id, u.email, u.subscription_tier;

COMMENT ON VIEW user_subscriptions_overview IS
'Shows overview of all subscriptions per user, including primary subscription.';

-- ============================================
-- Step 7: Migration - Copy existing subscription data
-- ============================================
-- Migrate existing subscription data from users table to user_subscriptions table
INSERT INTO user_subscriptions (
  user_id,
  lemonsqueezy_subscription_id,
  lemonsqueezy_variant_id,
  lemonsqueezy_variant_name,
  lemonsqueezy_customer_email,
  tier,
  status,
  simulation_limit,
  tier_priority,
  created_at,
  updated_at,
  expires_at,
  period_start,
  period_end,
  is_primary,
  last_webhook_event
)
SELECT
  u.id as user_id,
  COALESCE(u.subscription_id, 'migrated-' || u.id::text) as lemonsqueezy_subscription_id,
  u.variant_id,
  u.subscription_variant_name,
  u.lemon_squeezy_customer_email,
  COALESCE(u.subscription_tier, '') as tier,
  COALESCE(u.subscription_status, 'inactive') as status,
  u.simulation_limit,
  calculate_tier_priority(COALESCE(u.subscription_tier, '')) as tier_priority,
  COALESCE(u.subscription_created_at, u.created_at) as created_at,
  u.subscription_updated_at as updated_at,
  u.subscription_expires_at as expires_at,
  u.subscription_period_start as period_start,
  u.subscription_period_end as period_end,
  true as is_primary, -- Existing subscription becomes primary
  'migration' as last_webhook_event
FROM users u
WHERE u.subscription_tier IS NOT NULL
  AND u.subscription_tier != ''
  AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = u.id
  )
ON CONFLICT (lemonsqueezy_subscription_id) DO NOTHING;

-- ============================================
-- Verification Queries
-- ============================================

-- Test 1: View all users with multiple subscriptions
-- SELECT * FROM user_subscriptions_overview
-- WHERE total_subscriptions > 1;

-- Test 2: View users with multiple ACTIVE subscriptions
-- SELECT * FROM user_subscriptions_overview
-- WHERE active_subscriptions > 1;

-- Test 3: Check primary subscription selection
-- SELECT * FROM user_subscriptions
-- WHERE is_primary = true
-- ORDER BY tier_priority DESC;
