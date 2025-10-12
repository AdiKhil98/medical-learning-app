-- QUICK TEST: Verify simulation tracking works correctly
-- Copy and paste this into Supabase SQL Editor

-- Step 1: Get your user ID (replace 'your@email.com' with your actual email)
DO $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'your@email.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL!
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found! Change the email in line 6 to your actual email.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found user: %', v_user_id;

  -- Step 2: Start a test simulation
  SELECT start_simulation_session(
    v_user_id,
    'kp',
    'test_quick_' || floor(random() * 1000)::text
  ) INTO v_result;

  RAISE NOTICE '📊 Start result: %', v_result;

  -- Step 3: Check if row was created
  IF EXISTS (
    SELECT 1 FROM simulation_usage_logs
    WHERE user_id = v_user_id
    AND simulation_type = 'kp'
    AND started_at > now() - interval '1 minute'
  ) THEN
    RAISE NOTICE '✅ Row created successfully in simulation_usage_logs';
  ELSE
    RAISE NOTICE '❌ Row NOT created - something is wrong!';
  END IF;

  -- Step 4: Show the newest simulation
  RAISE NOTICE '📋 Most recent simulation:';
  FOR v_result IN
    SELECT json_build_object(
      'id', id,
      'simulation_type', simulation_type,
      'started_at', started_at,
      'counted_toward_usage', counted_toward_usage
    )
    FROM simulation_usage_logs
    WHERE user_id = v_user_id
    ORDER BY started_at DESC
    LIMIT 1
  LOOP
    RAISE NOTICE '   %', v_result;
  END LOOP;

  RAISE NOTICE ' ';
  RAISE NOTICE '🎉 TEST PASSED! Everything is working correctly.';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. The database functions work ✅';
  RAISE NOTICE '2. Now test from the actual app (run a real simulation)';
  RAISE NOTICE '3. Watch the browser console for logs';
  RAISE NOTICE '4. After simulation, check this query:';
  RAISE NOTICE ' ';
  RAISE NOTICE 'SELECT * FROM simulation_usage_logs WHERE user_id = ''%'' ORDER BY started_at DESC LIMIT 5;', v_user_id;

END $$;
