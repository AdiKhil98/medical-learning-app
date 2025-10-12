# Simplified Simulation Tracking System

## Overview

This is a complete redesign of the simulation tracking system with ONE GOAL: **Track if a simulation lasted >= 5 minutes, and if so, count it toward usage.**

## Database Schema (Simplified)

```sql
simulation_usage_logs
├── id (uuid)
├── user_id (uuid)
├── simulation_type ('kp' | 'fsp')
├── started_at (timestamp)        ← Server records when simulation started
├── ended_at (timestamp)          ← Server records when simulation ended
├── duration_seconds (integer)    ← Server calculates: ended_at - started_at
├── counted_toward_usage (boolean)← Server decides: duration >= 300 seconds
└── session_token (text)          ← Unique identifier for this session
```

## How It Works

### 1. User Starts Simulation
```
Frontend calls: simulationTracker.startSimulation('kp')
      ↓
Database creates row:
  - id: generated
  - user_id: current user
  - simulation_type: 'kp'
  - started_at: NOW()
  - counted_toward_usage: false
  - session_token: unique token
      ↓
Frontend receives: sessionToken
Frontend starts: 20-minute countdown timer
```

### 2. Timer Reaches 5-Minute Mark (15 minutes remaining)
```
Frontend timer detects: remainingSeconds <= 900 (15 min remaining = 5 min elapsed)
      ↓
Frontend calls: simulationTracker.markSimulationCounted(sessionToken)
      ↓
Database function `mark_simulation_counted`:
  1. Checks: started_at was at least 300 seconds ago ✓
  2. Checks: not already counted ✓
  3. Sets: counted_toward_usage = true
  4. Increments: user's simulation counter (+1)
      ↓
Frontend shows: "Simulation will be counted"
```

### 3. User Ends Simulation (Completes or Aborts)
```
Frontend calls: simulationTracker.endSimulation(sessionToken)
      ↓
Database function `end_simulation_session`:
  1. Calculates: duration_seconds = NOW() - started_at
  2. Sets: ended_at = NOW()
  3. Database already knows: counted_toward_usage = true (if >= 5 min)
      ↓
Frontend receives: counted=true/false, durationSeconds
Frontend can show: "Simulation completed and counted!" or "Ended early, not counted"
```

## Key Simplifications

### ❌ REMOVED (Unnecessary Complexity)
- `status` field (started/in_progress/used/completed/aborted/incomplete/expired) - Too many states!
- `marked_used_at` field - We only care about `counted_toward_usage` boolean
- `completed_at` field - We have `ended_at` instead
- Silent refund logic - Database handles counting/not-counting directly
- Heartbeat tracking - Not needed for basic timing
- Abuse detection - Can add later if needed
- Multiple concurrent session checks - Simplified
- Browser fingerprinting - Not needed

### ✅ KEPT (Essential)
- `id` - Unique identifier
- `user_id` - Who ran the simulation
- `simulation_type` - KP or FSP
- `started_at` - When did it start (server timestamp)
- `ended_at` - When did it end (server timestamp)
- `duration_seconds` - How long did it last (calculated by server)
- `counted_toward_usage` - Simple boolean: >= 5 minutes = true
- `session_token` - Unique token to identify this specific session

## Database Functions

### 1. start_simulation_session(user_id, simulation_type, session_token)
- Creates new row with `started_at = NOW()`
- Returns session details

### 2. mark_simulation_counted(session_token, user_id)
- Validates: elapsed time >= 300 seconds
- Validates: not already counted
- Sets: `counted_toward_usage = true`
- Increments: user's counter

### 3. end_simulation_session(session_token, user_id)
- Calculates: `duration_seconds = NOW() - started_at`
- Sets: `ended_at = NOW()`
- Returns: whether it was counted

## Frontend Timer Logic (Simplified)

```typescript
// When simulation starts
const result = await simulationTracker.startSimulation('kp');
const sessionToken = result.sessionToken;

// Start 20-minute timer
let remainingSeconds = 20 * 60; // 1200 seconds

// Timer interval (every second)
setInterval(() => {
  remainingSeconds--;

  // At 15 minutes remaining (5 minutes elapsed)
  if (remainingSeconds === 900 && !alreadyMarkedCounted) {
    simulationTracker.markSimulationCounted(sessionToken);
    alreadyMarkedCounted = true;
  }

  // When timer ends or user aborts
  if (remainingSeconds === 0 || userClickedExit) {
    simulationTracker.endSimulation(sessionToken);
  }
}, 1000);
```

## What You'll See in Supabase

### Example 1: User completes simulation (>= 5 minutes)
```
id: abc123
user_id: user-xyz
simulation_type: kp
started_at: 2025-10-12 10:00:00
ended_at: 2025-10-12 10:08:30
duration_seconds: 510
counted_toward_usage: true  ← YES, because 510 >= 300
```

### Example 2: User abandons early (< 5 minutes)
```
id: def456
user_id: user-xyz
simulation_type: fsp
started_at: 2025-10-12 11:00:00
ended_at: 2025-10-12 11:02:15
duration_seconds: 135
counted_toward_usage: false  ← NO, because 135 < 300
```

## Migration Steps

1. **Backup your data** (if you want to keep existing simulation_usage_logs)
2. **Run migration**: `supabase/migrations/20251012000000_simplify_simulation_tracking.sql`
3. **Deploy updated code**: The new TypeScript service and React components
4. **Test**: Start a simulation, wait 5 minutes, verify counter increments

## Benefits of This Approach

✅ **Clear logic**: If duration >= 5 minutes, count it. Otherwise, don't.
✅ **Server-side validation**: All timing calculated by database, not client
✅ **No complex state machines**: Just `counted_toward_usage` boolean
✅ **Easy to debug**: Look at `duration_seconds` and `counted_toward_usage` columns
✅ **Simple queries**: `SELECT * FROM simulation_usage_logs WHERE counted_toward_usage = true`

## Next Steps

1. Apply this migration to your Supabase database
2. Update KP and FSP simulation screens to use new API
3. Test thoroughly
4. Monitor `simulation_usage_logs` table to verify data is being recorded correctly
