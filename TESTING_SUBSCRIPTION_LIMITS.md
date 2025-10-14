# Testing Universal Subscription Limit Enforcement

## Overview
This document provides comprehensive test scenarios to verify that subscription limits work universally for ALL tiers and limit values (3, 5, 30, 50, 100, unlimited).

## Test Environment Setup

### Database Test Users
Create test users with different subscription configurations:

```sql
-- Free tier user (3 simulations lifetime)
INSERT INTO users (id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used)
VALUES ('test-free-001', 'free@test.com', NULL, NULL, NULL, 0, 0);

-- Custom 5 tier user
INSERT INTO users (id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used)
VALUES ('test-custom5-001', 'custom5@test.com', 'custom_5', 'active', 5, 0, 0);

-- Basis tier user (30 simulations/month)
INSERT INTO users (id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used)
VALUES ('test-basis-001', 'basis@test.com', 'basis', 'active', 30, 0, 0);

-- Custom 50 tier user
INSERT INTO users (id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used)
VALUES ('test-custom50-001', 'custom50@test.com', 'custom_50', 'active', 50, 0, 0);

-- Profi tier user (60 simulations/month)
INSERT INTO users (id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used)
VALUES ('test-profi-001', 'profi@test.com', 'profi', 'active', 60, 0, 0);

-- Custom 100 tier user
INSERT INTO users (id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used)
VALUES ('test-custom100-001', 'custom100@test.com', 'custom_100', 'active', 100, 0, 0);

-- Unlimited tier user
INSERT INTO users (id, email, subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used)
VALUES ('test-unlimited-001', 'unlimited@test.com', 'unlimited', 'active', 999999, 0, 0);
```

## Test Scenarios

### Test 1: FREE TIER (3/3)

#### Test 1.1: Start with 0/3
- **Action**: Login as free tier user with 0 simulations used
- **Expected**:
  - Counter shows "0/3 Simulationen genutzt"
  - Can start simulation
  - Access Control logs: "FREE TIER - 3 remaining (0/3)"

#### Test 1.2: Use 1 simulation (1/3)
- **Action**: Complete one simulation past 5-minute mark
- **Expected**:
  - Counter updates to "1/3 Simulationen genutzt"
  - Can still start another simulation
  - Access Control logs: "FREE TIER - 2 remaining (1/3)"

#### Test 1.3: Use 2 simulations (2/3)
- **Action**: Complete second simulation
- **Expected**:
  - Counter shows "2/3 Simulationen genutzt"
  - Can start final simulation
  - Access Control logs: "FREE TIER - 1 remaining (2/3)"

#### Test 1.4: Reach limit (3/3) - BLOCKING TEST
- **Action**: Complete third simulation, try to start fourth
- **Expected**:
  - Counter shows "3/3 Simulationen genutzt"
  - **CHECKPOINT 1**: `checkAccess()` returns `canUseSimulation: false`
  - **CHECKPOINT 2**: Alert shows "Sie haben alle 3 kostenlosen Simulationen verbraucht"
  - **CHECKPOINT 3**: `startSimulationTimer()` blocks immediately
  - **CHECKPOINT 4**: `canStartSimulation()` returns `allowed: false`
  - **CHECKPOINT 5**: Voiceflow widget closes
  - "Jetzt upgraden" button routes to /subscription
  - Access Control logs: "FREE TIER - BLOCKED (3/3)"

### Test 2: CUSTOM TIER (5/5)

#### Test 2.1: Fresh account (0/5)
- **Action**: Set `simulation_limit = 5`, start simulation
- **Expected**:
  - Counter shows "0/5 Simulationen genutzt"
  - Can start simulation
  - Access Control logs: "PAID TIER - 5 remaining (0/5)"

#### Test 2.2: Progress to 4/5
- **Action**: Use 4 simulations
- **Expected**:
  - Counter shows "4/5 Simulationen genutzt"
  - Can start final simulation
  - Access Control logs: "PAID TIER - 1 remaining (4/5)"

#### Test 2.3: Reach limit (5/5) - BLOCKING TEST
- **Action**: Use all 5, try to start 6th
- **Expected**:
  - Counter shows "5/5 Simulationen genutzt"
  - **ALL CHECKPOINTS BLOCK**
  - Alert: "Sie haben alle 5 Simulationen dieses Monats verbraucht"
  - Access Control logs: "PAID TIER - BLOCKED (5/5)"

### Test 3: BASIS TIER (30/30)

#### Test 3.1: Use 29/30
- **Action**: Set `simulations_used_this_month = 29`
- **Expected**:
  - Counter shows "29/30 Simulationen genutzt"
  - Can start final simulation
  - Access Control logs: "PAID TIER - 1 remaining (29/30)"

#### Test 3.2: Reach limit (30/30) - BLOCKING TEST
- **Action**: Use final simulation, try to start 31st
- **Expected**:
  - Counter shows "30/30 Simulationen genutzt"
  - **ALL CHECKPOINTS BLOCK**
  - Alert: "Sie haben alle 30 Simulationen dieses Monats verbraucht"
  - Upgrade modal appears

### Test 4: CUSTOM TIER (50/50)

#### Test 4.1: Use 49/50
- **Expected**:
  - Counter shows "49/50 Simulationen genutzt"
  - Can start final simulation

#### Test 4.2: Reach limit (50/50) - BLOCKING TEST
- **Expected**:
  - Counter shows "50/50 Simulationen genutzt"
  - **ALL CHECKPOINTS BLOCK**
  - Alert: "Sie haben alle 50 Simulationen dieses Monats verbraucht"

### Test 5: CUSTOM TIER (100/100)

#### Test 5.1: Use 99/100
- **Expected**:
  - Counter shows "99/100 Simulationen genutzt"
  - Can start final simulation

#### Test 5.2: Reach limit (100/100) - BLOCKING TEST
- **Expected**:
  - Counter shows "100/100 Simulationen genutzt"
  - **ALL CHECKPOINTS BLOCK**
  - Alert: "Sie haben alle 100 Simulationen dieses Monats verbraucht"

### Test 6: UNLIMITED TIER

#### Test 6.1: Use any number
- **Action**: Set `simulations_used_this_month` to 100, 500, 1000
- **Expected**:
  - Counter shows "X Simulationen genutzt" (no fraction)
  - **ALWAYS CAN START**
  - Access Control logs: "UNLIMITED TIER - Always allowed"
  - Never blocked

## Edge Case Tests

### Test 7: NULL simulation_limit
- **Setup**: Set `simulation_limit = NULL` for paid tier user
- **Expected**:
  - `validateAndFixUserData()` fixes it automatically
  - Sets default limit based on tier

### Test 8: Negative usage count
- **Setup**: Manually set `simulations_used_this_month = -5`
- **Expected**:
  - Data sanitization corrects to 0
  - Counter shows correct value

### Test 9: Used > Limit
- **Setup**: Set `simulations_used_this_month = 35` with `simulation_limit = 30`
- **Expected**:
  - `validateAndFixUserData()` caps at 30
  - User is blocked correctly

### Test 10: Concurrent session
- **Setup**: Start simulation, try to start another in different tab
- **Expected**:
  - Second attempt blocked
  - Alert: "Sie haben bereits eine aktive Simulation"

## Multi-Checkpoint Verification

For EVERY tier at X/X limit, verify ALL 5 checkpoints block:

1. **CHECKPOINT 1**: UI counter shows limit reached
2. **CHECKPOINT 2**: `checkAccess()` returns `canUseSimulation: false`
3. **CHECKPOINT 3**: `startSimulationTimer()` exits early
4. **CHECKPOINT 4**: `canStartSimulation()` returns `allowed: false`
5. **CHECKPOINT 5**: Voiceflow widget closes

## Success Criteria

✅ System works for ANY `simulation_limit` value (3, 5, 30, 50, 100, 500, etc.)
✅ No hardcoded limits (except free tier = 3)
✅ Counter dynamically shows X/Y for any values
✅ Upgrade modal shows appropriate options
✅ All 5 checkpoints block when limit reached
✅ Works consistently across page refreshes
✅ Syncs across multiple tabs
✅ Database-level protection prevents bypasses
✅ Edge cases handled gracefully

## Automated Testing Commands

```bash
# Run frontend tests
npm test -- subscription.test.ts

# Run backend validation tests
npm run test:backend -- simulation-limits.test.ts

# Test all tiers sequentially
npm run test:limits:all

# Test specific tier
npm run test:limits:free
npm run test:limits:custom-5
npm run test:limits:basis
npm run test:limits:custom-50
npm run test:limits:profi
npm run test:limits:custom-100
npm run test:limits:unlimited
```

## Manual Testing Checklist

- [ ] FREE TIER: 3/3 blocks correctly
- [ ] CUSTOM 5: 5/5 blocks correctly
- [ ] BASIS: 30/30 blocks correctly
- [ ] CUSTOM 50: 50/50 blocks correctly
- [ ] PROFI: 60/60 blocks correctly
- [ ] CUSTOM 100: 100/100 blocks correctly
- [ ] UNLIMITED: Never blocks
- [ ] NULL limit fixed automatically
- [ ] Negative usage corrected
- [ ] Concurrent sessions blocked
- [ ] Upgrade flow works from all tiers
- [ ] Counter displays correctly for all tiers
- [ ] Page refresh maintains correct state
- [ ] Multi-tab sync works

## Console Log Verification

When testing, verify these log patterns appear:

### Successful Access
```
[Access Control] PAID TIER - 5 remaining (0/5)
[Backend Validation] PAID TIER - Allowed (5/5 remaining)
[Access Control] ✅ CHECKPOINT 1 PASSED - Access granted
[Access Control] ✅ CHECKPOINT 2 PASSED - Backend approved
```

### Blocked Access
```
[Access Control] PAID TIER - BLOCKED (5/5)
[Access Control] ❌ BLOCKED - User cannot start simulation
[Backend Validation] PAID TIER - BLOCKED (5/5)
[Backend Validation] ❌ BLOCKED by backend
```

## Database Verification Queries

```sql
-- Check user's current status
SELECT
  subscription_tier,
  subscription_status,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used,
  (simulation_limit - simulations_used_this_month) as remaining
FROM users
WHERE id = 'test-user-id';

-- Check active sessions
SELECT * FROM simulation_usage_logs
WHERE user_id = 'test-user-id'
AND ended_at IS NULL;

-- Check counted simulations
SELECT COUNT(*) as total_counted
FROM simulation_usage_logs
WHERE user_id = 'test-user-id'
AND counted_toward_usage = true;
```

## Troubleshooting

### Issue: Counter shows wrong value
- **Solution**: Check `hasOptimisticState` - call `resetOptimisticCount()`

### Issue: User blocked despite having simulations
- **Solution**: Run `validateAndFixUserData()` to fix data inconsistencies

### Issue: Checkpoint 2 passes but Checkpoint 4 fails
- **Solution**: Check for concurrent sessions or stale data

### Issue: Database and frontend counts don't match
- **Solution**: Refresh page to clear optimistic state
