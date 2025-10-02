-- Add free tier usage tracking to prevent abuse
-- Migration: 20250930000001_add_free_tier_tracking

-- Add column to track if user has ever used free tier
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_used_free_tier BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_free_tier_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS free_tier_reset_count INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_has_used_free_tier ON users(has_used_free_tier);

-- Add helpful comments
COMMENT ON COLUMN users.has_used_free_tier IS 'Tracks if user has ever used their free tier (prevents abuse)';
COMMENT ON COLUMN users.first_free_tier_used_at IS 'Timestamp when user first used free tier';
COMMENT ON COLUMN users.free_tier_reset_count IS 'Number of times user has reset to free tier (for admin tracking)';

-- Update existing users who have used free simulations to mark them as having used free tier
UPDATE users
SET
  has_used_free_tier = TRUE,
  first_free_tier_used_at = COALESCE(created_at, NOW())
WHERE free_simulations_used > 0 OR subscription_tier IS NOT NULL;