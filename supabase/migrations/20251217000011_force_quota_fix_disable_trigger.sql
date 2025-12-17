-- ============================================
-- FORCE QUOTA FIX - Disable trigger, update, re-enable
-- Date: 2025-12-17
-- ============================================
--
-- PROBLEM:
-- - users.simulations_used_this_month = 349 (accumulated from all time)
-- - Actual December 2025 count = 26
-- - Sync trigger prevents direct UPDATE
--
-- SOLUTION:
-- 1. Disable the sync trigger temporarily
-- 2. Update users.simulations_used_this_month to correct value
-- 3. Re-enable the trigger
-- 4. Manually sync to user_simulation_quota

DO $$
DECLARE
  v_user_id uuid := '66da816e-844c-4e8a-85af-e7e286124133';
  v_correct_count integer;
  v_old_value integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FORCING QUOTA FIX';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Get old value
  SELECT simulations_used_this_month INTO v_old_value
  FROM users
  WHERE id = v_user_id;

  RAISE NOTICE 'Current (incorrect) value: %', v_old_value;

  -- Calculate correct value (December 2025 only)
  SELECT COUNT(*) INTO v_correct_count
  FROM simulation_usage_logs
  WHERE user_id = v_user_id
    AND counted_toward_usage = true
    AND created_at >= date_trunc('month', CURRENT_DATE);

  RAISE NOTICE 'Correct value (December 2025): %', v_correct_count;
  RAISE NOTICE '';

  -- STEP 1: Disable the sync trigger
  RAISE NOTICE 'Step 1: Disabling sync trigger...';
  ALTER TABLE users DISABLE TRIGGER trigger_sync_monthly_counter;
  RAISE NOTICE '✅ Trigger disabled';
  RAISE NOTICE '';

  -- STEP 2: Update to correct value
  RAISE NOTICE 'Step 2: Updating users.simulations_used_this_month...';
  UPDATE users
  SET simulations_used_this_month = v_correct_count
  WHERE id = v_user_id;
  RAISE NOTICE '✅ Updated from % to %', v_old_value, v_correct_count;
  RAISE NOTICE '';

  -- STEP 3: Re-enable the trigger
  RAISE NOTICE 'Step 3: Re-enabling sync trigger...';
  ALTER TABLE users ENABLE TRIGGER trigger_sync_monthly_counter;
  RAISE NOTICE '✅ Trigger re-enabled';
  RAISE NOTICE '';

  -- STEP 4: Manually sync to user_simulation_quota
  RAISE NOTICE 'Step 4: Syncing to user_simulation_quota...';
  UPDATE user_simulation_quota
  SET
    simulations_used = v_correct_count,
    updated_at = NOW()
  WHERE user_id = v_user_id
    AND period_start <= NOW()
    AND period_end > NOW();
  RAISE NOTICE '✅ Synced to quota table';
  RAISE NOTICE '';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'User should now see: %/60 on frontend', v_correct_count;
  RAISE NOTICE 'Refresh the page to see the change!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Verification query
SELECT
  'Verification' as status,
  email,
  simulations_used_this_month as users_table_value,
  (
    SELECT simulations_used
    FROM user_simulation_quota
    WHERE user_id = '66da816e-844c-4e8a-85af-e7e286124133'
      AND period_start <= NOW()
      AND period_end > NOW()
    LIMIT 1
  ) as quota_table_value,
  (
    SELECT COUNT(*)
    FROM simulation_usage_logs
    WHERE user_id = '66da816e-844c-4e8a-85af-e7e286124133'
      AND counted_toward_usage = true
      AND created_at >= date_trunc('month', CURRENT_DATE)
  ) as actual_december_count
FROM users
WHERE id = '66da816e-844c-4e8a-85af-e7e286124133';
