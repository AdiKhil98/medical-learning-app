-- CRITICAL SECURITY FIX: Add authorization checks to increment functions
-- Migration: fix_function_authorization
-- Date: 2025-11-18
-- Issue: Functions lack auth checks - users can manipulate other users' counters

-- ============================================
-- Fix increment_free_simulations
-- ============================================
CREATE OR REPLACE FUNCTION increment_free_simulations(user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER := 3;
BEGIN
  -- CRITICAL: Verify caller owns this user_id
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify other users data'
      USING HINT = 'You can only increment your own simulation counter';
  END IF;

  -- Lock the row to prevent race conditions (will be fixed in next migration)
  SELECT free_simulations_used
  INTO v_current_count
  FROM users
  WHERE id = user_id
  FOR UPDATE;

  -- Validate limit before increment
  IF v_current_count >= v_limit THEN
    RETURN json_build_object(
      'success', false,
      'error', 'limit_reached',
      'message', 'You have used all 3 free simulations',
      'current_count', v_current_count,
      'limit', v_limit
    );
  END IF;

  -- Atomic increment with auth check
  UPDATE users
  SET free_simulations_used = free_simulations_used + 1
  WHERE id = user_id
    AND id = auth.uid();  -- Double-check authorization

  -- Get updated count
  SELECT free_simulations_used
  INTO v_current_count
  FROM users
  WHERE id = user_id;

  RETURN json_build_object(
    'success', true,
    'new_count', v_current_count,
    'remaining', v_limit - v_current_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION increment_free_simulations(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_free_simulations(UUID) TO authenticated;

COMMENT ON FUNCTION increment_free_simulations(UUID) IS
'Securely increments free simulations counter. Includes authorization check to prevent abuse.';

-- ============================================
-- Fix increment_monthly_simulations
-- ============================================
CREATE OR REPLACE FUNCTION increment_monthly_simulations(user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_tier TEXT;
  v_status TEXT;
BEGIN
  -- CRITICAL: Verify caller owns this user_id
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify other users data'
      USING HINT = 'You can only increment your own simulation counter';
  END IF;

  -- Lock the row and get subscription info
  SELECT
    simulations_used_this_month,
    simulation_limit,
    subscription_tier,
    subscription_status
  INTO v_current_count, v_limit, v_tier, v_status
  FROM users
  WHERE id = user_id
  FOR UPDATE;

  -- Verify subscription is active
  IF v_status NOT IN ('active', 'on_trial', 'past_due') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'subscription_inactive',
      'message', 'Your subscription is not active',
      'status', v_status
    );
  END IF;

  -- Skip limit check for unlimited tier
  IF v_tier != 'unlimited' THEN
    -- Validate limit before increment
    IF v_current_count >= v_limit THEN
      RETURN json_build_object(
        'success', false,
        'error', 'limit_reached',
        'message', 'You have used all your monthly simulations',
        'current_count', v_current_count,
        'limit', v_limit
      );
    END IF;
  END IF;

  -- Atomic increment with auth check
  UPDATE users
  SET simulations_used_this_month = simulations_used_this_month + 1
  WHERE id = user_id
    AND id = auth.uid();  -- Double-check authorization

  -- Get updated count
  SELECT simulations_used_this_month
  INTO v_current_count
  FROM users
  WHERE id = user_id;

  RETURN json_build_object(
    'success', true,
    'new_count', v_current_count,
    'remaining', CASE
      WHEN v_tier = 'unlimited' THEN 999999
      ELSE v_limit - v_current_count
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION increment_monthly_simulations(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_monthly_simulations(UUID) TO authenticated;

COMMENT ON FUNCTION increment_monthly_simulations(UUID) IS
'Securely increments monthly simulations counter. Includes authorization and limit checks.';

-- ============================================
-- Audit logging for security
-- ============================================
CREATE TABLE IF NOT EXISTS function_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  called_by UUID,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON function_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_caller ON function_audit_log(called_by, created_at);

-- Add audit trigger
CREATE OR REPLACE FUNCTION log_function_call()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO function_audit_log (function_name, user_id, called_by, success)
  VALUES (TG_ARGV[0], NEW.id, auth.uid(), true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verification queries
-- ============================================

-- Test 1: Verify function has SECURITY DEFINER
SELECT
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_mode
FROM pg_proc p
WHERE p.proname IN ('increment_free_simulations', 'increment_monthly_simulations');

-- Test 2: Verify grants are correct
SELECT
  p.proname as function_name,
  r.rolname as granted_to
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_proc_acl pa ON p.oid = pa.fnid
LEFT JOIN pg_roles r ON pa.grantee = r.oid
WHERE p.proname IN ('increment_free_simulations', 'increment_monthly_simulations')
  AND n.nspname = 'public';
