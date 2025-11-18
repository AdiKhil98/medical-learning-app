-- CRITICAL FIX: Prevent concurrent simulation sessions
-- Migration: fix_concurrent_sessions
-- Date: 2025-11-18
-- Issue: Users can have multiple active simulations simultaneously

-- ============================================
-- VULNERABILITY (Before Fix)
-- ============================================
-- User can:
-- 1. Start simulation A
-- 2. Start simulation B (without finishing A)
-- 3. Both could count toward usage if they exceed 10 minutes
-- 4. User could game the system by running multiple simulations in parallel
-- 5. Counter could be incremented multiple times simultaneously

-- ============================================
-- Fix: Auto-end previous sessions when starting new one
-- ============================================
CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text,
  p_session_token text
)
RETURNS json AS $$
DECLARE
  v_session_id uuid;
  v_active_session_count integer;
  v_previous_sessions text[];
BEGIN
  -- CRITICAL: Verify caller owns this user_id
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot start simulation for other users'
      USING HINT = 'You can only start your own simulations';
  END IF;

  -- CRITICAL: Check for active sessions (sessions without ended_at)
  -- Lock the user row to prevent race conditions
  SELECT COUNT(*)
  INTO v_active_session_count
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND ended_at IS NULL
  FOR UPDATE;

  -- If user has active sessions, auto-end them
  IF v_active_session_count > 0 THEN
    -- Get list of active session tokens for logging
    SELECT ARRAY_AGG(session_token)
    INTO v_previous_sessions
    FROM simulation_usage_logs
    WHERE user_id = p_user_id
      AND ended_at IS NULL;

    -- Auto-end all previous active sessions
    -- Calculate duration and mark as counted if >= 10 minutes
    UPDATE simulation_usage_logs
    SET
      ended_at = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer,
      counted_toward_usage = CASE
        WHEN EXTRACT(EPOCH FROM (now() - started_at))::integer >= 600 THEN true
        ELSE false
      END,
      updated_at = now()
    WHERE user_id = p_user_id
      AND ended_at IS NULL;

    -- Log the auto-end action
    RAISE NOTICE 'Auto-ended % active session(s) for user %: %',
      v_active_session_count, p_user_id, v_previous_sessions;
  END IF;

  -- Create new session
  INSERT INTO simulation_usage_logs (
    user_id,
    simulation_type,
    session_token,
    started_at
  )
  VALUES (
    p_user_id,
    p_simulation_type,
    p_session_token,
    now()
  )
  RETURNING id INTO v_session_id;

  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'session_token', p_session_token,
    'started_at', now(),
    'previous_sessions_ended', COALESCE(v_active_session_count, 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION start_simulation_session(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_simulation_session(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION start_simulation_session(uuid, text, text) IS
'Starts a new simulation session. Auto-ends any previous active sessions to prevent concurrent simulations.';

-- ============================================
-- Add database constraint for extra safety
-- ============================================
-- Create a unique partial index to prevent multiple active sessions
-- This ensures at database level that a user can only have ONE active session
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_user
  ON simulation_usage_logs (user_id)
  WHERE ended_at IS NULL;

COMMENT ON INDEX idx_one_active_session_per_user IS
'CONSTRAINT: Ensures a user can only have ONE active simulation session at a time. Active = ended_at IS NULL.';

-- ============================================
-- Optional: Add session monitoring view
-- ============================================
CREATE OR REPLACE VIEW active_simulation_sessions AS
SELECT
  user_id,
  simulation_type,
  session_token,
  started_at,
  EXTRACT(EPOCH FROM (now() - started_at))::integer as elapsed_seconds,
  CASE
    WHEN EXTRACT(EPOCH FROM (now() - started_at))::integer >= 600 THEN '✅ Will count'
    ELSE '❌ Too short'
  END as will_count_status
FROM simulation_usage_logs
WHERE ended_at IS NULL
ORDER BY started_at DESC;

COMMENT ON VIEW active_simulation_sessions IS
'Shows all currently active simulation sessions (not yet ended)';

-- ============================================
-- Verification Queries
-- ============================================

-- Test 1: Check unique index exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_one_active_session_per_user';

-- Test 2: Count active sessions per user (should all be 0 or 1)
SELECT
  user_id,
  COUNT(*) as active_sessions,
  CASE
    WHEN COUNT(*) > 1 THEN '❌ MULTIPLE ACTIVE (VIOLATION!)'
    WHEN COUNT(*) = 1 THEN '✅ One active'
    ELSE '✅ None active'
  END as status
FROM simulation_usage_logs
WHERE ended_at IS NULL
GROUP BY user_id
HAVING COUNT(*) > 1;  -- Show only violations

-- Expected: Empty result (no violations)

-- Test 3: View active sessions
SELECT * FROM active_simulation_sessions;
