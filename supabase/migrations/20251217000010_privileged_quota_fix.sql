-- ============================================
-- PRIVILEGED QUOTA FIX FUNCTION
-- Date: 2025-12-17
-- ============================================

-- Create a function with elevated privileges to fix the quota
CREATE OR REPLACE FUNCTION fix_user_quota_count(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges
AS $$
DECLARE
  v_old_value integer;
  v_new_value integer;
BEGIN
  -- Get current value
  SELECT simulations_used_this_month INTO v_old_value
  FROM users
  WHERE id = p_user_id;

  -- Calculate correct value (simulations from THIS MONTH only)
  SELECT COUNT(*) INTO v_new_value
  FROM simulation_usage_logs
  WHERE user_id = p_user_id
    AND counted_toward_usage = true
    AND created_at >= date_trunc('month', CURRENT_DATE);

  -- Update to correct value
  UPDATE users
  SET simulations_used_this_month = v_new_value
  WHERE id = p_user_id;

  -- Return result
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_value', v_old_value,
    'new_value', v_new_value,
    'message', 'Quota corrected from ' || v_old_value || ' to ' || v_new_value
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_user_quota_count TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_quota_count TO service_role;

-- Now call the function to fix the quota
SELECT fix_user_quota_count('66da816e-844c-4e8a-85af-e7e286124133');

-- Verify the fix worked
SELECT
  'Verification' as status,
  email,
  simulations_used_this_month as current_value,
  (
    SELECT COUNT(*)
    FROM simulation_usage_logs sul
    WHERE sul.user_id = users.id
      AND sul.counted_toward_usage = true
      AND sul.created_at >= date_trunc('month', CURRENT_DATE)
  ) as should_be
FROM users
WHERE id = '66da816e-844c-4e8a-85af-e7e286124133';
