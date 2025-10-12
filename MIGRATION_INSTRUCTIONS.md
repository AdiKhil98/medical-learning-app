# Migration Instructions: Simplified Simulation Tracking

## What We've Done

✅ Created simplified database schema (migration file)
✅ Updated TypeScript tracking service with simplified API
✅ Documented the new system

## What You Need to Do

### 1. Apply Database Migration

Run this SQL in your Supabase SQL Editor:

```bash
# The migration file is at:
supabase/migrations/20251012000000_simplify_simulation_tracking.sql
```

**⚠️ WARNING**: This migration will **DROP** the existing `simulation_usage_logs` table and recreate it.

If you want to keep your old data, **backup first**!

### 2. Update Frontend Code

The new simplified tracking service has just 3 methods:

#### Old Code (Complex):
```typescript
// Start simulation
await simulationTracker.startSimulation('kp')

// Mark as used at 5-min mark
await simulationTracker.markSimulationUsed(sessionToken, clientElapsed)

// Update status
await simulationTracker.updateSimulationStatus(sessionToken, 'completed', duration)
```

#### New Code (Simplified):
```typescript
// Start simulation
const result = await simulationTracker.startSimulation('kp')
const { sessionToken } = result

// Mark as counted at 5-min mark
await simulationTracker.markSimulationCounted(sessionToken)

// End simulation
await simulationTracker.endSimulation(sessionToken)
```

###  3. Update KP Simulation Screen

File: `app/(tabs)/simulation/kp.tsx`

#### Changes needed:

**Line 401-435: Replace `markSimulationAsUsed()`**
```typescript
// OLD
const markSimulationAsUsed = async (clientElapsedSeconds?: number) => {
  const token = sessionTokenRef.current;
  if (!token || usageMarkedRef.current) return;

  try {
    const result = await simulationTracker.markSimulationUsed(token, clientElapsedSeconds);
    if (result.success) {
      setUsageMarked(true);
      usageMarkedRef.current = true;
      console.log('✅ KP: Simulation usage recorded');
    }
  } catch (error) {
    console.error('❌ KP: Error marking simulation:', error);
  }
};

// NEW
const markSimulationAsCounted = async () => {
  const token = sessionTokenRef.current;
  if (!token || usageMarkedRef.current) return;

  console.log('📊 KP: Marking simulation as counted at 5-minute mark');

  try {
    const result = await simulationTracker.markSimulationCounted(token);
    if (result.success) {
      setUsageMarked(true);
      usageMarkedRef.current = true;
      console.log('✅ KP: Simulation counted in database');

      // Also record subscription usage
      await recordUsage();
    } else {
      console.error('❌ KP: Failed to mark as counted:', result.error);
    }
  } catch (error) {
    console.error('❌ KP: Error:', error);
  }
};
```

**Line 373-379: Update timer interval call**
```typescript
// OLD
if (prev > 900 && remainingSeconds <= 900 && !usageMarkedRef.current && currentSessionToken) {
  const clientElapsed = (20 * 60) - remainingSeconds;
  markSimulationAsUsed(clientElapsed);
}

// NEW
if (prev > 900 && remainingSeconds <= 900 && !usageMarkedRef.current && currentSessionToken) {
  markSimulationAsCounted();
}
```

**Line 476-529: Simplify `stopSimulationTimer()`**
```typescript
// OLD - Complex status logic with 'completed', 'aborted', 'incomplete'

// NEW - Simple: just end the simulation
const stopSimulationTimer = async () => {
  console.log('🛑 KP: Stopping simulation timer');

  if (sessionToken) {
    try {
      const result = await simulationTracker.endSimulation(sessionToken);
      console.log(`✅ KP: Simulation ended. Counted: ${result.counted}`);

      // If NOT counted (< 5 minutes), reset optimistic counter
      if (!result.counted) {
        resetOptimisticCount();
      }
    } catch (error) {
      console.error('❌ KP: Error ending simulation:', error);
    }
  }

  // Clear storage and reset state
  clearSimulationStorage();
  resetSimulationState();
};
```

**Line 657-733: Update `executeEarlyCompletion()`**
```typescript
// In executeEarlyCompletion, replace:
await simulationTracker.updateSimulationStatus(
  sessionToken,
  'completed',
  elapsedSeconds,
  { completion_type: 'early', ... }
);

// With:
await simulationTracker.endSimulation(sessionToken);
```

**Line 740-750: Update cleanup handler**
```typescript
// OLD
if (timerActiveRef.current && sessionToken) {
  const finalStatus = usageMarkedRef.current ? 'completed' : 'aborted';
  simulationTracker.updateSimulationStatus(sessionToken, finalStatus, duration);
}

// NEW
if (timerActiveRef.current && sessionToken) {
  simulationTracker.endSimulation(sessionToken);
}
```

**Line 820-836: Update `declineResume()`**
```typescript
// OLD
await simulationTracker.updateSimulationStatus(savedSessionToken, 'aborted', 0);

// NEW
await simulationTracker.endSimulation(savedSessionToken);
```

**Remove these lines (no longer needed):**
- Line 325-336: Remove heartbeat interval code
- Line 326-336: Remove `sendHeartbeat()` calls

### 4. Apply Same Changes to FSP

File: `app/(tabs)/simulation/fsp.tsx`

Apply the exact same changes as KP above.

### 5. Testing Checklist

After making changes, test these scenarios:

- [ ] Start simulation - check database has row with `started_at`
- [ ] Wait 5 minutes - check `counted_toward_usage` = true
- [ ] Complete simulation - check `ended_at` and `duration_seconds` populated
- [ ] Abort before 5 min - check `counted_toward_usage` = false, counter not incremented
- [ ] Abort after 5 min - check `counted_toward_usage` = true, counter incremented
- [ ] Refresh page during simulation - check can resume
- [ ] Check Supabase table - all columns should have values (no NULL)

## Summary of Benefits

✅ **Simpler**: 3 methods instead of 10+
✅ **Clearer**: Boolean `counted_toward_usage` instead of complex status states
✅ **Server-validated**: All timing calculated by database, not client
✅ **Easier to debug**: Just check one field in database
✅ **No more NULL values**: Every simulation will have complete data

## Rollback Plan

If something goes wrong:

1. Revert the TypeScript service changes
2. Revert the frontend changes
3. Restore database from backup (if you made one)

## Need Help?

Read the detailed explanation in:
- `SIMULATION_TRACKING_SIMPLIFIED.md`
- `supabase/migrations/20251012000000_simplify_simulation_tracking.sql` (comments explain logic)
