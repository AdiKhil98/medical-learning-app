-- ============================================
-- COMPREHENSIVE SIMULATION DIAGNOSTIC
-- Date: 2025-12-17
-- ============================================
--
-- This script provides a complete analysis of simulation
-- tracking system health and identifies any issues

-- ============================================
-- 1. CHECK ORPHANED SESSIONS
-- ============================================
SELECT
  '=== ORPHANED SESSIONS ===' as section,
  '' as blank_line;

SELECT
  user_id,
  email,
  session_token,
  simulation_type,
  timer_started_at,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at)))::integer as seconds_ago,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at))) > 1800 THEN '❌ ORPHANED (>30 min)'
    WHEN EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at))) > 1200 THEN '⚠️ SUSPICIOUS (>20 min)'
    ELSE '✅ OK'
  END as status
FROM simulation_usage_logs sul
JOIN users u ON sul.user_id = u.id
WHERE ended_at IS NULL
ORDER BY started_at DESC;

-- ============================================
-- 2. CHECK RECENT SIMULATIONS (LAST 24 HOURS)
-- ============================================
SELECT
  '=== RECENT SIMULATIONS (24H) ===' as section,
  '' as blank_line;

SELECT
  u.email,
  sul.simulation_type,
  sul.timer_started_at,
  sul.ended_at,
  sul.duration_seconds,
  sul.counted_toward_usage,
  sul.created_at,
  CASE
    WHEN sul.ended_at IS NULL THEN '🔴 Never ended'
    WHEN sul.duration_seconds IS NULL THEN '⚠️ No duration'
    WHEN sul.duration_seconds >= 295 AND sul.counted_toward_usage = false THEN '🔥 BUG: Should be counted!'
    WHEN sul.duration_seconds < 295 AND sul.counted_toward_usage = true THEN '🔥 BUG: Counted too early!'
    WHEN sul.counted_toward_usage = true THEN '✅ Counted correctly'
    ELSE '📊 Not counted (< 5 min)'
  END as status
FROM simulation_usage_logs sul
JOIN users u ON sul.user_id = u.id
WHERE sul.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY sul.created_at DESC
LIMIT 20;

-- ============================================
-- 3. CHECK QUOTA CONSISTENCY
-- ============================================
SELECT
  '=== QUOTA CONSISTENCY CHECK ===' as section,
  '' as blank_line;

SELECT
  u.email,
  u.simulations_used_this_month as users_table,
  uq.simulations_used as quota_table,
  (
    SELECT COUNT(*)
    FROM simulation_usage_logs sul
    WHERE sul.user_id = u.id
      AND sul.counted_toward_usage = true
      AND sul.created_at >= date_trunc('month', CURRENT_DATE)
  ) as actual_count,
  CASE
    WHEN u.simulations_used_this_month = uq.simulations_used
      AND u.simulations_used_this_month = (
        SELECT COUNT(*)
        FROM simulation_usage_logs sul
        WHERE sul.user_id = u.id
          AND sul.counted_toward_usage = true
          AND sul.created_at >= date_trunc('month', CURRENT_DATE)
      ) THEN '✅ CONSISTENT'
    ELSE '❌ INCONSISTENT'
  END as status
FROM users u
LEFT JOIN user_simulation_quota uq ON u.id = uq.user_id
  AND uq.period_start <= NOW()
  AND uq.period_end > NOW()
WHERE u.simulations_used_this_month > 0
ORDER BY u.email;

-- ============================================
-- 4. CHECK CRON JOB STATUS
-- ============================================
SELECT
  '=== CRON JOB STATUS ===' as section,
  '' as blank_line;

SELECT
  j.jobname,
  j.schedule,
  j.active,
  j.command,
  'Next run: 1st of next month at 00:01' as next_run
FROM cron.job j
WHERE j.jobname = 'reset-monthly-simulation-counters';

-- ============================================
-- 5. CHECK RECENT CRON EXECUTIONS
-- ============================================
SELECT
  '=== RECENT CRON EXECUTIONS ===' as section,
  '' as blank_line;

SELECT
  j.jobname,
  r.run_start,
  r.run_end,
  r.status,
  EXTRACT(EPOCH FROM (r.run_end - r.run_start))::integer as duration_seconds,
  r.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details r ON j.jobid = r.jobid
WHERE j.jobname = 'reset-monthly-simulation-counters'
ORDER BY r.run_start DESC
LIMIT 5;

-- ============================================
-- 6. DEPLOYMENT VERIFICATION
-- ============================================
SELECT
  '=== DATABASE FUNCTIONS STATUS ===' as section,
  '' as blank_line;

SELECT
  routine_name,
  routine_type,
  created as created_at
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'start_simulation_session',
    'mark_simulation_counted',
    'end_simulation_session',
    'reset_monthly_simulation_counters',
    'can_start_simulation'
  )
ORDER BY routine_name;

-- ============================================
-- 7. CHECK TRIGGERS
-- ============================================
SELECT
  '=== TRIGGER STATUS ===' as section,
  '' as blank_line;

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%simulation%'
    OR trigger_name LIKE '%quota%'
    OR event_object_table = 'simulation_usage_logs'
  )
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 8. SUMMARY AND RECOMMENDATIONS
-- ============================================
SELECT
  '=== SYSTEM HEALTH SUMMARY ===' as section,
  '' as blank_line;

WITH
  orphaned_count AS (
    SELECT COUNT(*) as cnt
    FROM simulation_usage_logs
    WHERE ended_at IS NULL
      AND EXTRACT(EPOCH FROM (NOW() - COALESCE(timer_started_at, started_at))) > 1800
  ),
  inconsistent_quotas AS (
    SELECT COUNT(*) as cnt
    FROM users u
    LEFT JOIN user_simulation_quota uq ON u.id = uq.user_id
      AND uq.period_start <= NOW()
      AND uq.period_end > NOW()
    WHERE u.simulations_used_this_month != COALESCE(uq.simulations_used, 0)
  ),
  miscounted_sims AS (
    SELECT COUNT(*) as cnt
    FROM simulation_usage_logs
    WHERE (
      (duration_seconds >= 295 AND counted_toward_usage = false)
      OR (duration_seconds < 295 AND counted_toward_usage = true)
    )
  )
SELECT
  'Orphaned sessions (>30 min)' as check_name,
  orphaned_count.cnt as count,
  CASE WHEN orphaned_count.cnt = 0 THEN '✅ OK' ELSE '⚠️ NEEDS CLEANUP' END as status
FROM orphaned_count
UNION ALL
SELECT
  'Inconsistent quota counts',
  inconsistent_quotas.cnt,
  CASE WHEN inconsistent_quotas.cnt = 0 THEN '✅ OK' ELSE '❌ NEEDS FIX' END
FROM inconsistent_quotas
UNION ALL
SELECT
  'Miscounted simulations',
  miscounted_sims.cnt,
  CASE WHEN miscounted_sims.cnt = 0 THEN '✅ OK' ELSE '🔥 CRITICAL BUG' END
FROM miscounted_sims;

-- ============================================
-- 9. ACTION ITEMS
-- ============================================
SELECT
  '=== RECOMMENDED ACTIONS ===' as section,
  '' as blank_line;

SELECT
  '1. Clean up orphaned sessions older than 30 minutes' as action
UNION ALL
SELECT
  '2. Fix inconsistent quota counts'
UNION ALL
SELECT
  '3. Verify cron job is running monthly'
UNION ALL
SELECT
  '4. Check if latest code is deployed to production'
UNION ALL
SELECT
  '5. Monitor for sessions that don''t end properly';

