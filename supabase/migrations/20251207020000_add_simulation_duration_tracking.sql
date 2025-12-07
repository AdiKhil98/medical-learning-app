-- ============================================
-- MIGRATION: Automatic Simulation Duration Tracking & Counting
-- Date: 2025-12-07
-- Purpose: Automatically calculate duration and determine if simulation counts
-- ============================================

-- This migration enhances the simulation_usage_logs table to automatically:
-- 1. Calculate duration when simulation ends
-- 2. Determine if it counts toward usage (>= 5 minutes)
-- 3. Update user quota accordingly

-- ============================================
-- PART 1: ENHANCE SIMULATION END TRACKING
-- ============================================

-- This trigger fires BEFORE updating simulation_usage_logs
-- It calculates duration and determines if simulation should count
CREATE OR REPLACE FUNCTION calculate_simulation_duration_and_counting()
RETURNS TRIGGER AS $$
DECLARE
  v_duration_seconds integer;
  v_should_count boolean;
BEGIN
  -- Only process when ended_at is being set (simulation ending)
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN

    -- Calculate duration in seconds
    v_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer;

    -- Set duration_seconds field
    NEW.duration_seconds := v_duration_seconds;

    -- Determine if simulation should count toward usage
    -- Threshold: 5 minutes (300 seconds) from constants
    v_should_count := v_duration_seconds >= 300;

    -- Set counted_toward_usage field
    NEW.counted_toward_usage := v_should_count;

    -- Log for debugging (will appear in Supabase logs)
    RAISE NOTICE 'Simulation ended: session=%, duration=%s, counts=%',
      NEW.session_token, v_duration_seconds, v_should_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_calculate_duration_before_update ON simulation_usage_logs;

-- Create trigger BEFORE update (so we can modify NEW before it's saved)
CREATE TRIGGER trg_calculate_duration_before_update
  BEFORE UPDATE ON simulation_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_simulation_duration_and_counting();

COMMENT ON FUNCTION calculate_simulation_duration_and_counting IS
'Automatically calculates simulation duration and determines if it should count toward usage (>= 5 minutes threshold).';

-- ============================================
-- PART 2: ENHANCED QUOTA UPDATE TRIGGER
-- ============================================

-- Update the quota trigger to be more explicit about duration checking
CREATE OR REPLACE FUNCTION trigger_update_quota_on_simulation_end()
RETURNS TRIGGER AS $$
DECLARE
  v_quota_result json;
BEGIN
  -- Only process when a simulation is being ended (ended_at is set from NULL to a value)
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN

    -- Check if simulation counts toward usage
    -- (This is now automatically set by calculate_simulation_duration_and_counting trigger)
    IF NEW.counted_toward_usage = true THEN

      -- Log the counting action
      RAISE NOTICE 'Counting simulation toward quota: user=%, session=%, duration=%s',
        NEW.user_id, NEW.session_token, NEW.duration_seconds;

      -- Update quota (via database function)
      SELECT record_simulation_usage(
        NEW.session_token,
        NEW.user_id,
        NEW.simulation_type,
        NEW.counted_toward_usage
      ) INTO v_quota_result;

      RAISE NOTICE 'Quota updated: %', v_quota_result;

    ELSE
      -- Simulation was too short, don't count it
      RAISE NOTICE 'Simulation too short (<%s seconds), not counting: user=%, session=%, duration=%s',
        300, NEW.user_id, NEW.session_token, NEW.duration_seconds;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (it was created in previous migration, but we're updating the function)
DROP TRIGGER IF EXISTS trg_update_quota_on_simulation_end ON simulation_usage_logs;
CREATE TRIGGER trg_update_quota_on_simulation_end
  AFTER UPDATE ON simulation_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quota_on_simulation_end();

COMMENT ON FUNCTION trigger_update_quota_on_simulation_end IS
'Trigger function that automatically updates quota when a simulation ends and was long enough (>= 5 minutes).';

-- ============================================
-- PART 3: FUNCTION TO GET ACTIVE SIMULATION STATUS
-- ============================================

-- This function checks if a user has an active (ongoing) simulation
CREATE OR REPLACE FUNCTION get_active_simulation(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_active_session simulation_usage_logs;
  v_elapsed_seconds integer;
  v_time_remaining integer;
BEGIN
  -- Find any active simulation (started but not ended)
  SELECT * INTO v_active_session
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  -- No active simulation
  IF v_active_session IS NULL THEN
    RETURN json_build_object(
      'has_active_simulation', false,
      'message', 'Keine aktive Simulation'
    );
  END IF;

  -- Calculate elapsed time
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_active_session.started_at))::integer;

  -- Calculate time remaining (15 minutes = 900 seconds)
  v_time_remaining := 900 - v_elapsed_seconds;

  -- Return active simulation info
  RETURN json_build_object(
    'has_active_simulation', true,
    'session_token', v_active_session.session_token,
    'simulation_type', v_active_session.simulation_type,
    'started_at', v_active_session.started_at,
    'elapsed_seconds', v_elapsed_seconds,
    'time_remaining_seconds', GREATEST(v_time_remaining, 0),
    'will_count_toward_usage', v_elapsed_seconds >= 300,
    'message', CASE
      WHEN v_elapsed_seconds >= 300 THEN 'Simulation wird gezählt'
      ELSE format('Noch %s Sekunden bis die Simulation gezählt wird', 300 - v_elapsed_seconds)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_simulation TO authenticated;

COMMENT ON FUNCTION get_active_simulation IS
'Returns information about a user active simulation including elapsed time and whether it will count.';

-- ============================================
-- PART 4: FUNCTION TO START NEW SIMULATION SESSION
-- ============================================

CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id uuid,
  p_simulation_type text, -- 'kp' or 'fsp'
  p_session_token uuid DEFAULT uuid_generate_v4()
)
RETURNS json AS $$
DECLARE
  v_can_start json;
  v_new_session simulation_usage_logs;
BEGIN
  -- Check if user can start a simulation (quota check)
  SELECT can_start_simulation(p_user_id) INTO v_can_start;

  -- If cannot start, return error
  IF (v_can_start->>'can_start')::boolean = false THEN
    RETURN json_build_object(
      'success', false,
      'reason', v_can_start->>'reason',
      'message', v_can_start->>'message'
    );
  END IF;

  -- Create new simulation session
  INSERT INTO simulation_usage_logs (
    session_token,
    user_id,
    simulation_type,
    started_at,
    ended_at,
    duration_seconds,
    counted_toward_usage
  ) VALUES (
    p_session_token,
    p_user_id,
    p_simulation_type,
    NOW(),
    NULL, -- Not ended yet
    0, -- Duration will be calculated when ended
    false -- Will be determined when ended
  )
  RETURNING * INTO v_new_session;

  RAISE NOTICE 'New simulation started: user=%, type=%, session=%',
    p_user_id, p_simulation_type, p_session_token;

  RETURN json_build_object(
    'success', true,
    'message', 'Simulation gestartet',
    'session_token', v_new_session.session_token,
    'simulation_type', v_new_session.simulation_type,
    'started_at', v_new_session.started_at,
    'quota_info', v_can_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION start_simulation_session TO authenticated;

COMMENT ON FUNCTION start_simulation_session IS
'Starts a new simulation session after checking quota. Returns session info.';

-- ============================================
-- PART 5: FUNCTION TO END SIMULATION SESSION
-- ============================================

CREATE OR REPLACE FUNCTION end_simulation_session(
  p_session_token uuid,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_session simulation_usage_logs;
  v_duration_seconds integer;
  v_will_count boolean;
BEGIN
  -- Get the session
  SELECT * INTO v_session
  FROM simulation_usage_logs
  WHERE session_token = p_session_token
    AND user_id = p_user_id
    AND ended_at IS NULL;

  -- Session not found or already ended
  IF v_session IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Simulation nicht gefunden oder bereits beendet'
    );
  END IF;

  -- Calculate duration
  v_duration_seconds := EXTRACT(EPOCH FROM (NOW() - v_session.started_at))::integer;
  v_will_count := v_duration_seconds >= 300;

  -- Update the session (this will trigger the automatic duration calculation and quota update)
  UPDATE simulation_usage_logs
  SET ended_at = NOW()
  WHERE session_token = p_session_token
    AND user_id = p_user_id;

  RAISE NOTICE 'Simulation ended: user=%, session=%, duration=%s, counted=%',
    p_user_id, p_session_token, v_duration_seconds, v_will_count;

  RETURN json_build_object(
    'success', true,
    'message', 'Simulation beendet',
    'session_token', p_session_token,
    'duration_seconds', v_duration_seconds,
    'counted_toward_usage', v_will_count,
    'message_detail', CASE
      WHEN v_will_count THEN 'Simulation wurde gezählt (>= 5 Minuten)'
      ELSE format('Simulation zu kurz (%s Sekunden), nicht gezählt', v_duration_seconds)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION end_simulation_session TO authenticated;

COMMENT ON FUNCTION end_simulation_session IS
'Ends a simulation session, automatically calculating duration and updating quota if applicable.';

-- ============================================
-- PART 6: VIEW FOR SIMULATION STATISTICS
-- ============================================

-- Create a helpful view for admins to see simulation stats
CREATE OR REPLACE VIEW simulation_statistics AS
SELECT
  user_id,
  simulation_type,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE counted_toward_usage = true) as counted_sessions,
  COUNT(*) FILTER (WHERE counted_toward_usage = false) as uncounted_sessions,
  AVG(duration_seconds) FILTER (WHERE duration_seconds > 0) as avg_duration_seconds,
  MAX(duration_seconds) as max_duration_seconds,
  MIN(duration_seconds) FILTER (WHERE duration_seconds > 0) as min_duration_seconds,
  SUM(duration_seconds) as total_duration_seconds
FROM simulation_usage_logs
WHERE ended_at IS NOT NULL
GROUP BY user_id, simulation_type;

COMMENT ON VIEW simulation_statistics IS
'Aggregated statistics for simulation sessions per user and type.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check active simulation for a user
-- SELECT * FROM get_active_simulation('USER_UUID_HERE');

-- Start a new simulation
-- SELECT * FROM start_simulation_session('USER_UUID_HERE', 'kp');

-- End a simulation
-- SELECT * FROM end_simulation_session('SESSION_TOKEN_HERE', 'USER_UUID_HERE');

-- View simulation statistics
-- SELECT * FROM simulation_statistics WHERE user_id = 'USER_UUID_HERE';

-- Check how duration and counting work
-- SELECT
--   session_token,
--   started_at,
--   ended_at,
--   duration_seconds,
--   counted_toward_usage,
--   CASE
--     WHEN counted_toward_usage THEN 'Counted ✓'
--     ELSE format('Too short (%s sec)', duration_seconds)
--   END as status
-- FROM simulation_usage_logs
-- ORDER BY started_at DESC
-- LIMIT 10;

COMMIT;
