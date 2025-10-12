# Test Simulation Tracking System

## Quick Database Test (Run in Supabase SQL Editor)

### Test 1: Start a simulation
```sql
-- Replace YOUR_USER_ID with your actual user ID from auth.users
SELECT start_simulation_session(
  'YOUR_USER_ID'::uuid,  -- Replace this!
  'kp',
  'test_session_123'
);
```

**Expected Result:**
```json
{
  "success": true,
  "session_id": "some-uuid",
  "session_token": "test_session_123",
  "started_at": "2025-10-12T..."
}
```

### Test 2: Check the database row
```sql
SELECT
  id,
  user_id,
  simulation_type,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage,
  session_token
FROM simulation_usage_logs
WHERE session_token = 'test_session_123';
```

**Expected Result:**
- ✅ started_at: Has timestamp
- ✅ ended_at: NULL (not ended yet)
- ✅ duration_seconds: NULL (not ended yet)
- ✅ counted_toward_usage: false (not counted yet)
- ✅ session_token: 'test_session_123'

### Test 3: Try to mark as counted (should FAIL - not enough time)
```sql
-- This should fail because less than 5 minutes elapsed
SELECT mark_simulation_counted(
  'test_session_123',
  'YOUR_USER_ID'::uuid  -- Replace this!
);
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Insufficient time elapsed",
  "elapsed_seconds": 5,  // or however many seconds
  "required_seconds": 300
}
```

### Test 4: Manually set started_at to 6 minutes ago (for testing)
```sql
-- Manually backdating for testing purposes only!
UPDATE simulation_usage_logs
SET started_at = now() - interval '6 minutes'
WHERE session_token = 'test_session_123';
```

### Test 5: Now mark as counted (should SUCCEED)
```sql
SELECT mark_simulation_counted(
  'test_session_123',
  'YOUR_USER_ID'::uuid  -- Replace this!
);
```

**Expected Result:**
```json
{
  "success": true,
  "counted": true,
  "elapsed_seconds": 360,  // ~6 minutes
  "message": "Simulation marked as counted"
}
```

### Test 6: Check database row again
```sql
SELECT
  id,
  user_id,
  simulation_type,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage,
  session_token
FROM simulation_usage_logs
WHERE session_token = 'test_session_123';
```

**Expected Result:**
- ✅ started_at: 6 minutes ago
- ✅ ended_at: NULL (still not ended)
- ✅ duration_seconds: 360 (6 minutes in seconds)
- ✅ counted_toward_usage: **TRUE** ← Changed!
- ✅ session_token: 'test_session_123'

### Test 7: Check user's counter was incremented
```sql
SELECT
  id,
  email,
  subscription_tier,
  free_simulations_used,
  simulations_used_this_month
FROM users
WHERE id = 'YOUR_USER_ID'::uuid;  -- Replace this!
```

**Expected Result:**
- If free tier: `free_simulations_used` increased by 1
- If paid tier: `simulations_used_this_month` increased by 1

### Test 8: End the simulation
```sql
SELECT end_simulation_session(
  'test_session_123',
  'YOUR_USER_ID'::uuid  -- Replace this!
);
```

**Expected Result:**
```json
{
  "success": true,
  "duration_seconds": 360,
  "counted_toward_usage": true,
  "message": "Simulation completed and counted (>= 5 minutes)"
}
```

### Test 9: Final check - row should be complete
```sql
SELECT
  id,
  user_id,
  simulation_type,
  started_at,
  ended_at,
  duration_seconds,
  counted_toward_usage,
  session_token,
  EXTRACT(EPOCH FROM (ended_at - started_at))::integer as calculated_duration
FROM simulation_usage_logs
WHERE session_token = 'test_session_123';
```

**Expected Result:**
- ✅ started_at: Has timestamp
- ✅ ended_at: Has timestamp (now)
- ✅ duration_seconds: ~360
- ✅ counted_toward_usage: TRUE
- ✅ calculated_duration: Should match duration_seconds

### Test 10: Clean up test data
```sql
-- Clean up the test
DELETE FROM simulation_usage_logs WHERE session_token = 'test_session_123';

-- Reset your counter (optional - only if you want to undo the test)
-- For free tier:
UPDATE users
SET free_simulations_used = free_simulations_used - 1
WHERE id = 'YOUR_USER_ID'::uuid;

-- For paid tier:
UPDATE users
SET simulations_used_this_month = simulations_used_this_month - 1
WHERE id = 'YOUR_USER_ID'::uuid;
```

---

## Frontend Test (In Browser Console)

When you run a simulation, watch the console logs:

### Expected Logs Sequence:

**1. Start simulation:**
```
📊 Starting simulation: kp
🎫 Session token: sim_xyz123
✅ Simulation started: {success: true, session_id: "...", ...}
```

**2. At 5-minute mark (15 minutes remaining):**
```
✓ Marking simulation as counted: sim_xyz123
✅ Simulation marked as counted: {success: true, counted: true, ...}
⏱️ Elapsed time: 300 seconds
```

**3. When simulation ends:**
```
🏁 Ending simulation: sim_xyz123
✅ Simulation ended: {success: true, duration_seconds: 496, ...}
⏱️ Duration: 496 seconds
📊 Counted: YES (>= 5 min)
```

---

## Common Issues to Check

### Issue 1: "Session not found"
**Cause:** Session token doesn't match or wrong user_id
**Fix:** Verify session token is correct and matches the database

### Issue 2: "Insufficient time elapsed"
**Cause:** Trying to mark as counted before 5 minutes
**Fix:** This is correct behavior! Wait for 5 minutes

### Issue 3: Counter not incrementing
**Cause:** Check if `counted_toward_usage` is actually true
**SQL Check:**
```sql
SELECT counted_toward_usage, duration_seconds
FROM simulation_usage_logs
WHERE session_token = 'YOUR_TOKEN';
```

### Issue 4: "Already counted"
**Cause:** Trying to count the same simulation twice
**Fix:** This is correct behavior! Prevents double-counting

---

## What Should Happen in Real Usage

### Scenario 1: User completes full 20-minute simulation
1. Start: Row created with `started_at`
2. 5-min mark: `counted_toward_usage` → TRUE, counter incremented
3. 20-min mark: `ended_at` recorded, `duration_seconds` = 1200
4. **Result:** Counted ✅

### Scenario 2: User quits after 3 minutes
1. Start: Row created with `started_at`
2. User quits before 5-min mark
3. End: `ended_at` recorded, `duration_seconds` = 180
4. **Result:** NOT counted (counted_toward_usage = FALSE) ❌

### Scenario 3: User quits after 7 minutes
1. Start: Row created with `started_at`
2. 5-min mark: `counted_toward_usage` → TRUE, counter incremented
3. User quits at 7 minutes
4. End: `ended_at` recorded, `duration_seconds` = 420
5. **Result:** Counted ✅ (already counted at 5-min mark)

---

## Database Query to See All Your Simulations

```sql
SELECT
  simulation_type,
  started_at,
  ended_at,
  duration_seconds,
  ROUND(duration_seconds / 60.0, 1) as duration_minutes,
  counted_toward_usage,
  CASE
    WHEN counted_toward_usage THEN '✅ COUNTED'
    ELSE '❌ NOT COUNTED'
  END as status
FROM simulation_usage_logs
WHERE user_id = 'YOUR_USER_ID'::uuid
ORDER BY started_at DESC
LIMIT 20;
```

This will show you a nice overview of all your simulations!
