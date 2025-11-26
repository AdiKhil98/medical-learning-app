-- Migration: Fix FOR UPDATE with aggregate function bug
-- Date: 2025-11-27
-- Issue: PostgreSQL error "FOR UPDATE is not allowed with aggregate functions"
--
-- BUG: start_simulation_session uses COUNT(*) with FOR UPDATE, which is not allowed
-- FIX: Split into two queries - lock rows first, then count

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

  -- CRITICAL FIX: Lock rows FIRST (without aggregate), THEN count
  -- This prevents "FOR UPDATE is not allowed with aggregate functions" error

  -- Step 1: Get array of active sessions AND lock those rows
  SELECT ARRAY_AGG(session_token)
  INTO v_previous_sessions
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND ended_at IS NULL
  FOR UPDATE;  -- Lock the rows to prevent race conditions

  -- Step 2: Count the sessions (safe now that rows are locked)
  -- Use array length instead of COUNT to avoid aggregate issue
  v_active_session_count := COALESCE(array_length(v_previous_sessions, 1), 0);

  -- If user has active sessions, auto-end them
  IF v_active_session_count > 0 THEN
    -- Auto-end all previous active sessions
    -- Calculate duration and mark as counted if >= 5 minutes (300 seconds)
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

    -- Log the auto-end action
    RAISE NOTICE 'Auto-ended % active session(s) for user %: %',
      v_active_session_count, p_user_id, v_previous_sessions;
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
    'previous_sessions_ended', v_active_session_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION start_simulation_session IS 'Start a new simulation session. Auto-ends any active sessions. Fixed FOR UPDATE with aggregates bug.';
