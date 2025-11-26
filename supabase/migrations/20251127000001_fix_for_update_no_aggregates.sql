-- Migration: Fix FOR UPDATE with NO aggregate functions at all
-- Date: 2025-11-27
-- Issue: PostgreSQL error "FOR UPDATE is not allowed with aggregate functions"
--
-- BETTER FIX: Avoid ALL aggregate functions (COUNT, ARRAY_AGG, etc.)
-- Use UPDATE with RETURNING to get the affected rows

CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text,
  p_session_token text
)
RETURNS json AS $$
DECLARE
  v_session_id uuid;
  v_active_session_count integer := 0;
  v_token_expiry timestamptz;
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

  -- Set token expiry to 30 minutes from now
  v_token_expiry := now() + INTERVAL '30 minutes';

  -- CRITICAL FIX: Use UPDATE + GET DIAGNOSTICS instead of SELECT FOR UPDATE
  -- This completely avoids aggregate functions and still provides atomic operation

  -- Auto-end all previous active sessions
  UPDATE simulation_usage_logs
  SET
    ended_at = now(),
    duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer,
    counted_toward_usage = CASE
      WHEN EXTRACT(EPOCH FROM (now() - started_at))::integer >= 300 THEN true
      ELSE false
    END,
    updated_at = now()
  WHERE user_id = p_user_id
    AND ended_at IS NULL;

  -- Get count of ended sessions (no aggregates, no FOR UPDATE)
  GET DIAGNOSTICS v_active_session_count = ROW_COUNT;

  -- Log the auto-end action if any sessions were ended
  IF v_active_session_count > 0 THEN
    RAISE NOTICE 'Auto-ended % active session(s) for user %',
      v_active_session_count, p_user_id;
  END IF;

  -- Create new session with token expiry
  INSERT INTO simulation_usage_logs (
    user_id,
    simulation_type,
    session_token,
    started_at,
    token_expires_at
  )
  VALUES (
    p_user_id,
    p_simulation_type,
    p_session_token,
    now(),
    v_token_expiry
  )
  RETURNING id INTO v_session_id;

  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'session_token', p_session_token,
    'started_at', now(),
    'token_expires_at', v_token_expiry,
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

COMMENT ON FUNCTION start_simulation_session IS 'Start a new simulation session. Auto-ends any active sessions. Uses UPDATE RETURNING to avoid FOR UPDATE with aggregates.';
