-- Security measures for simulation tracking
-- Server-side validation to prevent client-side manipulation

-- Add columns for security tracking
ALTER TABLE simulation_usage_logs ADD COLUMN IF NOT EXISTS client_ip inet;
ALTER TABLE simulation_usage_logs ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE simulation_usage_logs ADD COLUMN IF NOT EXISTS browser_fingerprint text;
ALTER TABLE simulation_usage_logs ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz;
ALTER TABLE simulation_usage_logs ADD COLUMN IF NOT EXISTS heartbeat_count integer DEFAULT 0;

-- Function to validate if enough time has passed for marking as used
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

-- Secure function to mark simulation as used with server-side validation
CREATE OR REPLACE FUNCTION mark_simulation_used_secure(
  p_session_token text,
  p_user_id uuid,
  p_client_reported_elapsed integer DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_validation_result json;
  v_session_id uuid;
  v_server_elapsed integer;
  v_marked_at timestamptz := now();
BEGIN
  -- First validate server-side timing
  SELECT validate_simulation_usage(p_session_token, p_user_id) INTO v_validation_result;
  
  IF NOT (v_validation_result->>'valid')::boolean THEN
    -- Log suspicious activity if client reported much different time
    IF p_client_reported_elapsed IS NOT NULL THEN
      v_server_elapsed := (v_validation_result->>'elapsed_seconds')::integer;
      
      -- If client reported time is significantly different from server time, flag it
      IF abs(p_client_reported_elapsed - COALESCE(v_server_elapsed, 0)) > 30 THEN
        INSERT INTO simulation_abuse_detection (user_id, time_manipulation_attempts, last_suspicious_activity, admin_notes)
        VALUES (
          p_user_id,
          1,
          now(),
          format('Client reported %s seconds but server calculated %s seconds', p_client_reported_elapsed, v_server_elapsed)
        )
        ON CONFLICT (user_id) DO UPDATE SET
          time_manipulation_attempts = simulation_abuse_detection.time_manipulation_attempts + 1,
          last_suspicious_activity = now(),
          admin_notes = COALESCE(simulation_abuse_detection.admin_notes, '') || '; ' || EXCLUDED.admin_notes;
      END IF;
    END IF;
    
    RETURN v_validation_result;
  END IF;
  
  v_session_id := (v_validation_result->>'session_id')::uuid;
  v_server_elapsed := (v_validation_result->>'elapsed_seconds')::integer;
  
  -- Mark as used with server-validated timing
  UPDATE simulation_usage_logs
  SET 
    status = 'used',
    marked_used_at = v_marked_at,
    duration_seconds = v_server_elapsed
  WHERE session_token = p_session_token
  AND user_id = p_user_id
  AND status = 'started';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'update_failed',
      'message', 'Failed to update session status'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'marked_at', v_marked_at,
    'server_elapsed_seconds', v_server_elapsed,
    'client_elapsed_seconds', p_client_reported_elapsed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create abuse detection table if it doesn't exist
CREATE TABLE IF NOT EXISTS simulation_abuse_detection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Abuse counters
  rapid_session_count integer DEFAULT 0,
  page_refresh_count integer DEFAULT 0,
  duplicate_token_attempts integer DEFAULT 0,
  time_manipulation_attempts integer DEFAULT 0,
  multiple_tab_attempts integer DEFAULT 0,
  
  -- Tracking
  detection_window_start timestamptz DEFAULT now(),
  last_suspicious_activity timestamptz DEFAULT now(),
  
  -- Admin actions
  is_flagged boolean DEFAULT false,
  is_temporarily_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Function for heartbeat validation (prevents pause/resume attacks)
CREATE OR REPLACE FUNCTION update_session_heartbeat(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_session simulation_usage_logs%ROWTYPE;
  v_time_since_last_heartbeat integer;
BEGIN
  -- Get current session
  SELECT * INTO v_session
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
  AND user_id = p_user_id
  AND status IN ('started', 'in_progress');
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'session_not_found'
    );
  END IF;
  
  -- Check time since last heartbeat (detect if session was paused)
  IF v_session.last_heartbeat IS NOT NULL THEN
    v_time_since_last_heartbeat := EXTRACT(EPOCH FROM (now() - v_session.last_heartbeat));
    
    -- If more than 2 minutes since last heartbeat, flag as suspicious
    IF v_time_since_last_heartbeat > 120 THEN
      INSERT INTO simulation_abuse_detection (user_id, admin_notes)
      VALUES (
        p_user_id,
        format('Long gap in heartbeat: %s seconds', v_time_since_last_heartbeat)
      )
      ON CONFLICT (user_id) DO UPDATE SET
        admin_notes = COALESCE(simulation_abuse_detection.admin_notes, '') || '; ' || EXCLUDED.admin_notes,
        last_suspicious_activity = now();
    END IF;
  END IF;
  
  -- Update heartbeat
  UPDATE simulation_usage_logs
  SET 
    last_heartbeat = now(),
    heartbeat_count = heartbeat_count + 1
  WHERE session_token = p_session_token
  AND user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'heartbeat_updated', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic cleanup function for abandoned sessions
CREATE OR REPLACE FUNCTION cleanup_abandoned_sessions()
RETURNS integer AS $$
DECLARE
  v_cleaned_count integer;
BEGIN
  -- Mark sessions as incomplete if they've been started for more than 30 minutes without heartbeat
  UPDATE simulation_usage_logs
  SET status = 'incomplete'
  WHERE status IN ('started', 'in_progress')
  AND started_at < now() - interval '30 minutes'
  AND (last_heartbeat IS NULL OR last_heartbeat < now() - interval '5 minutes');
  
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  
  RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on abuse detection table
ALTER TABLE simulation_abuse_detection ENABLE ROW LEVEL SECURITY;

-- RLS policy (admin-only access)
CREATE POLICY "Only admins can access abuse detection data"
  ON simulation_abuse_detection
  FOR ALL
  TO authenticated
  USING (false); -- Users cannot access, only service role

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulation_logs_heartbeat ON simulation_usage_logs(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_simulation_logs_client_ip ON simulation_usage_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_abuse_detection_flagged ON simulation_abuse_detection(is_flagged, last_suspicious_activity);

COMMIT;