-- Migration: Add Registration Limit System
-- Date: 2026-01-04
-- Purpose: Create infrastructure for user registration limits (currently set to unlimited)
--
-- This migration creates:
-- 1. app_config table for storing configuration values
-- 2. waitlist table for future use when limits are enabled
-- 3. can_register_new_user function to check if registration is allowed
-- 4. get_active_user_count function for admin dashboards

-- ============================================
-- STEP 1: Create app_config table
-- ============================================

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Only admins can modify config, but all can read
CREATE POLICY "Anyone can read app_config" ON app_config
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify app_config" ON app_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default configuration
-- max_users = -1 means unlimited
INSERT INTO app_config (key, value, description) VALUES
  ('max_users', '-1', 'Maximum number of registered users allowed. -1 = unlimited'),
  ('registration_enabled', 'true', 'Whether new user registration is enabled')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_config IS 'Application configuration settings';

-- ============================================
-- STEP 2: Create waitlist table (for future use)
-- ============================================

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  reason TEXT,
  referral_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'registered', 'declined')),
  invited_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access waitlist
CREATE POLICY "Admins can manage waitlist" ON waitlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Allow anonymous users to insert (join waitlist)
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

COMMENT ON TABLE waitlist IS 'Waitlist for users when registration limit is reached';

-- ============================================
-- STEP 3: Create get_active_user_count function
-- ============================================

CREATE OR REPLACE FUNCTION get_active_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count users in auth.users table
  -- This counts all registered users regardless of email verification status
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM auth.users;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_active_user_count IS 'Returns the total count of registered users';

GRANT EXECUTE ON FUNCTION get_active_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_user_count() TO anon;

-- ============================================
-- STEP 4: Create can_register_new_user function
-- ============================================

CREATE OR REPLACE FUNCTION can_register_new_user()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_users INTEGER;
  v_current_count INTEGER;
  v_registration_enabled BOOLEAN;
  v_allowed BOOLEAN;
  v_message TEXT;
BEGIN
  -- Get configuration values
  SELECT
    COALESCE((SELECT value::INTEGER FROM app_config WHERE key = 'max_users'), -1),
    COALESCE((SELECT value::BOOLEAN FROM app_config WHERE key = 'registration_enabled'), true)
  INTO v_max_users, v_registration_enabled;

  -- Get current user count
  v_current_count := get_active_user_count();

  -- Check if registration is enabled
  IF NOT v_registration_enabled THEN
    v_allowed := false;
    v_message := 'Die Registrierung ist derzeit deaktiviert.';
  -- Check if unlimited (-1)
  ELSIF v_max_users = -1 THEN
    v_allowed := true;
    v_message := 'Registrierung ist offen.';
  -- Check if under limit
  ELSIF v_current_count < v_max_users THEN
    v_allowed := true;
    v_message := format('%s von %s Plätzen verfügbar.', v_max_users - v_current_count, v_max_users);
  -- Over limit
  ELSE
    v_allowed := false;
    v_message := format('Wir haben unser Limit von %s Beta-Nutzern erreicht. Bitte tragen Sie sich in die Warteliste ein.', v_max_users);
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'current_count', v_current_count,
    'max_users', CASE WHEN v_max_users = -1 THEN 999999 ELSE v_max_users END,
    'message', v_message,
    'is_unlimited', v_max_users = -1,
    'registration_enabled', v_registration_enabled
  );
END;
$$;

COMMENT ON FUNCTION can_register_new_user IS
'Checks if new user registration is allowed based on app configuration.
Returns JSON with:
- allowed: boolean indicating if registration is permitted
- current_count: current number of registered users
- max_users: maximum allowed users (999999 if unlimited)
- message: user-friendly message explaining the status
- is_unlimited: boolean indicating if there is no user limit
- registration_enabled: boolean indicating if registration is enabled';

-- Grant execute to both authenticated and anonymous users
-- (anonymous users need this during registration flow)
GRANT EXECUTE ON FUNCTION can_register_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION can_register_new_user() TO anon;

-- ============================================
-- STEP 5: Create helper function to update max users
-- ============================================

CREATE OR REPLACE FUNCTION set_max_users(p_limit INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if caller is admin
  SELECT role INTO v_user_role
  FROM users
  WHERE id = auth.uid();

  IF v_user_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only administrators can change user limits'
    );
  END IF;

  -- Update the limit (-1 for unlimited)
  UPDATE app_config
  SET
    value = p_limit::TEXT,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE key = 'max_users';

  IF NOT FOUND THEN
    INSERT INTO app_config (key, value, description, updated_by)
    VALUES ('max_users', p_limit::TEXT, 'Maximum number of registered users allowed. -1 = unlimited', auth.uid());
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_limit', p_limit,
    'is_unlimited', p_limit = -1
  );
END;
$$;

COMMENT ON FUNCTION set_max_users IS
'Admin function to set the maximum number of allowed users.
Pass -1 for unlimited registrations.
Examples:
- set_max_users(-1) = unlimited
- set_max_users(100) = limit to 100 users
- set_max_users(500) = limit to 500 users';

GRANT EXECUTE ON FUNCTION set_max_users(INTEGER) TO authenticated;

-- ============================================
-- STEP 6: Create function to toggle registration
-- ============================================

CREATE OR REPLACE FUNCTION set_registration_enabled(p_enabled BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if caller is admin
  SELECT role INTO v_user_role
  FROM users
  WHERE id = auth.uid();

  IF v_user_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only administrators can toggle registration'
    );
  END IF;

  -- Update the setting
  UPDATE app_config
  SET
    value = p_enabled::TEXT,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE key = 'registration_enabled';

  IF NOT FOUND THEN
    INSERT INTO app_config (key, value, description, updated_by)
    VALUES ('registration_enabled', p_enabled::TEXT, 'Whether new user registration is enabled', auth.uid());
  END IF;

  RETURN json_build_object(
    'success', true,
    'registration_enabled', p_enabled
  );
END;
$$;

COMMENT ON FUNCTION set_registration_enabled IS
'Admin function to enable or disable user registration completely.
Examples:
- set_registration_enabled(true) = allow registration
- set_registration_enabled(false) = disable registration';

GRANT EXECUTE ON FUNCTION set_registration_enabled(BOOLEAN) TO authenticated;

-- ============================================
-- STEP 7: Log migration completion
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registration Limit System Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Current Configuration:';
  RAISE NOTICE '  - max_users: UNLIMITED (-1)';
  RAISE NOTICE '  - registration_enabled: true';
  RAISE NOTICE '';
  RAISE NOTICE 'To change limits, use:';
  RAISE NOTICE '  - SELECT set_max_users(100);  -- Limit to 100';
  RAISE NOTICE '  - SELECT set_max_users(-1);   -- Unlimited';
  RAISE NOTICE '  - SELECT set_registration_enabled(false); -- Disable';
  RAISE NOTICE '========================================';
END $$;
