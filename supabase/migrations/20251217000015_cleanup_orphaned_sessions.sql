-- ============================================
-- CLEANUP ORPHANED SESSIONS
-- Date: 2025-12-17
-- ============================================
--
-- This script cleans up sessions that never ended properly
-- (older than 30 minutes with no end time)

DO $$
DECLARE
  v_orphaned_count integer := 0;
  v_cleaned_count integer := 0;
  v_session RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ORPHANED SESSION CLEANUP';
  RAISE NOTICE 'Date: %', NOW();
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Count orphaned sessions
  SELECT COUNT(*) INTO v_orphaned_count
  FROM simulation_usage_logs
  WHERE ended_at IS NULL
    AND EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at))) > 1800; -- 30 minutes

  RAISE NOTICE 'Found % orphaned sessions (>30 minutes old)', v_orphaned_count;
  RAISE NOTICE '';

  IF v_orphaned_count = 0 THEN
    RAISE NOTICE '✅ No orphaned sessions to clean up';
    RAISE NOTICE '';
    RETURN;
  END IF;

  -- Show details of what will be cleaned
  RAISE NOTICE 'Sessions to be cleaned:';
  RAISE NOTICE '--------------------';
  FOR v_session IN
    SELECT
      sul.session_token,
      u.email,
      sul.simulation_type,
      sul.timer_started_at,
      sul.started_at,
      EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at)))::integer as seconds_ago
    FROM simulation_usage_logs sul
    JOIN users u ON sul.user_id = u.id
    WHERE sul.ended_at IS NULL
      AND EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at))) > 1800
    ORDER BY sul.started_at
  LOOP
    RAISE NOTICE '- User: %, Type: %, Age: % seconds (%:% ago)',
      v_session.email,
      v_session.simulation_type,
      v_session.seconds_ago,
      (v_session.seconds_ago / 60),
      LPAD((v_session.seconds_ago % 60)::text, 2, '0');
  END LOOP;
  RAISE NOTICE '';

  -- Delete orphaned sessions (they will be auto-cleaned by start_simulation_session anyway)
  -- We don't end them because their duration would be wrong
  DELETE FROM simulation_usage_logs
  WHERE ended_at IS NULL
    AND EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at))) > 1800;

  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Orphaned sessions deleted: %', v_cleaned_count;
  RAISE NOTICE '--------------------';
  RAISE NOTICE 'These sessions will not count toward quotas';
  RAISE NOTICE 'Users can now start fresh simulations';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error during cleanup: %', SQLERRM;
END $$;

-- Verify cleanup
SELECT
  'Verification' as status,
  COUNT(*) as remaining_orphaned_sessions
FROM simulation_usage_logs
WHERE ended_at IS NULL
  AND EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at))) > 1800;

