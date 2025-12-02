-- Migration: Update stale session grace period for 15-minute simulations
-- Date: 2025-12-02
-- Change: Simulation duration changed from 20 minutes to 15 minutes
-- Grace period update: 40 minutes → 30 minutes (15 min simulation + 15 min buffer)

-- Update cleanup_stale_simulation_sessions function
CREATE OR REPLACE FUNCTION cleanup_stale_simulation_sessions()
RETURNS json AS $$
DECLARE
  v_cleaned_count integer := 0;
  v_session record;
BEGIN
  -- Find and cleanup stale sessions:
  -- 1. Session is not ended (ended_at IS NULL)
  -- 2. Started more than 30 minutes ago (15-minute timer + 15-minute grace period)
  --    Grace period accounts for:
  --    - 15 minutes: Normal simulation duration
  --    - 5 minutes: Buffer for network delays, app slowdowns
  --    - 10 minutes: Additional safety margin for edge cases
  FOR v_session IN
    SELECT
      id,
      user_id,
      session_token,
      simulation_type,
      started_at,
      EXTRACT(EPOCH FROM (now() - started_at))::integer as elapsed_seconds
    FROM simulation_usage_logs
    WHERE ended_at IS NULL
      AND started_at < now() - INTERVAL '30 minutes'
  LOOP
    -- Log stale session detection
    RAISE NOTICE 'Cleaning stale session: % (user: %, elapsed: %s)',
      v_session.session_token,
      v_session.user_id,
      v_session.elapsed_seconds;

    -- End the session (without counting it since it's stale)
    UPDATE simulation_usage_logs
    SET
      ended_at = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer,
      counted_toward_usage = false  -- Don't count stale sessions
    WHERE id = v_session.id;

    v_cleaned_count := v_cleaned_count + 1;
  END LOOP;

  IF v_cleaned_count > 0 THEN
    RAISE NOTICE 'Cleaned % stale simulation sessions', v_cleaned_count;
  END IF;

  RETURN json_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'message', format('Cleaned %s stale sessions', v_cleaned_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_stale_simulation_sessions IS 'Cleans up simulation sessions that have been running for more than 30 minutes (15-min simulation + 15-min grace period)';
