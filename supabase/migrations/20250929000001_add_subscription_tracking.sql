-- Add subscription tracking fields to users table
-- Migration: 20250929000001_add_subscription_tracking

-- Add subscription usage tracking columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS simulations_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_period_start DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS subscription_period_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
ADD COLUMN IF NOT EXISTS free_simulations_used INTEGER DEFAULT 0;

-- Create index for faster usage queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_period ON users(subscription_period_end);
CREATE INDEX IF NOT EXISTS idx_users_simulations_used ON users(simulations_used_this_month);

-- Add helpful comments
COMMENT ON COLUMN users.simulations_used_this_month IS 'Number of simulations used in current billing period';
COMMENT ON COLUMN users.subscription_period_start IS 'Start date of current billing period';
COMMENT ON COLUMN users.subscription_period_end IS 'End date of current billing period (when usage resets)';
COMMENT ON COLUMN users.free_simulations_used IS 'Number of free simulations used (for free tier tracking)';

-- Create a function to reset monthly usage (we'll use this later)
CREATE OR REPLACE FUNCTION reset_monthly_simulation_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Reset usage for users whose subscription period has ended
  UPDATE users
  SET
    simulations_used_this_month = 0,
    subscription_period_start = subscription_period_end,
    subscription_period_end = subscription_period_end + INTERVAL '1 month'
  WHERE
    subscription_period_end <= CURRENT_DATE
    AND subscription_status = 'active';

  GET DIAGNOSTICS reset_count = ROW_COUNT;

  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the reset function
COMMENT ON FUNCTION reset_monthly_simulation_usage() IS 'Resets monthly simulation usage for users whose billing period has ended';