-- CRITICAL SECURITY FIX: Restrict RLS policies to prevent subscription manipulation
-- Migration: fix_rls_policies
-- Date: 2025-11-18
-- Issue: Users can update their own subscription_tier, simulation_limit, etc.

-- ============================================
-- VULNERABILITY DEMO (Before Fix)
-- ============================================
-- A user could run this in the browser console:
--
-- await supabase.from('users').update({
--   subscription_tier: 'unlimited',
--   simulation_limit: 999999,
--   simulations_used_this_month: 0
-- }).eq('id', user.id);
--
-- And get unlimited access without paying!

-- ============================================
-- Step 1: Drop the overly permissive policy
-- ============================================
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- ============================================
-- Step 2: Create granular policies for different column types
-- ============================================

-- Policy 1: Safe profile fields that users CAN update
CREATE POLICY "Users can update safe profile fields"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND
    -- Only allow updating these specific safe columns
    (
      -- Basic profile fields
      (OLD.name IS DISTINCT FROM NEW.name) OR
      (OLD.push_token IS DISTINCT FROM NEW.push_token) OR
      (OLD.push_notifications_enabled IS DISTINCT FROM NEW.push_notifications_enabled) OR
      (OLD.sound_vibration_enabled IS DISTINCT FROM NEW.sound_vibration_enabled)
    )
    AND
    -- CRITICAL: Prevent modification of subscription fields
    OLD.subscription_tier IS NOT DISTINCT FROM NEW.subscription_tier AND
    OLD.subscription_status IS NOT DISTINCT FROM NEW.subscription_status AND
    OLD.subscription_type IS NOT DISTINCT FROM NEW.subscription_type AND
    OLD.subscription_variant_name IS NOT DISTINCT FROM NEW.subscription_variant_name AND
    OLD.simulation_limit IS NOT DISTINCT FROM NEW.simulation_limit AND
    OLD.simulations_used_this_month IS NOT DISTINCT FROM NEW.simulations_used_this_month AND
    OLD.free_simulations_used IS NOT DISTINCT FROM NEW.free_simulations_used AND
    OLD.subscription_id IS NOT DISTINCT FROM NEW.subscription_id AND
    OLD.variant_id IS NOT DISTINCT FROM NEW.variant_id AND
    OLD.subscription_created_at IS NOT DISTINCT FROM NEW.subscription_created_at AND
    OLD.subscription_updated_at IS NOT DISTINCT FROM NEW.subscription_updated_at AND
    OLD.subscription_expires_at IS NOT DISTINCT FROM NEW.subscription_expires_at AND
    OLD.subscription_period_start IS NOT DISTINCT FROM NEW.subscription_period_start AND
    OLD.subscription_period_end IS NOT DISTINCT FROM NEW.subscription_period_end AND
    OLD.last_counter_reset IS NOT DISTINCT FROM NEW.last_counter_reset AND
    OLD.lemon_squeezy_customer_email IS NOT DISTINCT FROM NEW.lemon_squeezy_customer_email AND
    -- Prevent role escalation
    OLD.role IS NOT DISTINCT FROM NEW.role
  );

-- Policy 2: Service role can update subscription fields (for webhooks)
CREATE POLICY "Service role can update subscription fields"
  ON users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 3: Admin users can update any user (for support)
CREATE POLICY "Admins can update any user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================
-- Step 3: Add column-level security comments
-- ============================================
COMMENT ON COLUMN users.subscription_tier IS
  'PROTECTED: Can only be updated by service_role (webhooks) or admins';
COMMENT ON COLUMN users.subscription_status IS
  'PROTECTED: Can only be updated by service_role (webhooks) or admins';
COMMENT ON COLUMN users.simulation_limit IS
  'PROTECTED: Can only be updated by service_role (webhooks) or admins';
COMMENT ON COLUMN users.simulations_used_this_month IS
  'PROTECTED: Can only be updated by database functions with auth checks';
COMMENT ON COLUMN users.free_simulations_used IS
  'PROTECTED: Can only be updated by database functions with auth checks';
COMMENT ON COLUMN users.role IS
  'PROTECTED: Can only be updated by service_role or admins';

-- ============================================
-- Step 4: Create audit trigger for subscription changes
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  changed_by UUID,
  changed_by_role TEXT,
  old_tier TEXT,
  new_tier TEXT,
  old_status TEXT,
  new_status TEXT,
  old_limit INTEGER,
  new_limit INTEGER,
  old_counter INTEGER,
  new_counter INTEGER,
  change_source TEXT, -- 'webhook', 'admin', 'function'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_user ON subscription_change_audit(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_changed_by ON subscription_change_audit(changed_by, created_at);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only audit if subscription fields actually changed
  IF (
    OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier OR
    OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR
    OLD.simulation_limit IS DISTINCT FROM NEW.simulation_limit OR
    OLD.simulations_used_this_month IS DISTINCT FROM NEW.simulations_used_this_month
  ) THEN
    INSERT INTO subscription_change_audit (
      user_id,
      changed_by,
      changed_by_role,
      old_tier,
      new_tier,
      old_status,
      new_status,
      old_limit,
      new_limit,
      old_counter,
      new_counter,
      change_source
    ) VALUES (
      NEW.id,
      auth.uid(),
      (SELECT role FROM users WHERE id = auth.uid()),
      OLD.subscription_tier,
      NEW.subscription_tier,
      OLD.subscription_status,
      NEW.subscription_status,
      OLD.simulation_limit,
      NEW.simulation_limit,
      OLD.simulations_used_this_month,
      NEW.simulations_used_this_month,
      CASE
        WHEN auth.uid() IS NULL THEN 'webhook'
        WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'admin' THEN 'admin'
        ELSE 'function'
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS audit_subscription_changes_trigger ON users;
CREATE TRIGGER audit_subscription_changes_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION audit_subscription_changes();

-- ============================================
-- Step 5: Verification queries
-- ============================================

-- Test 1: List all policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Test 2: Verify protected columns
SELECT
  column_name,
  col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) as comment
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'subscription_tier',
    'subscription_status',
    'simulation_limit',
    'simulations_used_this_month',
    'role'
  )
ORDER BY column_name;

-- Test 3: Check audit table exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'subscription_change_audit'
ORDER BY ordinal_position;
