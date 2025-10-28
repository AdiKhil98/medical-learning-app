-- Enable real-time for lock system functionality
-- Migration: 20251028_enable_realtime_for_lock_system
-- Purpose: Ensure users table has proper real-time capabilities for instant lock detection

-- Enable REPLICA IDENTITY for users table to allow real-time subscriptions
-- This is required for Supabase real-time to track UPDATE changes
ALTER TABLE users REPLICA IDENTITY FULL;

-- Verify that the users table has all required columns for lock system
-- These should already exist from previous migrations, but we verify here
DO $$
BEGIN
  -- Verify subscription_tier column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_tier TEXT;
  END IF;

  -- Verify subscription_status column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_status TEXT;
  END IF;

  -- Verify simulation_limit column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'simulation_limit'
  ) THEN
    ALTER TABLE users ADD COLUMN simulation_limit INTEGER;
  END IF;

  -- Verify simulations_used_this_month column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'simulations_used_this_month'
  ) THEN
    ALTER TABLE users ADD COLUMN simulations_used_this_month INTEGER DEFAULT 0;
  END IF;

  -- Verify free_simulations_used column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'free_simulations_used'
  ) THEN
    ALTER TABLE users ADD COLUMN free_simulations_used INTEGER DEFAULT 0;
  END IF;

  -- Verify subscription_period_end column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_period_end'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_period_end DATE;
  END IF;
END $$;

-- Add comment explaining the replica identity setting
COMMENT ON TABLE users IS 'Users table with REPLICA IDENTITY FULL for real-time lock system monitoring';

-- Create optimized indexes for lock system queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier_status
  ON users(subscription_tier, subscription_status);

CREATE INDEX IF NOT EXISTS idx_users_usage_tracking
  ON users(simulations_used_this_month, free_simulations_used);

-- Add helpful comment
COMMENT ON INDEX idx_users_subscription_tier_status IS 'Optimizes queries for subscription access checks';
COMMENT ON INDEX idx_users_usage_tracking IS 'Optimizes queries for usage limit validation';
