# 🔄 Complete Simulation System Documentation

> **Last Updated:** December 2, 2025
> **System Version:** v2.0 (15-minute simulations, 5-minute counter trigger)

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Payment & Subscription Flow](#payment--subscription-flow)
3. [Database Schema](#database-schema)
4. [Subscription Tiers & Limits](#subscription-tiers--limits)
5. [Complete Simulation Flow](#complete-simulation-flow)
6. [Counter Mechanism](#counter-mechanism)
7. [Access Control System](#access-control-system)
8. [Monthly Reset System](#monthly-reset-system)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

The simulation system tracks and limits user access to medical simulations based on their subscription tier. It uses a **credit-based system** where each completed simulation (≥5 minutes) decrements the user's available count.

### Key Components:

- **Payment Provider**: LemonSqueezy (handles subscriptions)
- **Webhook Handler**: Netlify Function (`lemonsqueezy.js`)
- **Database**: Supabase PostgreSQL
- **Frontend**: React Native (KP & FSP screens)
- **Access Control**: `useSubscription` hook + DB functions

---

## 💳 Payment & Subscription Flow

### Step-by-Step Process:

```
1. User subscribes on LemonSqueezy
   ↓
2. LemonSqueezy sends webhook to: yoursite.com/api/webhook/lemonsqueezy
   ↓
3. Netlify function (lemonsqueezy.js) receives webhook
   ↓
4. Webhook verification (HMAC signature check)
   ↓
5. Event processing (subscription_created, subscription_updated, etc.)
   ↓
6. Database update (users table)
   ↓
7. User gets X simulations based on tier
```

### Webhook Events Handled:

| Event                    | Action                           | Database Update                                                                          |
| ------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------- |
| `subscription_created`   | New subscription activated       | Sets `subscription_tier`, `simulation_limit`, `subscription_status='active'`             |
| `subscription_updated`   | Plan changed (upgrade/downgrade) | Updates `subscription_tier` and `simulation_limit`                                       |
| `subscription_cancelled` | Subscription cancelled           | Sets `subscription_status='cancelled'`, keeps access until `subscription_expires_at`     |
| `subscription_expired`   | Subscription expired             | Sets `subscription_status='expired'`, removes `subscription_tier` and `simulation_limit` |

### Webhook Handler Location:

**File:** `netlify/functions/lemonsqueezy.js`

**Key Code:**

```javascript
// Subscription tier mapping
const SUBSCRIPTION_TIERS = {
  basis: {
    name: 'Basis-Plan',
    simulationLimit: 30, // 30 simulations/month
  },
  profi: {
    name: 'Profi-Plan',
    simulationLimit: 60, // 60 simulations/month
  },
  unlimited: {
    name: 'Unlimited-Plan',
    simulationLimit: null, // Unlimited
  },
};

// Variant ID mapping (from LemonSqueezy product variants)
const VARIANT_TIER_MAPPING = {
  1006948: 'basis',
  1006934: 'profi',
  1006947: 'unlimited',
};

// When subscription_created event received:
await updateUserSubscription(userId, {
  subscription_id: subscriptionId,
  variant_id: variantId,
  subscription_status: 'active',
  subscription_tier: tier, // 'basis', 'profi', or 'unlimited'
  simulation_limit: tierConfig.simulationLimit, // 30, 60, or null
  lemon_squeezy_customer_email: customerEmail,
});
```

### How It Finds the User:

1. LemonSqueezy webhook includes `user_email`
2. Webhook function queries: `SELECT * FROM users WHERE email = '{user_email}'`
3. If user exists → Update their subscription fields
4. If user not found → Return 404 error

---

## 🗄️ Database Schema

### **`users` Table** (Main subscription & usage tracking)

| Column                            | Type        | Description                                   | Example            |
| --------------------------------- | ----------- | --------------------------------------------- | ------------------ |
| `id`                              | UUID        | Primary key                                   | `a1b2c3d4-...`     |
| `email`                           | TEXT        | User email (unique)                           | `user@example.com` |
| `subscription_id`                 | TEXT        | LemonSqueezy subscription ID                  | `12345`            |
| `variant_id`                      | TEXT        | LemonSqueezy product variant                  | `1006948`          |
| `subscription_status`             | TEXT        | `active`, `cancelled`, `expired`              | `active`           |
| `subscription_tier`               | TEXT        | `basis`, `profi`, `unlimited`, or NULL (free) | `basis`            |
| `simulation_limit`                | INTEGER     | Max simulations per month (NULL = unlimited)  | `30`               |
| **`simulations_used_this_month`** | INTEGER     | **Counter for paid tiers**                    | `5`                |
| **`free_simulations_used`**       | INTEGER     | **Counter for free tier**                     | `2`                |
| `subscription_period_start`       | TIMESTAMPTZ | Start of current billing period               | `2025-12-01`       |
| `subscription_period_end`         | TIMESTAMPTZ | End of billing period (reset date)            | `2025-12-31`       |
| `last_counter_reset`              | TIMESTAMPTZ | Last time counter was reset                   | `2025-12-01`       |
| `subscription_created_at`         | TIMESTAMPTZ | When subscription was created                 | `2025-11-15`       |
| `subscription_expires_at`         | TIMESTAMPTZ | When subscription expires                     | `2025-12-31`       |

### **`simulation_usage_logs` Table** (Session tracking)

| Column                     | Type        | Description               | Example               |
| -------------------------- | ----------- | ------------------------- | --------------------- |
| `id`                       | UUID        | Log entry ID              | `x1y2z3...`           |
| `user_id`                  | UUID        | FK to users.id            | `a1b2c3d4-...`        |
| `simulation_type`          | TEXT        | `kp` or `fsp`             | `kp`                  |
| `session_token`            | TEXT        | Unique session identifier | `sim_abc123...`       |
| `started_at`               | TIMESTAMPTZ | When simulation started   | `2025-12-02 10:00:00` |
| `ended_at`                 | TIMESTAMPTZ | When simulation ended     | `2025-12-02 10:15:00` |
| `duration_seconds`         | INTEGER     | Total duration            | `900`                 |
| **`counted_toward_usage`** | BOOLEAN     | **Did it count?**         | `true`                |
| `created_at`               | TIMESTAMPTZ | Record created            | `2025-12-02 10:00:00` |

### **`webhook_events` Table** (Audit log)

| Column            | Type        | Description                      |
| ----------------- | ----------- | -------------------------------- |
| `id`              | UUID        | Event ID                         |
| `event_type`      | TEXT        | `subscription_created`, etc.     |
| `event_data`      | JSONB       | Full webhook payload             |
| `subscription_id` | TEXT        | LemonSqueezy subscription ID     |
| `user_id`         | UUID        | FK to users.id                   |
| `status`          | TEXT        | `processed`, `failed`, `ignored` |
| `error_message`   | TEXT        | Error if failed                  |
| `created_at`      | TIMESTAMPTZ | When webhook received            |

---

## 🎟️ Subscription Tiers & Limits

### Tier Comparison:

| Tier          | Simulations/Month | Price    | Counter Used                  | Reset Frequency     |
| ------------- | ----------------- | -------- | ----------------------------- | ------------------- |
| **Free**      | 3 (lifetime)      | €0       | `free_simulations_used`       | Never resets        |
| **Basis**     | 30                | €X/month | `simulations_used_this_month` | Monthly             |
| **Profi**     | 60                | €X/month | `simulations_used_this_month` | Monthly             |
| **Unlimited** | ∞                 | €X/month | `simulations_used_this_month` | N/A (never blocked) |

### How Limits Are Set:

**When user subscribes:**

```javascript
// Webhook sets simulation_limit based on tier
if (tier === 'basis') {
  simulation_limit = 30;
} else if (tier === 'profi') {
  simulation_limit = 60;
} else if (tier === 'unlimited') {
  simulation_limit = null; // No limit
}
```

**Free tier:**

- No webhook needed
- Default: `simulation_limit = NULL`, `subscription_tier = NULL`
- Uses `free_simulations_used` counter (hardcoded limit: 3)
- Never resets (lifetime limit)

---

## 🎮 Complete Simulation Flow

### Full End-to-End Flow:

```
┌─────────────────────────────────────────────────────┐
│ PHASE 1: PRE-START CHECK                            │
└─────────────────────────────────────────────────────┘
1. User clicks "Start Simulation" (KP or FSP)
   ↓
2. Frontend calls: useSubscription.checkAccess()
   ↓
3. Database function: check_and_reset_monthly_counter(user_id)
   - Checks if new billing period → Reset counter if needed
   ↓
4. Frontend fetches: SELECT * FROM users WHERE id = {user_id}
   ↓
5. Frontend calculates: remaining = limit - used
   ↓
6. If remaining === 0 → BLOCK (show upgrade modal)
   If remaining > 0 → ALLOW (continue)

┌─────────────────────────────────────────────────────┐
│ PHASE 2: START SIMULATION                           │
└─────────────────────────────────────────────────────┘
7. Frontend calls: simulationTracker.startSimulation('kp')
   ↓
8. Generate session_token: crypto.randomUUID()
   ↓
9. Database function: start_simulation_session()
   ↓
10. INSERT INTO simulation_usage_logs:
    - session_token = '550e8400-e29b-41d4-a716-446655440000'
    - user_id = {user_id}
    - simulation_type = 'kp'
    - started_at = NOW()
    - counted_toward_usage = false  ← Not counted yet!
   ↓
11. Return session_token to frontend
   ↓
12. Timer starts: 15:00 (900 seconds)

┌─────────────────────────────────────────────────────┐
│ PHASE 3: 5-MINUTE MARK (COUNTER TRIGGER)            │
└─────────────────────────────────────────────────────┘
13. Timer reaches 10:00 remaining (5 minutes elapsed)
   ↓
14. Frontend calls: simulationTracker.markSimulationCounted(session_token)
   ↓
15. Database function: mark_simulation_counted()

    15a. ATOMIC UPDATE (prevents double-counting):
         UPDATE simulation_usage_logs
         SET counted_toward_usage = true,
             duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
         WHERE session_token = {token}
           AND user_id = {user_id}
           AND counted_toward_usage = false  ← CRITICAL CHECK
         RETURNING started_at, elapsed_seconds;

    15b. Validation:
         IF elapsed_seconds < 295 THEN  ← 5-second buffer for network delay
           RETURN error('Insufficient time elapsed')
         END IF

    15c. INCREMENT COUNTER:
         UPDATE users
         SET simulations_used_this_month = simulations_used_this_month + 1  ← FREE TIER
           OR free_simulations_used = free_simulations_used + 1  ← PAID TIER
         WHERE id = {user_id};
   ↓
16. Frontend receives success response
   ↓
17. UI shows: "X simulations remaining" (updated count)

┌─────────────────────────────────────────────────────┐
│ PHASE 4: END SIMULATION                             │
└─────────────────────────────────────────────────────┘
18. Timer reaches 0:00 OR user exits early
   ↓
19. Frontend calls: simulationTracker.endSimulation(session_token)
   ↓
20. Database function: end_simulation_session()

    20a. UPDATE simulation_usage_logs
         SET ended_at = NOW(),
             duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
         WHERE session_token = {token};

    20b. Check duration:
         IF duration_seconds >= 300 AND NOT counted_toward_usage THEN
           ← If somehow not counted at 5-min mark, count now
           INCREMENT counter
         END IF
   ↓
21. Simulation complete
   ↓
22. Cleanup: Clear stored session data
```

### Key Files Involved:

| Phase      | Frontend File                      | Backend Function                    |
| ---------- | ---------------------------------- | ----------------------------------- |
| Pre-Start  | `hooks/useSubscription.ts`         | `check_and_reset_monthly_counter()` |
| Start      | `lib/simulationTrackingService.ts` | `start_simulation_session()`        |
| 5-Min Mark | `app/(tabs)/simulation/kp.tsx:728` | `mark_simulation_counted()`         |
| End        | `lib/simulationTrackingService.ts` | `end_simulation_session()`          |

---

## ⚙️ Counter Mechanism

### When Does the Counter Decrement?

**CRITICAL:** The counter decrements at the **5-minute mark**, not at the end!

```
Simulation Duration: 15 minutes (900 seconds)
Counter Trigger: 5 minutes elapsed (300 seconds)
                 Timer shows: 10:00 remaining
```

### Why 5 Minutes?

- Prevents abuse (users can't start dozens of sims and immediately exit)
- Reasonable commitment (5 min = engaged user)
- Fair billing (user got value from simulation)

### Counter Logic by Tier:

```typescript
// FREE TIER (no subscription)
if (subscription_tier === null || subscription_tier === '') {
  // Increment: free_simulations_used
  // Limit: 3 (hardcoded, never resets)
  UPDATE users
  SET free_simulations_used = free_simulations_used + 1
  WHERE id = user_id;
}

// PAID TIER (basis, profi, unlimited)
else {
  // Increment: simulations_used_this_month
  // Limit: simulation_limit (30, 60, or null)
  UPDATE users
  SET simulations_used_this_month = simulations_used_this_month + 1
  WHERE id = user_id;
}
```

### Network Delay Buffer:

**Problem:** Client timer says "300 seconds elapsed", but due to network delay, server sees "298 seconds"

**Solution:** Database validation uses **295-second threshold** (5-second buffer)

```sql
-- Old (caused rejections):
IF v_elapsed_seconds < 300 THEN
  RETURN error('Insufficient time');
END IF

-- New (accounts for latency):
IF v_elapsed_seconds < 295 THEN
  RETURN error('Insufficient time');
END IF
```

**Migration:** `20251202000000_fix_simulation_counter_validation.sql`

### Double-Counting Prevention:

**Race Condition:**

```
Thread 1: Check counted = false → Increment counter
Thread 2: Check counted = false → Increment counter  ← DOUBLE COUNT!
```

**Fix (Atomic Test-and-Set):**

```sql
UPDATE simulation_usage_logs
SET counted_toward_usage = true
WHERE session_token = {token}
  AND counted_toward_usage = false  ← Only update if not already counted
RETURNING *;

IF no rows updated THEN
  -- Already counted, return success without incrementing
END IF
```

---

## 🔒 Access Control System

### Frontend: `useSubscription` Hook

**File:** `hooks/useSubscription.ts`

```typescript
const checkAccess = async () => {
  // STEP 1: Reset counter if new billing period
  await supabase.rpc('check_and_reset_monthly_counter', { user_id_input: userId });

  // STEP 2: Fetch current usage
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier, simulation_limit, simulations_used_this_month, free_simulations_used')
    .eq('id', userId)
    .single();

  // STEP 3: Calculate remaining
  let remaining;
  if (user.subscription_tier === null) {
    // FREE TIER
    remaining = 3 - user.free_simulations_used;
  } else if (user.subscription_tier === 'unlimited') {
    // UNLIMITED
    remaining = 999999;
  } else {
    // PAID TIER
    remaining = user.simulation_limit - user.simulations_used_this_month;
  }

  // STEP 4: Block if remaining === 0
  const canStart = remaining > 0;

  return { canUseSimulation: canStart, remainingSimulations: remaining };
};
```

### Backend: `check_simulation_limit_before_start`

**File:** `supabase/migrations/20241125000000_add_check_simulation_limit_function.sql`

```sql
CREATE FUNCTION check_simulation_limit_before_start(p_user_id uuid)
RETURNS json AS $$
BEGIN
  -- Get user data
  SELECT subscription_tier, simulation_limit, simulations_used_this_month, free_simulations_used
  INTO v_tier, v_limit, v_used, v_free_used
  FROM users WHERE id = p_user_id;

  -- Free tier check
  IF v_tier IS NULL THEN
    v_limit := 3;
    v_used := v_free_used;
    v_remaining := v_limit - v_used;

    RETURN json_build_object(
      'can_start', v_remaining > 0,
      'remaining', v_remaining,
      'total_limit', v_limit
    );
  END IF;

  -- Unlimited tier
  IF v_tier = 'unlimited' THEN
    RETURN json_build_object('can_start', true, 'remaining', 999999);
  END IF;

  -- Paid tier (basis, profi)
  v_remaining := v_limit - v_used;
  RETURN json_build_object(
    'can_start', v_remaining > 0,
    'remaining', v_remaining,
    'total_limit', v_limit
  );
END;
$$;
```

### Where Access is Checked:

1. **Before initialization:** `kp.tsx:178-207` (prevents widget load if no sims)
2. **Before timer start:** `simulationTracker.canStartSimulation()`
3. **During page load:** `useSubscription.checkAccess()` runs on mount

---

## 📅 Monthly Reset System

### How Monthly Resets Work:

**For Paid Tiers Only** (basis, profi)

1. **Billing Period Tracking:**

   ```
   subscription_period_start: 2025-12-01
   subscription_period_end:   2025-12-31
   ```

2. **Automatic Reset:**
   - Called before every simulation: `check_and_reset_monthly_counter(user_id)`
   - Checks: `NOW() > subscription_period_end`
   - If true:
     ```sql
     UPDATE users
     SET simulations_used_this_month = 0,
         subscription_period_start = NOW(),
         subscription_period_end = NOW() + INTERVAL '30 days',
         last_counter_reset = NOW()
     WHERE id = user_id;
     ```

3. **Fallback Check:**
   - If `subscription_period_end` is NULL
   - Checks: `NOW() > (last_counter_reset + 30 days)`
   - Prevents stuck counters

### Free Tier Does NOT Reset:

```sql
-- Free tier check in reset function:
IF user_record.subscription_tier IS NULL OR user_record.subscription_tier = 'free' THEN
  RETURN FALSE;  -- No reset for free tier
END IF
```

**Free tier counter (`free_simulations_used`) is lifetime.**

### Manual Reset (Admin Only):

```sql
SELECT admin_reset_user_counter('user@example.com');
-- Returns: { success: true, simulations_used_this_month: 0 }
```

---

## 📊 Data Flow Diagrams

### Diagram 1: Payment to Database

```
┌─────────────┐
│ LemonSqueezy│
│  Dashboard  │
└──────┬──────┘
       │ User subscribes to "Basis Plan"
       ▼
┌─────────────────────────────────┐
│ LemonSqueezy Webhook            │
│ POST /api/webhook/lemonsqueezy  │
│                                 │
│ Payload:                        │
│ {                               │
│   event: "subscription_created" │
│   variant_id: "1006948"         │
│   user_email: "user@email.com"  │
│   status: "active"              │
│ }                               │
└──────┬──────────────────────────┘
       │ HMAC signature verified
       ▼
┌─────────────────────────────────┐
│ Netlify Function                │
│ lemonsqueezy.js                 │
│                                 │
│ 1. Verify signature             │
│ 2. Find user by email           │
│ 3. Map variant → tier           │
│    1006948 → 'basis'            │
│ 4. Get tier config              │
│    simulationLimit: 30          │
└──────┬──────────────────────────┘
       │ UPDATE users table
       ▼
┌─────────────────────────────────┐
│ Supabase Database               │
│ users table                     │
│                                 │
│ UPDATE users SET:               │
│   subscription_id = "12345"     │
│   subscription_status = "active"│
│   subscription_tier = "basis"   │
│   simulation_limit = 30         │
│   simulations_used_this_month=0 │
│ WHERE email = "user@email.com"  │
└─────────────────────────────────┘
```

### Diagram 2: Simulation Start to Counter Decrement

```
┌─────────────┐
│ User clicks │
│"Start Sim"  │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────┐
│ useSubscription.checkAccess()      │
│                                    │
│ 1. Reset counter if new period    │
│ 2. Fetch: simulation_limit = 30   │
│ 3. Fetch: used = 5                │
│ 4. Calculate: remaining = 25      │
│ 5. Check: 25 > 0 → ALLOW          │
└──────┬─────────────────────────────┘
       │ Access granted
       ▼
┌────────────────────────────────────┐
│ simulationTracker.startSimulation()│
│                                    │
│ Generate token: sim_abc123...     │
│ Call DB: start_simulation_session()│
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Database: simulation_usage_logs    │
│                                    │
│ INSERT:                            │
│   session_token = "sim_abc123..." │
│   user_id = {user_id}              │
│   started_at = 2025-12-02 10:00:00 │
│   counted_toward_usage = false     │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Timer Starts: 15:00                │
│ (900 seconds)                      │
└──────┬─────────────────────────────┘
       │ 5 minutes pass...
       ▼
┌────────────────────────────────────┐
│ Timer: 10:00 remaining             │
│ (5 minutes elapsed = 300 seconds)  │
│                                    │
│ Trigger condition met:             │
│ prev > 600 && current <= 600       │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ markSimulationCounted(session_token)│
│                                    │
│ Client elapsed: 300 seconds        │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Database: mark_simulation_counted()│
│                                    │
│ ATOMIC UPDATE:                     │
│   SET counted_toward_usage = true  │
│   WHERE token = "sim_abc123..."    │
│     AND counted = false            │
│                                    │
│ ✅ Rows affected: 1                │
│                                    │
│ Validate: elapsed >= 295 ✅         │
│                                    │
│ INCREMENT COUNTER:                 │
│   UPDATE users                     │
│   SET used = used + 1              │
│   (5 → 6)                          │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Success Response                   │
│ { success: true, counted: true }   │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Frontend Updates UI                │
│                                    │
│ Remaining: 30 - 6 = 24             │
│ Display: "24 simulations remaining"│
└────────────────────────────────────┘
```

### Diagram 3: UI Display Flow

```
┌─────────────────────────────────────┐
│ User Profile / Dashboard            │
└──────┬──────────────────────────────┘
       │ Load subscription info
       ▼
┌─────────────────────────────────────┐
│ useSubscription Hook                │
│                                     │
│ const { remainingSimulations } =    │
│   useSubscription(user.id)          │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Database Query                      │
│                                     │
│ SELECT                              │
│   subscription_tier,                │
│   simulation_limit,                 │
│   simulations_used_this_month,      │
│   free_simulations_used             │
│ FROM users WHERE id = {user_id}     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Calculate Remaining                 │
│                                     │
│ if (tier === null) {                │
│   // FREE TIER                      │
│   remaining = 3 - free_used         │
│ } else if (tier === 'unlimited') {  │
│   remaining = ∞                     │
│ } else {                            │
│   // PAID TIER                      │
│   remaining = limit - used_monthly  │
│ }                                   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ UI Display                          │
│                                     │
│ Example (Basis tier):               │
│ - Total: 30                         │
│ - Used: 6                           │
│ - Remaining: 24                     │
│                                     │
│ Display: "24 von 30 Simulationen    │
│           verbleibend"              │
└─────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Issue 1: Counter Not Decrementing

**Symptoms:**

- Simulation completes but `simulations_used_this_month` stays the same
- User still shows full limit after using simulations

**Possible Causes:**

1. **5-Minute Mark Not Reached:**
   - Check: Did simulation run for at least 5 minutes?
   - Solution: Simulations < 5 minutes don't count (by design)

2. **Network Delay Rejection:**
   - Check logs: "Insufficient time elapsed: 298 seconds"
   - Solution: Apply migration `20251202000000_fix_simulation_counter_validation.sql`

3. **Database Function Not Deployed:**
   - Check: Does `mark_simulation_counted()` function exist?
   - Solution: Run all migrations in `supabase/migrations/`

4. **Wrong Counter Being Checked:**
   - Free tier uses: `free_simulations_used`
   - Paid tier uses: `simulations_used_this_month`
   - Check: Are you looking at the right column?

**Debug Checklist:**

```sql
-- 1. Check simulation log
SELECT * FROM simulation_usage_logs
WHERE user_id = {user_id}
ORDER BY started_at DESC LIMIT 5;

-- Expected: counted_toward_usage = true for completed sims

-- 2. Check user counters
SELECT
  subscription_tier,
  simulation_limit,
  simulations_used_this_month,
  free_simulations_used
FROM users WHERE id = {user_id};

-- 3. Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'mark_simulation_counted';

-- 4. Test function manually (use actual UUID, no prefix)
SELECT mark_simulation_counted('550e8400-e29b-41d4-a716-446655440000'::uuid, {user_id}::uuid);
```

### Issue 2: User Can't Start Simulation (Has Remaining)

**Symptoms:**

- `remainingSimulations = 15` but button shows "Upgrade Required"

**Possible Causes:**

1. **Stale Frontend State:**
   - Solution: Call `resetOptimisticCount()` on page load
   - Location: `kp.tsx:119-122`

2. **Optimistic Deduction Not Cleared:**
   - After failed simulation, optimistic count not reset
   - Solution: Call `resetOptimisticCount()` in error handlers

3. **Monthly Reset Needed:**
   - User's billing period ended but counter not reset
   - Solution: Call `check_and_reset_monthly_counter(user_id)`

**Debug:**

```typescript
// In browser console:
const { data } = await supabase.from('users').select('*').eq('id', user.id).single();

console.log('Tier:', data.subscription_tier);
console.log('Limit:', data.simulation_limit);
console.log('Used:', data.simulations_used_this_month);
console.log('Period End:', data.subscription_period_end);
console.log('Remaining:', data.simulation_limit - data.simulations_used_this_month);
```

### Issue 3: Subscription Not Updating After Payment

**Symptoms:**

- User paid but still shows as free tier
- `subscription_tier = NULL` even though LemonSqueezy shows active

**Possible Causes:**

1. **Webhook Not Received:**
   - Check: `webhook_events` table for recent events

   ```sql
   SELECT * FROM webhook_events
   ORDER BY created_at DESC LIMIT 10;
   ```

2. **Webhook Signature Failed:**
   - Check Netlify function logs
   - Verify: `LEMONSQUEEZY_WEBHOOK_SECRET` environment variable

3. **User Email Mismatch:**
   - LemonSqueezy email: `john@gmail.com`
   - Database email: `john@example.com`
   - Solution: User must use same email for both

4. **Variant ID Not Mapped:**
   - Check: `VARIANT_TIER_MAPPING` in `lemonsqueezy.js:42-46`
   - Solution: Add new variant ID if missing

**Debug:**

```javascript
// In Netlify function logs, search for:
"Processing webhook event: subscription_created"
"Mapped variant ID 1006948 to tier: basis"
"Subscription created successfully for user {user_id}"

// Check webhook events table
SELECT
  event_type,
  status,
  error_message,
  created_at
FROM webhook_events
WHERE user_id = {user_id}
ORDER BY created_at DESC;
```

### Issue 4: Double Counting

**Symptoms:**

- Counter increments by 2 for single simulation
- `simulations_used_this_month` jumps from 5 to 7

**Cause:**

- Race condition: Multiple requests to `mark_simulation_counted()`

**Fix:**

- Migration `20251125000003_fix_mark_counted_race_condition.sql`
- Uses atomic test-and-set UPDATE

**Verify Fix:**

```sql
-- Check function has race condition protection
SELECT prosrc FROM pg_proc
WHERE proname = 'mark_simulation_counted';

-- Should contain:
-- WHERE counted_toward_usage = false
```

### Issue 5: Free Tier Counter Resets

**Symptoms:**

- User had used 2/3 free sims
- Next day shows 0/3 used again

**This Should NOT Happen:**

- Free tier counter never resets (by design)
- Check: `check_and_reset_monthly_counter()` excludes free tier

**If It Happens:**

```sql
-- Check function logic
SELECT prosrc FROM pg_proc
WHERE proname = 'check_and_reset_monthly_counter';

-- Should have:
-- IF user_record.subscription_tier IS NULL ... THEN RETURN FALSE

-- Manual fix (if needed):
UPDATE users
SET free_simulations_used = {correct_value}
WHERE id = {user_id};
```

---

## 📈 Monitoring & Analytics

### Key Metrics to Track:

1. **Counter Accuracy:**

   ```sql
   -- Check if logs match user counters
   SELECT
     u.id,
     u.simulations_used_this_month as user_counter,
     COUNT(*) FILTER (WHERE sul.counted_toward_usage = true) as log_count
   FROM users u
   LEFT JOIN simulation_usage_logs sul ON u.id = sul.user_id
   WHERE u.subscription_tier IS NOT NULL
   GROUP BY u.id
   HAVING user_counter != log_count;
   ```

2. **Webhook Success Rate:**

   ```sql
   SELECT
     event_type,
     status,
     COUNT(*) as count
   FROM webhook_events
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY event_type, status;
   ```

3. **Subscription Distribution:**

   ```sql
   SELECT
     subscription_tier,
     COUNT(*) as user_count,
     AVG(simulations_used_this_month) as avg_usage
   FROM users
   WHERE subscription_status = 'active'
   GROUP BY subscription_tier;
   ```

4. **Simulation Completion Rate:**
   ```sql
   SELECT
     COUNT(*) as total_started,
     COUNT(*) FILTER (WHERE counted_toward_usage = true) as completed,
     ROUND(100.0 * COUNT(*) FILTER (WHERE counted_toward_usage = true) / COUNT(*), 2) as completion_rate
   FROM simulation_usage_logs
   WHERE started_at > NOW() - INTERVAL '7 days';
   ```

---

## 🎓 Summary

### The Entire System in One Paragraph:

When a user **subscribes via LemonSqueezy**, a **webhook** is sent to the **Netlify function** which **verifies the signature** and **updates the `users` table** with their **subscription tier** (basis/profi/unlimited) and **simulation limit** (30/60/null). When they **start a simulation**, a session is **created in `simulation_usage_logs`** with `counted_toward_usage = false`. After **5 minutes** (timer at 10:00 remaining), the frontend calls **`mark_simulation_counted()`** which **atomically sets `counted = true`** and **increments** either `simulations_used_this_month` (paid) or `free_simulations_used` (free). The **`useSubscription` hook** calculates `remaining = limit - used` and **blocks access** if `remaining === 0`. For **paid tiers**, the counter **automatically resets monthly** via `check_and_reset_monthly_counter()` which checks if `NOW() > subscription_period_end`. **Free tier never resets** (3 simulations lifetime).

---

**Last Updated:** December 2, 2025
**System Version:** v2.0
**Maintained By:** Development Team
