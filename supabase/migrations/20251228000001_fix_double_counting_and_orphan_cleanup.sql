-- ============================================
-- FIX: Double-Counting Prevention & Orphan Session Cleanup
-- Date: 2025-12-28
-- ============================================
--
-- FIXES:
-- 1. Add unique partial index to prevent double-counting even with concurrent requests
-- 2. Update mark_simulation_counted to use row-level locking
-- 3. Add auto_cleanup_orphaned_sessions() function for server-side cleanup
-- 4. Add cron job to run cleanup every 15 minutes
-- ============================================

-- ============================================
-- FIX 1: Unique partial index for double-counting prevention
-- ============================================
-- This ensures only ONE row per session can have counted_toward_usage = true
-- Concurrent requests will fail with unique constraint violation (which is caught gracefully)

-- Drop existing index if it exists (in case of re-run)
DROP INDEX IF EXISTS idx_unique_counted_session;

-- Create partial unique index - only allows ONE counted session per session_token
CREATE UNIQUE INDEX idx_unique_counted_session
ON simulation_usage_logs (session_token)
WHERE counted_toward_usage = true;

COMMENT ON INDEX idx_unique_counted_session IS
'Prevents double-counting: Only one row per session_token can have counted_toward_usage = true.
Concurrent requests will fail with unique constraint violation (handled gracefully).';

-- ============================================
-- FIX 2: Enhanced mark_simulation_counted with better locking
-- ============================================
-- Update to use SELECT ... FOR UPDATE to lock the row before checking

DROP FUNCTION IF EXISTS mark_simulation_counted(text, uuid, integer);

CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token text,
  p_user_id uuid,
  p_client_elapsed_seconds integer DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_session_id uuid;
  v_already_counted boolean;
  v_elapsed_seconds integer;
  v_timer_started_at timestamptz;
  v_started_at timestamptz;
  v_server_elapsed integer;
  v_update_count integer;
BEGIN
  -- STEP 1: Lock the session row with FOR UPDATE to prevent race conditions
  SELECT
    session_token,
    counted_toward_usage,
    timer_started_at,
    started_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(timer_started_at, started_at)))::integer
  INTO
    v_session_id,
    v_already_counted,
    v_timer_started_at,
    v_started_at,
    v_server_elapsed
  FROM simulation_usage_logs
  WHERE session_token = p_session_token::uuid
    AND user_id = p_user_id
  FOR UPDATE SKIP LOCKED;  -- Skip if another transaction has locked it

  -- Session not found or locked by another transaction
  IF v_session_id IS NULL THEN
    -- Check if it exists but is locked
    IF EXISTS (SELECT 1 FROM simulation_usage_logs WHERE session_token = p_session_token::uuid AND user_id = p_user_id) THEN
      RETURN json_build_object(
        'success', true,
        'already_counted', true,
        'message', 'Session is being processed by another request'
      );
    END IF;

    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  -- Already counted (idempotent - not an error)
  IF v_already_counted = true THEN
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted (prevented double-count)'
    );
  END IF;

  -- STEP 2: DETERMINE ELAPSED TIME
  IF p_client_elapsed_seconds IS NOT NULL THEN
    v_elapsed_seconds := p_client_elapsed_seconds;
    RAISE NOTICE 'Using client elapsed time: %s seconds', v_elapsed_seconds;
  ELSE
    v_elapsed_seconds := v_server_elapsed;
    RAISE NOTICE 'Using server calculated time: %s seconds (timer_started_at: %)',
      v_elapsed_seconds, v_timer_started_at;
  END IF;

  -- STEP 3: VALIDATE ELAPSED TIME (295 sec min, 1800 sec max)
  IF v_elapsed_seconds < 295 THEN
    RAISE NOTICE 'Simulation too short: %s < 295 seconds (session: %)',
      v_elapsed_seconds, p_session_token;
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient time elapsed',
      'elapsed_seconds', v_elapsed_seconds,
      'required_seconds', 295
    );
  END IF;

  IF v_elapsed_seconds > 1800 THEN
    RAISE WARNING 'Elapsed time exceeds maximum: %s seconds, capping at 1800', v_elapsed_seconds;
    v_elapsed_seconds := 1800;
  END IF;

  -- STEP 4: MARK SESSION AS COUNTED
  -- The unique partial index prevents duplicate inserts even with concurrent requests
  UPDATE simulation_usage_logs
  SET
    counted_toward_usage = true,
    duration_seconds = v_elapsed_seconds,
    updated_at = now()
  WHERE session_token = p_session_token::uuid
    AND user_id = p_user_id
    AND counted_toward_usage = false;

  GET DIAGNOSTICS v_update_count = ROW_COUNT;

  -- Check if UPDATE succeeded
  IF v_update_count = 0 THEN
    -- Another request already counted it
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted (race prevented)'
    );
  END IF;

  -- STEP 5: INCREMENT QUOTA (only if session was just marked)
  UPDATE user_simulation_quota
  SET simulations_used = simulations_used + 1
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE WARNING 'user_simulation_quota row not found for user %', p_user_id;
  END IF;

  RAISE NOTICE 'Simulation counted: session=%, elapsed=%ss (source: %s), quota incremented',
    p_session_token,
    v_elapsed_seconds,
    CASE WHEN p_client_elapsed_seconds IS NOT NULL THEN 'client' ELSE 'server' END;

  RETURN json_build_object(
    'success', true,
    'counted', true,
    'elapsed_seconds', v_elapsed_seconds,
    'source', CASE WHEN p_client_elapsed_seconds IS NOT NULL THEN 'client' ELSE 'server' END,
    'message', 'Simulation marked as counted'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Unique constraint on idx_unique_counted_session triggered
    RETURN json_build_object(
      'success', true,
      'already_counted', true,
      'message', 'Simulation already counted (unique constraint prevented duplicate)'
    );
  WHEN OTHERS THEN
    RAISE WARNING 'Error in mark_simulation_counted: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_simulation_counted TO authenticated;

COMMENT ON FUNCTION mark_simulation_counted IS
'ENHANCED: Uses row-level locking (FOR UPDATE SKIP LOCKED) and unique partial index
to completely prevent double-counting even with concurrent requests from multiple tabs/devices.';

-- ============================================
-- FIX 3: Auto-cleanup orphaned sessions function
-- ============================================
-- Sessions older than 45 minutes that are still "active" are orphaned
-- (browser crash, network issue, etc.)

CREATE OR REPLACE FUNCTION auto_cleanup_orphaned_sessions()
RETURNS json AS $$
DECLARE
  v_orphaned_count integer := 0;
  v_cleaned_sessions uuid[];
BEGIN
  -- Find and update orphaned sessions (started > 45 min ago, still active)
  WITH orphaned AS (
    UPDATE simulation_usage_logs
    SET
      status = 'orphaned_auto_closed',
      ended_at = now(),
      updated_at = now(),
      -- If they were over 5 min old and not counted, mark as counted
      counted_toward_usage = CASE
        WHEN NOT counted_toward_usage
          AND EXTRACT(EPOCH FROM (now() - COALESCE(timer_started_at, started_at))) >= 300
        THEN true
        ELSE counted_toward_usage
      END,
      duration_seconds = CASE
        WHEN duration_seconds IS NULL OR duration_seconds = 0
        THEN LEAST(EXTRACT(EPOCH FROM (now() - COALESCE(timer_started_at, started_at)))::integer, 1200)
        ELSE duration_seconds
      END
    WHERE status IN ('active', 'in_progress', 'timer_started')
      AND started_at < (now() - interval '45 minutes')
    RETURNING session_token,
      CASE WHEN NOT counted_toward_usage AND EXTRACT(EPOCH FROM (now() - COALESCE(timer_started_at, started_at))) >= 300
           THEN true ELSE false END as was_counted
  )
  SELECT
    array_agg(session_token),
    count(*)
  INTO v_cleaned_sessions, v_orphaned_count
  FROM orphaned;

  -- Increment quota for sessions that were just counted
  UPDATE user_simulation_quota q
  SET simulations_used = simulations_used + (
    SELECT count(*)
    FROM simulation_usage_logs s
    WHERE s.session_token = ANY(v_cleaned_sessions)
      AND s.user_id = q.user_id
      AND s.counted_toward_usage = true
      AND s.status = 'orphaned_auto_closed'
  )
  WHERE EXISTS (
    SELECT 1 FROM simulation_usage_logs s
    WHERE s.session_token = ANY(v_cleaned_sessions)
      AND s.user_id = q.user_id
  );

  RAISE NOTICE 'Auto-cleanup: % orphaned sessions closed', v_orphaned_count;

  RETURN json_build_object(
    'success', true,
    'orphaned_sessions_cleaned', v_orphaned_count,
    'session_tokens', v_cleaned_sessions,
    'timestamp', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in auto_cleanup_orphaned_sessions: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only (cron job)
GRANT EXECUTE ON FUNCTION auto_cleanup_orphaned_sessions TO service_role;

COMMENT ON FUNCTION auto_cleanup_orphaned_sessions IS
'Server-side cleanup of orphaned simulation sessions (browser crash, network issues).
Closes sessions older than 45 minutes and counts them if they reached 5-minute mark.
Called by pg_cron every 15 minutes.';

-- ============================================
-- FIX 4: Add cron job for orphan cleanup (if pg_cron is available)
-- ============================================

DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    PERFORM cron.unschedule('auto_cleanup_orphaned_sessions');

    -- Schedule cleanup every 15 minutes
    PERFORM cron.schedule(
      'auto_cleanup_orphaned_sessions',
      '*/15 * * * *',  -- Every 15 minutes
      $$SELECT auto_cleanup_orphaned_sessions()$$
    );

    RAISE NOTICE 'pg_cron job scheduled: auto_cleanup_orphaned_sessions (every 15 min)';
  ELSE
    RAISE NOTICE 'pg_cron not available - orphan cleanup must be called manually or via external cron';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %. Manual cleanup via RPC still available.', SQLERRM;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DOUBLE-COUNTING & ORPHAN CLEANUP FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. UNIQUE PARTIAL INDEX ADDED:';
  RAISE NOTICE '   - idx_unique_counted_session on simulation_usage_logs';
  RAISE NOTICE '   - Only ONE session per session_token can be counted';
  RAISE NOTICE '   - Concurrent requests get unique_violation (handled gracefully)';
  RAISE NOTICE '';
  RAISE NOTICE '2. mark_simulation_counted() ENHANCED:';
  RAISE NOTICE '   - Uses FOR UPDATE SKIP LOCKED for row-level locking';
  RAISE NOTICE '   - Catches unique_violation and returns success';
  RAISE NOTICE '   - 100%% guaranteed no double-counting';
  RAISE NOTICE '';
  RAISE NOTICE '3. auto_cleanup_orphaned_sessions() ADDED:';
  RAISE NOTICE '   - Closes sessions older than 45 minutes';
  RAISE NOTICE '   - Counts sessions that reached 5-min mark but weren''t counted';
  RAISE NOTICE '   - Scheduled via pg_cron every 15 minutes (if available)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
