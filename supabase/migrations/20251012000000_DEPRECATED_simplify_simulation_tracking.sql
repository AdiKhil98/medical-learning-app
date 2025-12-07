-- Simplify simulation_usage_logs table structure
-- Focus on essential tracking: id, user_id, simulation_type, timing, and whether it counts

-- Drop existing table and recreate with simplified structure
DROP TABLE IF EXISTS simulation_usage_logs CASCADE;

CREATE TABLE simulation_usage_logs (
  -- Essential identifiers
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  simulation_type text NOT NULL CHECK (simulation_type IN ('kp', 'fsp')),

  -- Time tracking (the core of your requirement)
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,

  -- Simple status: did this simulation count toward usage?
  counted_toward_usage boolean DEFAULT false,

  -- Metadata
  session_token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Computed column helper: Check if simulation lasted >= 5 minutes (300 seconds)
-- This makes queries easier
CREATE OR REPLACE FUNCTION is_simulation_valid_duration(p_duration_seconds integer)
RETURNS boolean AS $$
BEGIN
  RETURN p_duration_seconds >= 300; -- 5 minutes = 300 seconds
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Simple function: Start a simulation session
CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text,
  p_session_token text
)
RETURNS json AS $$
DECLARE
  v_session_id uuid;
BEGIN
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
    'started_at', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function: End a simulation and determine if it counts
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
  v_current_counted boolean;
BEGIN
  -- Get session start time and current counted status
  SELECT started_at, counted_toward_usage
  INTO v_started_at, v_current_counted
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  IF v_started_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Calculate duration based on server time
  v_duration_seconds := EXTRACT(EPOCH FROM (v_ended_at - v_started_at))::integer;

  -- Determine if simulation should count (>= 5 minutes = 300 seconds)
  v_should_count := v_duration_seconds >= 300;

  -- Update session with end time and duration
  UPDATE simulation_usage_logs
  SET
    ended_at = v_ended_at,
    duration_seconds = v_duration_seconds,
    counted_toward_usage = v_should_count,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  -- If this session should count and wasn't already counted, increment user's counter
  IF v_should_count AND NOT v_current_counted THEN
    -- Increment the appropriate counter based on subscription tier
    UPDATE users
    SET
      simulations_used_this_month = CASE
        WHEN subscription_tier IS NOT NULL AND subscription_tier != ''
        THEN simulations_used_this_month + 1
        ELSE simulations_used_this_month
      END,
      free_simulations_used = CASE
        WHEN subscription_tier IS NULL OR subscription_tier = ''
        THEN free_simulations_used + 1
        ELSE free_simulations_used
      END
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'duration_seconds', v_duration_seconds,
    'counted_toward_usage', v_should_count,
    'message', CASE
      WHEN v_should_count THEN 'Simulation completed and counted (>= 5 minutes)'
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

-- Simple function: Mark simulation as counted at 5-minute mark (called from frontend timer)
CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_started_at timestamptz;
  v_elapsed_seconds integer;
  v_already_counted boolean;
  v_subscription_tier text;
BEGIN
  -- Get session details
  SELECT started_at, counted_toward_usage
  INTO v_started_at, v_already_counted
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  IF v_started_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Already counted? Don't double-count
  IF v_already_counted THEN
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted'
    );
  END IF;

  -- Calculate elapsed time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_started_at))::integer;

  -- Must be at least 5 minutes (300 seconds)
  IF v_elapsed_seconds < 300 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 300
    );
  END IF;

  -- Mark as counted
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = v_elapsed_seconds,
    updated_at = now()
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  -- Increment user's counter
  SELECT subscription_tier INTO v_subscription_tier
  FROM users
  WHERE id = p_user_id;

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

-- Enable Row Level Security
ALTER TABLE simulation_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own simulation logs
CREATE POLICY "Users can view their own simulation logs"
  ON simulation_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulation logs"
  ON simulation_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulation logs"
  ON simulation_usage_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX idx_simulation_logs_user_id ON simulation_usage_logs(user_id);
CREATE INDEX idx_simulation_logs_session_token ON simulation_usage_logs(session_token);
CREATE INDEX idx_simulation_logs_started_at ON simulation_usage_logs(started_at DESC);
CREATE INDEX idx_simulation_logs_counted ON simulation_usage_logs(counted_toward_usage);

-- View to easily see all counted simulations
CREATE OR REPLACE VIEW counted_simulations AS
SELECT
  id,
  user_id,
  simulation_type,
  started_at,
  ended_at,
  duration_seconds,
  ROUND(duration_seconds / 60.0, 1) as duration_minutes
FROM simulation_usage_logs
WHERE counted_toward_usage = true
ORDER BY started_at DESC;

COMMIT;
