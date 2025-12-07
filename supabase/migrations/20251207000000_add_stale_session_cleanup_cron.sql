-- Migration: Add automated cleanup for stale simulation sessions
-- Purpose: Prevent database bloat from abandoned sessions
-- Date: 2025-12-07
-- Issue: Sessions with ended_at = NULL accumulate indefinitely

-- ============================================
-- PROBLEM DESCRIPTION
-- ============================================
-- When users close browser, refresh page, or experience crashes,
-- simulation sessions may be left with ended_at = NULL.
-- These "zombie sessions" accumulate over time, causing:
-- 1. Database bloat (wasted storage)
-- 2. Slower queries (more rows to scan)
-- 3. Inaccurate analytics

-- ============================================
-- SOLUTION: Automated Cleanup with pg_cron
-- ============================================

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_stale_simulation_sessions()
RETURNS json AS $$
DECLARE
  v_grace_period_minutes integer := 30;  -- 30 minute grace period
  v_stale_sessions integer;
  v_cleaned_count integer;
BEGIN
  -- Find stale sessions (started > 30 minutes ago, not ended)
  SELECT COUNT(*) INTO v_stale_sessions
  FROM simulation_usage_logs
  WHERE ended_at IS NULL
    AND started_at < NOW() - (v_grace_period_minutes || ' minutes')::interval;

  -- Clean up stale sessions
  -- Set ended_at to started_at + grace period
  -- Mark as NOT counted (user didn't complete minimum time)
  UPDATE simulation_usage_logs
  SET
    ended_at = started_at + (v_grace_period_minutes || ' minutes')::interval,
    duration_seconds = v_grace_period_minutes * 60,
    counted_toward_usage = CASE
      WHEN counted_toward_usage = true THEN true  -- Keep if already counted
      ELSE false  -- Don't count abandoned sessions
    END,
    updated_at = NOW()
  WHERE ended_at IS NULL
    AND started_at < NOW() - (v_grace_period_minutes || ' minutes')::interval;

  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;

  -- Log cleanup results
  RAISE NOTICE 'Stale session cleanup: Found %, cleaned %', v_stale_sessions, v_cleaned_count;

  RETURN json_build_object(
    'success', true,
    'stale_sessions_found', v_stale_sessions,
    'sessions_cleaned', v_cleaned_count,
    'grace_period_minutes', v_grace_period_minutes,
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error during stale session cleanup: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION cleanup_stale_simulation_sessions IS
'Automatically cleans up simulation sessions that were abandoned (started but never ended). Runs via pg_cron every hour.';

-- Grant execute to postgres superuser only (cron runs as superuser)
REVOKE ALL ON FUNCTION cleanup_stale_simulation_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_stale_simulation_sessions() TO postgres;

-- Step 3: Schedule cron job to run every hour
-- Note: pg_cron uses standard cron syntax: minute hour day month weekday
SELECT cron.schedule(
  'cleanup-stale-simulation-sessions',  -- Job name
  '0 * * * *',                          -- Every hour at minute 0 (e.g., 1:00, 2:00, 3:00)
  $$SELECT cleanup_stale_simulation_sessions();$$
);

-- Step 4: Verify cron job was created
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'cleanup-stale-simulation-sessions';

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Query 1: Check for current stale sessions
-- Run this manually to see how many sessions need cleanup
/*
SELECT
  COUNT(*) as stale_session_count,
  MIN(started_at) as oldest_session,
  MAX(started_at) as newest_stale_session
FROM simulation_usage_logs
WHERE ended_at IS NULL
  AND started_at < NOW() - INTERVAL '30 minutes';
*/

-- Query 2: View recent cleanup history (check cron.job_run_details)
/*
SELECT
  runid,
  jobid,
  run_start,
  run_end,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'cleanup-stale-simulation-sessions'
)
ORDER BY run_start DESC
LIMIT 10;
*/

-- ============================================
-- MANUAL CLEANUP (if needed)
-- ============================================
-- If you need to manually trigger cleanup:
-- SELECT cleanup_stale_simulation_sessions();

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- To remove the cron job:
-- SELECT cron.unschedule('cleanup-stale-simulation-sessions');
-- To drop the function:
-- DROP FUNCTION IF EXISTS cleanup_stale_simulation_sessions();

COMMIT;
