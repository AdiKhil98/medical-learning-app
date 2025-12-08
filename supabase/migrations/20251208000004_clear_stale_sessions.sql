-- Migration: Clear stale active sessions
-- Date: 2025-12-08
-- Purpose: End all currently active simulations to fix auto-start timer issue

-- End all active simulations
UPDATE simulation_usage_logs
SET
  ended_at = NOW(),
  duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::integer,
  counted_toward_usage = CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - started_at))::integer >= 300 THEN true
    ELSE false
  END
WHERE ended_at IS NULL;

COMMIT;
