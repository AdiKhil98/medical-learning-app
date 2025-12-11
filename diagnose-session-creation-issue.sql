-- ============================================
-- DIAGNOSTIC: Check simulation session creation issue
-- ============================================

-- Check 1: What is the current start_simulation_session function?
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'start_simulation_session'
  AND routine_schema = 'public';

-- Check 2: What are the current constraints?
SELECT
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%duration%'
  AND constraint_schema = 'public';

-- Check 3: What are the triggers on simulation_usage_logs?
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'simulation_usage_logs'
  AND trigger_schema = 'public';

-- Check 4: What is the column definition for duration_seconds?
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_usage_logs'
  AND column_name = 'duration_seconds';

-- Check 5: Try to manually insert a test record (this should succeed)
DO $$
DECLARE
  v_test_token uuid := gen_random_uuid();
  v_test_user_id uuid;
BEGIN
  -- Get a real user ID for testing
  SELECT id INTO v_test_user_id FROM users LIMIT 1;

  IF v_test_user_id IS NULL THEN
    RAISE NOTICE 'No users found for testing';
    RETURN;
  END IF;

  -- Try to insert with duration_seconds = 0 (this is what start_simulation_session does)
  BEGIN
    INSERT INTO simulation_usage_logs (
      session_token,
      user_id,
      simulation_type,
      started_at,
      ended_at,
      duration_seconds,
      counted_toward_usage
    ) VALUES (
      v_test_token,
      v_test_user_id,
      'kp',
      NOW(),
      NULL,
      0,
      false
    );

    RAISE NOTICE '✅ TEST PASSED: Manual insert with duration_seconds=0 succeeded';

    -- Clean up test record
    DELETE FROM simulation_usage_logs WHERE session_token = v_test_token;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST FAILED: Manual insert failed with error: %', SQLERRM;
  END;
END $$;
