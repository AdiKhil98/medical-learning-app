-- Migration: Add subscription period tracking
-- This enables automatic monthly counter resets

-- Add subscription period columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_counter_reset TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_period_end ON users(subscription_period_end);
CREATE INDEX IF NOT EXISTS idx_users_last_counter_reset ON users(last_counter_reset);

-- Add comments for documentation
COMMENT ON COLUMN users.subscription_period_start IS 'Start date of current billing period';
COMMENT ON COLUMN users.subscription_period_end IS 'End date of current billing period (when renewal happens)';
COMMENT ON COLUMN users.last_counter_reset IS 'Last time the simulation counter was reset';

-- Initialize period dates for existing active subscriptions
-- Set to current date + 30 days for monthly subscriptions
UPDATE users
SET
  subscription_period_start = COALESCE(subscription_created_at, NOW()),
  subscription_period_end = COALESCE(subscription_created_at, NOW()) + INTERVAL '30 days',
  last_counter_reset = NOW()
WHERE
  subscription_tier IS NOT NULL
  AND subscription_tier != 'free'
  AND subscription_status = 'active'
  AND subscription_period_start IS NULL;

-- Create function to check and reset counter if in new billing period
CREATE OR REPLACE FUNCTION check_and_reset_monthly_counter(user_id_input UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  needs_reset BOOLEAN := FALSE;
BEGIN
  -- Get user subscription data
  SELECT
    subscription_tier,
    subscription_status,
    subscription_period_end,
    simulations_used_this_month,
    last_counter_reset
  INTO user_record
  FROM users
  WHERE id = user_id_input;

  -- Only process for active paid subscriptions
  IF user_record.subscription_tier IS NULL
     OR user_record.subscription_tier = 'free'
     OR user_record.subscription_tier = 'unlimited'
     OR user_record.subscription_status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check if we're past the billing period end date
  IF user_record.subscription_period_end IS NOT NULL
     AND NOW() > user_record.subscription_period_end THEN
    needs_reset := TRUE;
  END IF;

  -- Check if counter was last reset more than 30 days ago (fallback)
  IF user_record.last_counter_reset IS NOT NULL
     AND NOW() > (user_record.last_counter_reset + INTERVAL '30 days') THEN
    needs_reset := TRUE;
  END IF;

  -- Reset counter and update period if needed
  IF needs_reset THEN
    UPDATE users
    SET
      simulations_used_this_month = 0,
      subscription_period_start = NOW(),
      subscription_period_end = NOW() + INTERVAL '30 days',
      last_counter_reset = NOW(),
      subscription_updated_at = NOW()
    WHERE id = user_id_input;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_and_reset_monthly_counter(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_reset_monthly_counter(UUID) TO service_role;

-- Create function to manually reset counter (for admin use)
CREATE OR REPLACE FUNCTION admin_reset_user_counter(user_email TEXT)
RETURNS JSON AS $$
DECLARE
  user_id_var UUID;
  result JSON;
BEGIN
  -- Find user by email (case-insensitive)
  SELECT id INTO user_id_var
  FROM users
  WHERE LOWER(email) = LOWER(user_email);

  IF user_id_var IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Reset counter
  UPDATE users
  SET
    simulations_used_this_month = 0,
    last_counter_reset = NOW(),
    subscription_updated_at = NOW()
  WHERE id = user_id_var;

  -- Return result
  SELECT json_build_object(
    'success', true,
    'message', 'Counter reset successfully',
    'user_id', id,
    'email', email,
    'simulations_used_this_month', simulations_used_this_month
  ) INTO result
  FROM users
  WHERE id = user_id_var;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_reset_user_counter(TEXT) TO service_role;
