-- Update validation function for 30-second testing
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION validate_simulation_usage(
  p_session_token text,
  p_user_id uuid,
  p_min_elapsed_seconds integer DEFAULT 30 -- 30 seconds for testing
)
RETURNS json AS $$
DECLARE
  v_session simulation_usage_logs%ROWTYPE;
  v_elapsed_seconds integer;
  v_now timestamptz := now();
BEGIN
  -- Get the session
  SELECT * INTO v_session
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
  AND user_id = p_user_id
  AND status = 'started';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'session_not_found',
      'message', 'Session not found or not in started state'
    );
  END IF;

  -- Calculate elapsed time based on server time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_session.started_at));

  -- Check if minimum time has elapsed
  IF v_elapsed_seconds < p_min_elapsed_seconds THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'insufficient_time',
      'message', format('Only %s seconds elapsed, need %s seconds', v_elapsed_seconds, p_min_elapsed_seconds),
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', p_min_elapsed_seconds
    );
  END IF;

  -- Valid - can mark as used
  RETURN json_build_object(
    'valid', true,
    'elapsed_seconds', v_elapsed_seconds,
    'session_id', v_session.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;