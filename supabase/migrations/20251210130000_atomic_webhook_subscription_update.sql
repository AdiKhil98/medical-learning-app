-- Migration: Atomic Webhook Subscription Update
-- Date: 2025-12-10
-- Purpose: Ensure subscription and quota updates happen atomically in a single transaction
--
-- PROBLEM:
-- - Webhook handler calls upsert_subscription_from_webhook() first
-- - Then calls handle_subscription_change() separately
-- - If second call fails, user has subscription but wrong quota
-- - This creates a window of inconsistency
--
-- SOLUTION:
-- - Create single atomic function that does both operations in one transaction
-- - If either fails, both rollback
-- - Prevents partial updates

-- ============================================
-- STEP 1: Create atomic webhook processing function
-- ============================================

CREATE OR REPLACE FUNCTION process_subscription_webhook_atomic(
  -- User identification
  p_user_id uuid,

  -- Subscription data
  p_lemonsqueezy_subscription_id text,
  p_tier text,
  p_status text,
  p_variant_id text,
  p_variant_name text,
  p_customer_email text,
  p_simulation_limit integer,

  -- Timestamps
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_expires_at timestamptz DEFAULT NULL,
  p_renews_at timestamptz DEFAULT NULL,
  p_period_start timestamptz DEFAULT NULL,
  p_period_end timestamptz DEFAULT NULL,

  -- Metadata
  p_webhook_event text
)
RETURNS json AS $$
DECLARE
  v_subscription_result RECORD;
  v_quota_result RECORD;
  v_tier_changed boolean := false;
  v_old_tier text;
BEGIN
  -- Start atomic transaction (implicit in function)
  -- Both operations will succeed or both will fail

  -- ============================================
  -- OPERATION 1: Upsert subscription
  -- ============================================

  -- Get old tier if exists (for change detection)
  SELECT tier INTO v_old_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Upsert subscription record
  INSERT INTO user_subscriptions (
    user_id,
    lemonsqueezy_subscription_id,
    tier,
    status,
    variant_id,
    variant_name,
    customer_email,
    simulation_limit,
    created_at,
    updated_at,
    expires_at,
    renews_at,
    period_start,
    period_end,
    webhook_event
  ) VALUES (
    p_user_id,
    p_lemonsqueezy_subscription_id,
    p_tier,
    p_status,
    p_variant_id,
    p_variant_name,
    p_customer_email,
    p_simulation_limit,
    p_created_at,
    p_updated_at,
    p_expires_at,
    p_renews_at,
    COALESCE(p_period_start, date_trunc('month', NOW())),
    COALESCE(p_period_end, date_trunc('month', NOW()) + INTERVAL '1 month'),
    p_webhook_event
  )
  ON CONFLICT (user_id, lemonsqueezy_subscription_id)
  DO UPDATE SET
    tier = EXCLUDED.tier,
    status = EXCLUDED.status,
    variant_id = EXCLUDED.variant_id,
    variant_name = EXCLUDED.variant_name,
    simulation_limit = EXCLUDED.simulation_limit,
    updated_at = EXCLUDED.updated_at,
    expires_at = EXCLUDED.expires_at,
    renews_at = EXCLUDED.renews_at,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    webhook_event = EXCLUDED.webhook_event
  RETURNING * INTO v_subscription_result;

  -- Check if tier changed
  IF v_old_tier IS NOT NULL AND v_old_tier != p_tier THEN
    v_tier_changed := true;
  END IF;

  -- ============================================
  -- OPERATION 2: Update quota (in same transaction)
  -- ============================================

  -- Initialize or update quota for current period
  SELECT * INTO v_quota_result
  FROM initialize_user_quota(
    p_user_id,
    p_tier,
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + INTERVAL '1 month'
  );

  -- ============================================
  -- OPERATION 3: Log successful webhook processing
  -- ============================================

  -- Note: webhook_events logging happens in the webhook handler
  -- This function only handles the atomic subscription+quota update

  RAISE NOTICE 'Atomic webhook processing completed for user %: tier=%, status=%',
    p_user_id, p_tier, p_status;

  IF v_tier_changed THEN
    RAISE NOTICE 'Tier changed: % → %', v_old_tier, p_tier;
  END IF;

  -- Return success with both results
  RETURN json_build_object(
    'success', true,
    'message', 'Subscription and quota updated atomically',
    'subscription', row_to_json(v_subscription_result),
    'quota', v_quota_result,
    'tier_changed', v_tier_changed,
    'old_tier', v_old_tier,
    'new_tier', p_tier
  );

EXCEPTION
  WHEN OTHERS THEN
    -- If any operation fails, entire transaction rolls back
    RAISE WARNING 'Atomic webhook processing failed for user %: %', p_user_id, SQLERRM;

    -- Return error
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to process webhook atomically'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_subscription_webhook_atomic IS
'Atomically processes a subscription webhook by updating both user_subscriptions and user_simulation_quota in a single transaction.
If either operation fails, both rollback to prevent inconsistent state.
This replaces the two-step process (upsert_subscription + handle_subscription_change) with a single atomic operation.';

GRANT EXECUTE ON FUNCTION process_subscription_webhook_atomic TO service_role;

-- ============================================
-- STEP 2: Create helper function for webhook event logging
-- ============================================

CREATE OR REPLACE FUNCTION log_webhook_event_with_result(
  p_event_type text,
  p_event_data jsonb,
  p_subscription_id text,
  p_user_id uuid,
  p_status text DEFAULT 'processed',
  p_error_message text DEFAULT NULL,
  p_processing_result jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO webhook_events (
    event_type,
    event_data,
    subscription_id,
    user_id,
    status,
    error_message,
    processing_result,
    created_at
  ) VALUES (
    p_event_type,
    p_event_data,
    p_subscription_id,
    p_user_id,
    p_status,
    p_error_message,
    p_processing_result,
    NOW()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_webhook_event_with_result IS
'Logs webhook events with processing results for debugging and monitoring.
Returns the event ID for reference.';

GRANT EXECUTE ON FUNCTION log_webhook_event_with_result TO service_role;

-- ============================================
-- STEP 3: Migration verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Atomic webhook migration completed!';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  - process_subscription_webhook_atomic()';
  RAISE NOTICE '  - log_webhook_event_with_result()';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  - Subscription + quota updates are atomic';
  RAISE NOTICE '  - No more partial update failures';
  RAISE NOTICE '  - Automatic rollback on errors';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
