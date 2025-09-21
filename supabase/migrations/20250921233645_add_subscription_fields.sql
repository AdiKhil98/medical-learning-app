-- Add subscription fields to users table for Lemon Squeezy integration
-- Migration: 20250921233645_add_subscription_fields

-- Add subscription-related columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS variant_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'inactive')),
ADD COLUMN IF NOT EXISTS subscription_tier text CHECK (subscription_tier IN ('basis', 'profi', 'unlimited')),
ADD COLUMN IF NOT EXISTS subscription_variant_name text,
ADD COLUMN IF NOT EXISTS simulation_limit integer,
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_email text,
ADD COLUMN IF NOT EXISTS subscription_created_at timestamptz,
ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz DEFAULT now();

-- Create index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- Create webhook_events table for logging
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  subscription_id text,
  user_id uuid REFERENCES users(id),
  processed_at timestamptz DEFAULT now(),
  status text DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'ignored')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create index for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription_id ON webhook_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Add RLS policies for webhook_events table
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access webhook events (for admin purposes)
CREATE POLICY "Webhook events are only accessible by service role" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- Add helpful comment
COMMENT ON TABLE webhook_events IS 'Stores Lemon Squeezy webhook events for debugging and audit purposes';
COMMENT ON COLUMN users.subscription_id IS 'Lemon Squeezy subscription ID';
COMMENT ON COLUMN users.variant_id IS 'Lemon Squeezy product variant ID';
COMMENT ON COLUMN users.subscription_tier IS 'Subscription tier: basis (30 sims), profi (60 sims), unlimited';
COMMENT ON COLUMN users.simulation_limit IS 'Monthly simulation limit (null = unlimited)';