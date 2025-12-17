-- ============================================
-- SIMPLE QUOTA FIX
-- Date: 2025-12-17
-- ============================================

-- Step 1: See the current situation
SELECT
  'BEFORE FIX' as status,
  u.id as user_id,
  u.email,
  u.simulations_used_this_month as stored_value,
  (
    SELECT COUNT(*)
    FROM simulation_usage_logs sul
    WHERE sul.user_id = u.id
      AND sul.counted_toward_usage = true
      AND sul.created_at >= date_trunc('month', CURRENT_DATE)
  ) as actual_this_month,
  (
    SELECT COUNT(*)
    FROM simulation_usage_logs sul
    WHERE sul.user_id = u.id
      AND sul.counted_toward_usage = true
  ) as actual_all_time
FROM users u
WHERE u.id = (
  SELECT user_id FROM simulation_usage_logs ORDER BY created_at DESC LIMIT 1
);

-- Step 2: Fix the value
UPDATE users u
SET simulations_used_this_month = (
  SELECT COUNT(*)
  FROM simulation_usage_logs sul
  WHERE sul.user_id = u.id
    AND sul.counted_toward_usage = true
    AND sul.created_at >= date_trunc('month', CURRENT_DATE)
)
WHERE u.id = (
  SELECT user_id FROM simulation_usage_logs ORDER BY created_at DESC LIMIT 1
);

-- Step 3: Show the result
SELECT
  'AFTER FIX' as status,
  u.id as user_id,
  u.email,
  u.simulations_used_this_month as corrected_value,
  (
    SELECT COUNT(*)
    FROM simulation_usage_logs sul
    WHERE sul.user_id = u.id
      AND sul.counted_toward_usage = true
      AND sul.created_at >= date_trunc('month', CURRENT_DATE)
  ) as actual_this_month,
  'Refresh page to see: ' || u.simulations_used_this_month || '/60' as message
FROM users u
WHERE u.id = (
  SELECT user_id FROM simulation_usage_logs ORDER BY created_at DESC LIMIT 1
);
