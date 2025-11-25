-- Migration: Add session token expiry
-- Date: 2025-11-25
-- Issue: Session tokens never expire, allowing indefinite replay attacks
--
-- VULNERABILITY (Before Fix):
-- - Tokens generated with crypto.randomUUID() are secure BUT never expire
-- - Attacker who obtains token (browser dev tools, memory dump, logs) can replay it forever
-- - Token valid even hours/days after simulation ended
--
-- FIX: Add expiration timestamp and validate in all token-accepting functions

-- Add token expiry column
ALTER TABLE simulation_usage_logs
ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

-- Set expiry for existing tokens (30 minutes from started_at)
UPDATE simulation_usage_logs
SET token_expires_at = started_at + INTERVAL '30 minutes'
WHERE token_expires_at IS NULL;

-- Make column NOT NULL now that all rows have values
ALTER TABLE simulation_usage_logs
ALTER COLUMN token_expires_at SET NOT NULL;

-- Set default for new rows (30 minutes from creation)
ALTER TABLE simulation_usage_logs
ALTER COLUMN token_expires_at SET DEFAULT (now() + INTERVAL '30 minutes');

-- Add index for efficient expiry lookups
CREATE INDEX IF NOT EXISTS idx_simulation_logs_token_expiry
  ON simulation_usage_logs(token_expires_at)
  WHERE ended_at IS NULL;

COMMENT ON COLUMN simulation_usage_logs.token_expires_at IS 'Token expiry timestamp. Tokens expire 30 minutes after session creation to prevent replay attacks.';

-- Update start_simulation_session to set token expiry
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
  -- Simulations should not exceed 20 minutes, so 30 min provides buffer
  v_token_expiry := now() + INTERVAL '30 minutes';

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

-- Update mark_simulation_counted to validate token expiry
CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_started_at timestamptz;
  v_elapsed_seconds integer;
  v_subscription_tier text;
  v_updated_count integer;
  v_token_expiry timestamptz;
BEGIN
  -- SECURITY: Validate token expiry BEFORE processing
  SELECT token_expires_at
  INTO v_token_expiry
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  IF v_token_expiry IS NOT NULL AND v_token_expiry < now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session token expired',
      'expired_at', v_token_expiry
    );
  END IF;

  -- ATOMIC TEST-AND-SET: Update only if not already counted
  -- This prevents race conditions by combining the check and update in one operation
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND counted_toward_usage = false  -- CRITICAL: Only update if not already counted
    AND token_expires_at > now()  -- Revalidate expiry atomically
  RETURNING
    started_at,
    EXTRACT(EPOCH FROM (now() - started_at))::integer
  INTO
    v_started_at,
    v_elapsed_seconds;

  -- Check if UPDATE succeeded (v_started_at will be NULL if no rows updated)
  IF v_started_at IS NULL THEN
    -- Either session not found OR already counted OR token expired
    -- Try to get session info to determine which
    SELECT started_at, counted_toward_usage, token_expires_at
    INTO v_started_at, v_updated_count, v_token_expiry
    FROM simulation_usage_logs
    WHERE session_token = p_session_token
      AND user_id = p_user_id;

    IF v_started_at IS NULL THEN
      -- Session not found
      RETURN json_build_object(
        'success', false,
        'error', 'Session not found'
      );
    ELSIF v_token_expiry < now() THEN
      -- Token expired
      RETURN json_build_object(
        'success', false,
        'error', 'Session token expired',
        'expired_at', v_token_expiry
      );
    ELSE
      -- Session exists but was already counted (race condition prevented!)
      RETURN json_build_object(
        'success', true,
        'already_counted', true,
        'message', 'Simulation already counted (prevented double-count)'
      );
    END IF;
  END IF;

  -- Verify elapsed time is at least 5 minutes (300 seconds)
  IF v_elapsed_seconds < 300 THEN
    -- This shouldn't happen if frontend is correct, but safety check
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 300
    );
  END IF;

  -- Get subscription tier for counter increment
  SELECT subscription_tier INTO v_subscription_tier
  FROM users
  WHERE id = p_user_id;

  -- ATOMIC: Increment user's counter
  -- Only reaches here if the UPDATE above succeeded (counted_toward_usage was false)
  UPDATE users
  SET
    simulations_used_this_month = CASE
      WHEN v_subscription_tier IS NOT NULL AND v_subscription_tier != ''
      THEN simulations_used_this_month + 1
      ELSE simulations_used_this_month
    END,
    free_simulations_used = CASE
      WHEN v_subscription_tier IS NULL OR v_subscription_tier = ''
      THEN free_simulations_used + 1
      ELSE free_simulations_used
    END
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'counted', true,
    'elapsed_seconds', v_elapsed_seconds,
    'message', 'Simulation marked as counted'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update end_simulation_session to validate token expiry
CREATE OR REPLACE FUNCTION end_simulation_session(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_started_at timestamptz;
  v_ended_at timestamptz := now();
  v_duration_seconds integer;
  v_should_count boolean;
  v_subscription_tier text;
  v_was_already_counted boolean;
  v_token_expiry timestamptz;
BEGIN
  -- Get session info and check if already counted
  SELECT started_at, counted_toward_usage, ended_at, token_expires_at
  INTO v_started_at, v_was_already_counted, v_ended_at, v_token_expiry
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  IF v_started_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- SECURITY: Validate token expiry
  IF v_token_expiry IS NOT NULL AND v_token_expiry < now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session token expired',
      'expired_at', v_token_expiry
    );
  END IF;

  -- If session already ended, return success (idempotent)
  IF v_ended_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'already_ended', true,
      'message', 'Session already ended'
    );
  END IF;

  -- Calculate duration based on server time
  v_duration_seconds := EXTRACT(EPOCH FROM (now() - v_started_at))::integer;

  -- Determine if simulation should count (>= 5 minutes = 300 seconds)
  v_should_count := v_duration_seconds >= 300;

  -- Update session with end time and duration
  UPDATE simulation_usage_logs
  SET
    ended_at = now(),
    duration_seconds = v_duration_seconds,
    counted_toward_usage = v_should_count,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND ended_at IS NULL
    AND token_expires_at > now();  -- Revalidate expiry

  -- ATOMIC: Increment counter ONLY if:
  -- 1. Simulation should count (>= 5 min)
  -- 2. Was NOT already counted by mark_simulation_counted()
  IF v_should_count AND NOT v_was_already_counted THEN
    -- Get subscription tier
    SELECT subscription_tier INTO v_subscription_tier
    FROM users
    WHERE id = p_user_id;

    -- Increment the appropriate counter
    UPDATE users
    SET
      simulations_used_this_month = CASE
        WHEN v_subscription_tier IS NOT NULL AND v_subscription_tier != ''
        THEN simulations_used_this_month + 1
        ELSE simulations_used_this_month
      END,
      free_simulations_used = CASE
        WHEN v_subscription_tier IS NULL OR v_subscription_tier = ''
        THEN free_simulations_used + 1
        ELSE free_simulations_used
      END
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'duration_seconds', v_duration_seconds,
    'counted_toward_usage', v_should_count,
    'was_already_counted', v_was_already_counted,
    'message', CASE
      WHEN v_should_count AND NOT v_was_already_counted THEN 'Simulation completed and counted (>= 5 minutes)'
      WHEN v_should_count AND v_was_already_counted THEN 'Simulation completed (already counted at 5-min mark)'
      ELSE 'Simulation ended but not counted (< 5 minutes)'
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function: Delete expired session tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_session_tokens()
RETURNS json AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete sessions that:
  -- 1. Have expired tokens (token_expires_at < now())
  -- 2. Are already ended (ended_at IS NOT NULL)
  -- 3. Are older than 7 days (to keep recent history)
  DELETE FROM simulation_usage_logs
  WHERE token_expires_at < now()
    AND ended_at IS NOT NULL
    AND ended_at < now() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'message', format('Cleaned up %s expired session tokens', v_deleted_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_session_tokens IS 'Deletes expired session tokens older than 7 days. Run periodically via cron.';

GRANT EXECUTE ON FUNCTION cleanup_expired_session_tokens TO authenticated;
