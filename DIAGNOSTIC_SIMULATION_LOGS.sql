-- Diagnostic query to check simulation logs and quota
-- Run this in Supabase SQL Editor to see what's happening

-- Part 1: Check recent simulation logs
SELECT
  id,
  session_token,
  simulation_type,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage,
  CASE
    WHEN ended_at IS NULL THEN '⚠️ ACTIVE (not ended)'
    WHEN duration_seconds >= 300 THEN '✅ LONG ENOUGH (>= 5 min)'
    ELSE '❌ TOO SHORT (< 5 min)'
  END as status,
  EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::integer as actual_duration
FROM simulation_usage_logs
WHERE started_at >= date_trunc('month', NOW())
ORDER BY started_at DESC
LIMIT 10;

-- Part 2: Check current quota status
SELECT
  subscription_tier,
  total_simulations,
  simulations_used,
  simulations_remaining,
  period_start,
  period_end
FROM user_simulation_quota
WHERE period_start <= NOW()
  AND period_end > NOW();

-- Part 3: Count simulations by status
SELECT
  COUNT(*) FILTER (WHERE ended_at IS NULL) as active_sessions,
  COUNT(*) FILTER (WHERE ended_at IS NOT NULL AND counted_toward_usage = true) as counted_sessions,
  COUNT(*) FILTER (WHERE ended_at IS NOT NULL AND counted_toward_usage = false) as uncounted_sessions,
  COUNT(*) FILTER (WHERE ended_at IS NOT NULL AND duration_seconds >= 300 AND counted_toward_usage = false) as SHOULD_BE_COUNTED_BUT_NOT
FROM simulation_usage_logs
WHERE started_at >= date_trunc('month', NOW());
