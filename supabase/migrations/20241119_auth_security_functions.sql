-- Authentication Security Functions Migration
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. ADMIN ROLE VERIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_admin_role()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('is_admin', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_role
  FROM users
  WHERE id = v_user_id;

  IF v_role IS NULL THEN
    RETURN json_build_object('is_admin', false, 'error', 'User not found');
  END IF;

  RETURN json_build_object('is_admin', v_role = 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION verify_admin_role() TO authenticated;

-- ============================================================================
-- 2. SERVER-SIDE PASSWORD VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_password_strength(p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_errors TEXT[] := '{}';
  v_is_valid BOOLEAN := true;
BEGIN
  -- Check minimum length (8 characters)
  IF length(p_password) < 8 THEN
    v_errors := array_append(v_errors, 'Password must be at least 8 characters');
    v_is_valid := false;
  END IF;

  -- Check for uppercase letter
  IF p_password !~ '[A-Z]' THEN
    v_errors := array_append(v_errors, 'Password must contain at least one uppercase letter');
    v_is_valid := false;
  END IF;

  -- Check for lowercase letter
  IF p_password !~ '[a-z]' THEN
    v_errors := array_append(v_errors, 'Password must contain at least one lowercase letter');
    v_is_valid := false;
  END IF;

  -- Check for number
  IF p_password !~ '[0-9]' THEN
    v_errors := array_append(v_errors, 'Password must contain at least one number');
    v_is_valid := false;
  END IF;

  -- Check for special character
  IF p_password !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?]' THEN
    v_errors := array_append(v_errors, 'Password must contain at least one special character');
    v_is_valid := false;
  END IF;

  -- Check against common passwords (basic list)
  IF lower(p_password) IN ('password', '12345678', 'qwertyui', 'admin123', 'letmein1') THEN
    v_errors := array_append(v_errors, 'Password is too common');
    v_is_valid := false;
  END IF;

  RETURN json_build_object(
    'is_valid', v_is_valid,
    'errors', v_errors
  );
END;
$$;

-- Allow anonymous users to validate passwords during registration
GRANT EXECUTE ON FUNCTION validate_password_strength(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_password_strength(TEXT) TO authenticated;

-- ============================================================================
-- 3. RATE LIMITING TABLE AND FUNCTIONS
-- ============================================================================

-- Create table to track login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT false,
  user_agent TEXT
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
ON login_attempts(email, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
ON login_attempts(ip_address, attempted_at DESC);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no direct user access)
CREATE POLICY "Service role only" ON login_attempts
  FOR ALL USING (false);

-- Function to check if login is rate limited
CREATE OR REPLACE FUNCTION check_login_rate_limit(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_count INT;
  v_lockout_until TIMESTAMPTZ;
  v_is_locked BOOLEAN := false;
  v_remaining_attempts INT;
  v_max_attempts INT := 5;
  v_lockout_duration INTERVAL := '30 minutes';
  v_window_duration INTERVAL := '15 minutes';
BEGIN
  -- Count failed attempts in the last window
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM login_attempts
  WHERE email = lower(p_email)
    AND success = false
    AND attempted_at > NOW() - v_window_duration;

  -- Check if account is locked (5+ failed attempts)
  IF v_attempt_count >= v_max_attempts THEN
    -- Find when lockout expires
    SELECT attempted_at + v_lockout_duration
    INTO v_lockout_until
    FROM login_attempts
    WHERE email = lower(p_email)
      AND success = false
    ORDER BY attempted_at DESC
    LIMIT 1;

    IF v_lockout_until > NOW() THEN
      v_is_locked := true;
    END IF;
  END IF;

  v_remaining_attempts := GREATEST(0, v_max_attempts - v_attempt_count);

  RETURN json_build_object(
    'allowed', NOT v_is_locked,
    'is_locked', v_is_locked,
    'attempt_count', v_attempt_count,
    'remaining_attempts', v_remaining_attempts,
    'lockout_until', v_lockout_until,
    'message', CASE
      WHEN v_is_locked THEN 'Konto temporär gesperrt. Versuchen Sie es später erneut.'
      WHEN v_remaining_attempts <= 2 THEN 'Warnung: ' || v_remaining_attempts || ' Versuche verbleibend'
      ELSE NULL
    END
  );
END;
$$;

-- Function to record a login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email TEXT,
  p_success BOOLEAN,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  -- Insert the attempt
  INSERT INTO login_attempts (email, ip_address, success, user_agent)
  VALUES (lower(p_email), p_ip_address, p_success, p_user_agent)
  RETURNING id INTO v_attempt_id;

  -- If successful, we could clear old failed attempts (optional)
  -- This is commented out to maintain audit trail
  -- IF p_success THEN
  --   DELETE FROM login_attempts
  --   WHERE email = lower(p_email)
  --     AND success = false
  --     AND attempted_at < NOW() - INTERVAL '24 hours';
  -- END IF;

  RETURN json_build_object(
    'success', true,
    'attempt_id', v_attempt_id
  );
END;
$$;

-- Cleanup old login attempts (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM login_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

-- Grant execute to anon for rate limiting checks (before login)
GRANT EXECUTE ON FUNCTION check_login_rate_limit(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, BOOLEAN, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 4. UPDATE LAST ACTIVITY (for session management)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_last_activity(user_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET last_activity_at = NOW()
  WHERE id = user_id_input;
END;
$$;

GRANT EXECUTE ON FUNCTION update_last_activity(UUID) TO authenticated;

-- ============================================================================
-- 5. ACCOUNT LOCKOUT FUNCTION (called from client on too many failures)
-- ============================================================================

CREATE OR REPLACE FUNCTION lock_account_temporarily(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM users
  WHERE lower(email) = lower(p_email);

  IF v_user_id IS NULL THEN
    -- Don't reveal if user exists
    RETURN json_build_object('success', true);
  END IF;

  -- Update user's locked status
  UPDATE users
  SET
    account_locked_until = NOW() + INTERVAL '30 minutes',
    failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'locked_until', NOW() + INTERVAL '30 minutes'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION lock_account_temporarily(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lock_account_temporarily(TEXT) TO authenticated;
