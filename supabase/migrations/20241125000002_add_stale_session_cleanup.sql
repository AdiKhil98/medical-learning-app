-- Migration: Add automatic stale session cleanup
-- Purpose: Auto-end simulations that were never properly closed (browser crash, etc.)
-- Date: 2024-11-25

-- Function to clean up stale simulation sessions
CREATE OR REPLACE FUNCTION cleanup_stale_simulation_sessions()
RETURNS json AS $$
DECLARE
  v_cleaned_count integer := 0;
  v_subscription_tier text;
  v_session_record RECORD;
BEGIN
  -- Find and update all sessions that:
  -- 1. Have no end time (ended_at IS NULL)
  -- 2. Started more than 25 minutes ago (20-minute timer + 5-minute grace period)
  FOR v_session_record IN
    SELECT id, user_id, session_token, started_at
    FROM simulation_usage_logs
    WHERE ended_at IS NULL
      AND started_at < now() - INTERVAL '25 minutes'
    FOR UPDATE -- Lock rows being processed
  LOOP
    -- Calculate final duration (capped at 20 minutes = 1200 seconds)
    -- Auto-end sessions are assumed to have run full duration
    UPDATE simulation_usage_logs
    SET
      ended_at = started_at + INTERVAL '20 minutes',
      duration_seconds = 1200,  -- 20 minutes
      counted_toward_usage = true,  -- Sessions that ran 20+ minutes should count
      updated_at = now()
    WHERE id = v_session_record.id;

    -- Increment counter if not already counted
    -- Get user's subscription tier
    SELECT subscription_tier INTO v_subscription_tier
    FROM users
    WHERE id = v_session_record.user_id;

    -- Increment appropriate counter
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
    WHERE id = v_session_record.user_id;

    v_cleaned_count := v_cleaned_count + 1;

    RAISE LOG 'Auto-ended stale session: user=%, session=%, started=%',
      v_session_record.user_id, v_session_record.session_token, v_session_record.started_at;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count,
    'message', format('Cleaned up %s stale session(s)', v_cleaned_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION cleanup_stale_simulation_sessions IS 'Automatically cleans up simulation sessions that were not properly ended (browser crash, forced close, etc.)';

-- Grant execute permission to service role only (for scheduled jobs)
GRANT EXECUTE ON FUNCTION cleanup_stale_simulation_sessions() TO service_role;

-- Note: To run this automatically, you can:
-- 1. Use Supabase cron extension (pg_cron)
-- 2. Use an external cron job that calls this function via API
-- 3. Call it manually from admin panel

-- Example cron setup (requires pg_cron extension):
-- SELECT cron.schedule(
--   'cleanup-stale-sessions',
--   '0 */6 * * *',  -- Run every 6 hours
--   $$SELECT cleanup_stale_simulation_sessions()$$
-- );
