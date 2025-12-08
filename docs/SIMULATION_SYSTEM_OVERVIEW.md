# Simulation System - Complete Overview

**Last Updated:** December 2, 2025
**Document Purpose:** Comprehensive explanation of how the KP and FSP simulation systems work in the KP Med application

---

## Table of Contents

1. [Overview](#overview)
2. [Simulation Types](#simulation-types)
3. [Key Components](#key-components)
4. [System Architecture](#system-architecture)
5. [User Flow](#user-flow)
6. [Subscription & Access Control](#subscription--access-control)
7. [Simulation Tracking](#simulation-tracking)
8. [Timer System](#timer-system)
9. [Voiceflow Integration](#voiceflow-integration)
10. [Database Operations](#database-operations)
11. [Technical Implementation](#technical-implementation)

---

## Overview

The Simulation System is a core feature of KP Med that provides realistic medical exam simulations for two types of medical assessments:

- **KP (Klinische Prüfung)** - Clinical examination simulations
- **FSP (Fachsprachprüfung)** - Medical language proficiency test simulations

Both simulation types integrate with **Voiceflow AI** to provide interactive, conversational experiences with intelligent feedback.

---

## Simulation Types

### 1. KP Simulation (Clinical Examination)

- **Duration:** 15-25 minutes per session
- **Focus:** Diagnostic challenges and complex therapy decisions
- **Features:**
  - Practice-oriented case examples
  - Detailed feedback on clinical reasoning
  - Comprehensive evaluation of diagnostic skills

### 2. FSP Simulation (Medical Language Test)

- **Duration:** 20-30 minutes per session
- **Focus:** Doctor-patient communication in German
- **Features:**
  - Realistic patient conversation scenarios
  - AI-powered speech feedback
  - Interactive dialogue practice

---

## Key Components

### File Structure

```
app/(tabs)/simulation/
├── index.tsx              # Landing page with simulation selection
├── kp.tsx                 # KP simulation screen (~2900 lines)
├── fsp.tsx                # FSP simulation screen (~2900 lines)
└── _layout.tsx            # Layout with lazy loading

hooks/
├── useSubscription.ts     # Subscription and access control
└── useSimulationTimer.ts  # Timer logic (deprecated - inline in screens now)

lib/
└── simulationTrackingService.ts  # Database tracking service

utils/
├── voiceflowIntegration.ts       # Voiceflow widget controller
└── persistentIdManager.ts        # User ID persistence

components/
├── UpgradeRequiredModal.tsx      # Subscription upgrade prompt
└── InlineInstructions.tsx        # Simulation instructions UI
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│  (Simulation Screen: KP or FSP)                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► Access Control Check
                 │   └─► useSubscription Hook
                 │       └─► Supabase: check_simulation_limit_before_start()
                 │
                 ├─► Session Initialization
                 │   └─► simulationTrackingService.startSimulation()
                 │       └─► Supabase: start_simulation_session()
                 │           └─► Creates session token
                 │           └─► Inserts row in simulation_usage_logs
                 │
                 ├─► Voiceflow Widget Load
                 │   └─► VoiceflowController.initialize()
                 │       └─► Loads widget with user context
                 │       └─► User interacts with AI
                 │
                 ├─► Timer Tracking
                 │   └─► 20-minute countdown timer
                 │       ├─► At 5 minutes: Mark as counted
                 │       │   └─► simulationTrackingService.markSimulationCounted()
                 │       │       └─► Supabase: mark_simulation_counted()
                 │       │           └─► Increments counter
                 │       ├─► Warning system (15min, 10min, 5min)
                 │       └─► At 0:00: Force end simulation
                 │
                 └─► Session Completion
                     └─► simulationTrackingService.endSimulation()
                         └─► Supabase: end_simulation_session()
                             └─► Updates ended_at, duration_seconds
```

---

## User Flow

### Step 1: Access the Simulation Page

1. User navigates to **Simulation** tab
2. Sees landing page with two options:
   - **KP Simulation** (purple gradient card)
   - **FSP Simulation** (orange gradient card)
3. User statistics displayed:
   - Completed simulations
   - Success rate
   - Current streak

### Step 2: Pre-Launch Access Control

Before the simulation loads:

```javascript
// 1. Check subscription status
const accessCheck = await checkAccess();

// 2. Verify user has remaining simulations
if (!accessCheck.canUseSimulation || accessCheck.remainingSimulations === 0) {
  // Show upgrade modal
  return;
}

// 3. Check for concurrent sessions
const hasActiveSession = await hasActiveSession(userId);
if (hasActiveSession) {
  Alert.alert('Sie haben bereits eine aktive Simulation');
  return;
}
```

### Step 3: Initialize Simulation Session

When user starts simulation:

```javascript
// 1. Generate secure session token
const result = await simulationTracker.startSimulation('kp');
// Returns: { success: true, sessionToken: 'sim_xyz...' }

// 2. Store session token
setSessionToken(result.sessionToken);

// 3. Create Voiceflow controller
const controller = createKPController(userId, userEmail);

// 4. Initialize Voiceflow widget
await controller.initialize();
```

### Step 4: Active Simulation Phase

**Timer Starts:**

- 20-minute countdown begins on first user interaction
- Visual timer displayed at top of screen
- Warning messages at key thresholds

**User Interaction:**

- User converses with Voiceflow AI chatbot
- AI provides medical scenarios and questions
- User responds with diagnostic reasoning or patient communication

**5-Minute Mark - Critical Event:**

```javascript
// At 15 minutes remaining (5 minutes elapsed)
const result = await simulationTracker.markSimulationCounted(sessionToken);
// Database validates elapsed time and increments counter
// This counts as 1 simulation toward monthly limit
```

### Step 5: Simulation End

**Three ways simulation can end:**

1. **Timer expires (20:00 → 0:00)**

   ```javascript
   // Automatic cleanup and navigation
   await handleSimulationEnd('timer_expired');
   router.push('/(tabs)/progress');
   ```

2. **User completes early**

   ```javascript
   // User clicks "End Simulation" button
   await handleSimulationEnd('user_completed');
   ```

3. **User navigates away**
   ```javascript
   // Cleanup on unmount
   useEffect(() => {
     return () => {
       if (sessionToken) {
         simulationTracker.endSimulation(sessionToken);
       }
     };
   }, []);
   ```

### Step 6: Post-Simulation Cleanup

```javascript
// 1. End simulation session in database
await simulationTracker.endSimulation(sessionToken);
// Updates: ended_at, duration_seconds, counted_toward_usage

// 2. Clean up Voiceflow widget
controller.cleanup();

// 3. Clear local storage
await clearSimulationStorage();

// 4. Navigate to progress page
router.push('/(tabs)/progress');
```

---

## Subscription & Access Control

### Subscription Tiers

| Tier          | Monthly Limit | Notes                     |
| ------------- | ------------- | ------------------------- |
| **Free**      | 3 (lifetime)  | No reset, permanent limit |
| **Basis**     | 30            | Resets monthly            |
| **Profi**     | 60            | Resets monthly            |
| **Unlimited** | 999,999       | Effectively unlimited     |
| **Custom**    | Variable      | Custom_5, Custom_50, etc. |

### Access Control Logic

```javascript
// Free Tier
if (tier === 'free') {
  totalLimit = 3;
  usedCount = free_simulations_used;
  remaining = totalLimit - usedCount;
  canUse = remaining > 0;
}

// Paid Tier
else if (tier === 'basis' || tier === 'profi' || tier.startsWith('custom_')) {
  totalLimit = simulation_limit; // From database
  usedCount = simulations_used_this_month;
  remaining = totalLimit - usedCount;
  canUse = remaining > 0;

  // Monthly reset logic
  if (isPastBillingPeriod()) {
    await resetMonthlyCounter();
  }
}

// Unlimited Tier
else if (tier === 'unlimited') {
  canUse = true; // Always allowed
  remaining = 999999;
}
```

### Critical Blocking Rules

**User is blocked from starting simulation if:**

1. `remainingSimulations === 0` (limit reached)
2. User has an active simulation session (prevents concurrent sessions)
3. User is not authenticated
4. Subscription is not active (except free tier)

**User is NOT blocked if:**

- Subscription tier is `null` (treated as free tier)
- `simulation_limit` is `NULL` (auto-calculated from tier)
- Minor data inconsistencies (system auto-repairs)

---

## Simulation Tracking

### The 5-Minute Rule

**Core Logic:**

- Simulation only counts toward monthly limit if user stays for **5 minutes or longer**
- This prevents users from being penalized for accidentally starting a simulation
- Database enforces this rule, not the frontend

### Database Tables

#### `simulation_usage_logs` Table

```sql
CREATE TABLE simulation_usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  simulation_type TEXT NOT NULL, -- 'kp' or 'fsp'
  session_token TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  counted_toward_usage BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tracking Lifecycle

```javascript
// 1. START - Create log entry
startSimulation('kp')
  → INSERT INTO simulation_usage_logs
    (user_id, simulation_type, session_token, started_at)
  → Returns session_token

// 2. MARK COUNTED (at 5 minutes)
markSimulationCounted(sessionToken)
  → Check: elapsed_time >= 300 seconds
  → If yes: UPDATE counted_toward_usage = TRUE
  → INCREMENT simulations_used_this_month in users table

// 3. END - Update log entry
endSimulation(sessionToken)
  → UPDATE ended_at = NOW()
  → UPDATE duration_seconds = (ended_at - started_at)
```

---

## Timer System

### Implementation Details

**Timer Configuration:**

- Total Duration: 20 minutes (1200 seconds)
- Update Interval: 1 second
- Display Format: MM:SS (e.g., "15:30")

**Timer States:**

```javascript
const [timerActive, setTimerActive] = useState(false);
const [timeRemaining, setTimeRemaining] = useState(20 * 60);
const [timerEndTime, setTimerEndTime] = useState(0); // Absolute timestamp
```

### Timer Start Logic

```javascript
const startTimer = () => {
  // Prevent double-start with atomic lock
  if (timerStartLockRef.current) return;
  timerStartLockRef.current = true;

  const now = Date.now();
  const endTime = now + 20 * 60 * 1000;

  setTimerEndTime(endTime);
  setTimerActive(true);

  // Start interval
  timerInterval.current = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    setTimeRemaining(remaining);

    if (remaining === 0) {
      handleTimeUp();
    }
  }, 1000);
};
```

### Warning System

**Color-coded visual warnings:**

| Time Remaining | Warning Level | Color  |
| -------------- | ------------- | ------ |
| 20:00 - 15:01  | Normal        | Green  |
| 15:00 - 10:01  | Yellow        | Yellow |
| 10:00 - 05:01  | Orange        | Orange |
| 05:00 - 00:00  | Red           | Red    |

**Alert Messages:**

- At **15:00**: "15 Minuten verbleibend"
- At **10:00**: "10 Minuten verbleibend"
- At **05:00**: "Nur noch 5 Minuten!"
- At **00:00**: Force end simulation

### Critical Timer Events

**5-Minute Mark (15:00 remaining):**

```javascript
if (timeRemaining === 15 * 60 && !usageMarked) {
  await simulationTracker.markSimulationCounted(sessionToken);
  setUsageMarked(true);
}
```

**Timer Expiry (0:00):**

```javascript
const handleTimeUp = async () => {
  // Show final warning modal
  setShowFinalWarningModal(true);
  setFinalWarningCountdown(10);

  // 10-second countdown
  // Then force cleanup and redirect
  await handleSimulationEnd('timer_expired');
  router.push('/(tabs)/progress');
};
```

---

## Voiceflow Integration

### What is Voiceflow?

Voiceflow is a conversational AI platform that powers the interactive chatbot experience in simulations. It provides:

- Natural language processing
- Context-aware conversations
- Medical scenario scripting
- Evaluation logic

### Integration Architecture

```javascript
// 1. Create Controller
const controller = createKPController(userId, userEmail);

// 2. Initialize Widget
await controller.initialize();
// - Loads Voiceflow script from CDN
// - Configures widget with user context
// - Displays chat interface

// 3. User Interaction
// User types/speaks → Voiceflow processes → AI responds

// 4. Cleanup
controller.cleanup();
// Removes widget from DOM
```

### Persistent ID Management

**Problem:** Voiceflow needs consistent user IDs across sessions to maintain conversation context

**Solution:** `persistentIdManager.ts`

```javascript
// Store IDs in localStorage
const persistentIds = getPersistentIds('kp', supabaseUserId);
// Returns: { user_id: 'kp_user_abc123', session_id: 'kp_session_xyz789' }

// Reset on new simulation
resetSimulation('kp');
```

### Email Handling

**Privacy Option:** Hash email before sending to Voiceflow

```javascript
// Option 1: Send plain email (default)
config.hashEmail = false;
// Voiceflow receives: "user@example.com"

// Option 2: Send SHA-256 hash (GDPR compliant)
config.hashEmail = true;
// Voiceflow receives: "a3f8d9e2..."
```

### Widget Configuration

```javascript
const config = {
  projectID: 'kp_project_id',
  versionID: 'production',
  title: 'KP Simulation',
  simulationType: 'kp',
  url: 'https://voiceflow.com',
  hashEmail: false, // Privacy setting
};
```

---

## Database Operations

### RPC Functions (PostgreSQL)

#### 1. `start_simulation_session()`

```sql
CREATE OR REPLACE FUNCTION start_simulation_session(
  p_user_id UUID,
  p_simulation_type TEXT,
  p_session_token TEXT
) RETURNS JSON AS $$
BEGIN
  -- Insert new session log
  INSERT INTO simulation_usage_logs (
    user_id, simulation_type, session_token, started_at
  ) VALUES (
    p_user_id, p_simulation_type, p_session_token, NOW()
  );

  RETURN json_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql;
```

#### 2. `mark_simulation_counted()`

```sql
CREATE OR REPLACE FUNCTION mark_simulation_counted(
  p_session_token TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_elapsed_seconds INTEGER;
  v_already_counted BOOLEAN;
BEGIN
  -- Get session data
  SELECT
    EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
    counted_toward_usage
  INTO v_elapsed_seconds, v_already_counted
  FROM simulation_usage_logs
  WHERE session_token = p_session_token AND user_id = p_user_id;

  -- Validate: Must be >= 5 minutes (300 seconds)
  IF v_elapsed_seconds < 300 THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Not enough time elapsed'
    );
  END IF;

  -- Prevent double-counting
  IF v_already_counted THEN
    RETURN json_build_object(
      'success', TRUE,
      'already_counted', TRUE
    );
  END IF;

  -- Mark as counted and increment counter
  UPDATE simulation_usage_logs
  SET counted_toward_usage = TRUE
  WHERE session_token = p_session_token;

  UPDATE users
  SET simulations_used_this_month = simulations_used_this_month + 1
  WHERE id = p_user_id;

  RETURN json_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql;
```

#### 3. `end_simulation_session()`

```sql
CREATE OR REPLACE FUNCTION end_simulation_session(
  p_session_token TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  -- Calculate duration and update
  UPDATE simulation_usage_logs
  SET
    ended_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE session_token = p_session_token AND user_id = p_user_id
  RETURNING duration_seconds INTO v_duration;

  RETURN json_build_object(
    'success', TRUE,
    'duration_seconds', v_duration
  );
END;
$$ LANGUAGE plpgsql;
```

#### 4. `check_simulation_limit_before_start()`

```sql
CREATE OR REPLACE FUNCTION check_simulation_limit_before_start(
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_used INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get user subscription data
  SELECT subscription_tier, simulation_limit, simulations_used_this_month
  INTO v_tier, v_limit, v_used
  FROM users
  WHERE id = p_user_id;

  -- Calculate remaining
  v_remaining := v_limit - v_used;

  -- Check if user can start
  IF v_remaining <= 0 THEN
    RETURN json_build_object(
      'can_start', FALSE,
      'reason', 'Limit erreicht',
      'remaining', 0,
      'total_limit', v_limit
    );
  END IF;

  RETURN json_build_object(
    'can_start', TRUE,
    'remaining', v_remaining,
    'total_limit', v_limit
  );
END;
$$ LANGUAGE plpgsql;
```

### Row Level Security (RLS)

**Policies:**

```sql
-- Users can only access their own simulation logs
CREATE POLICY "Users can view own simulations"
ON simulation_usage_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
ON simulation_usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
ON simulation_usage_logs FOR UPDATE
USING (auth.uid() = user_id);
```

---

## Technical Implementation

### State Management

**Key State Variables:**

```typescript
// Authentication
const { user } = useAuth();

// Subscription
const { canUseSimulation, subscriptionStatus, recordUsage } = useSubscription(user?.id);

// Simulation Session
const [sessionToken, setSessionToken] = useState<string | null>(null);
const [usageMarked, setUsageMarked] = useState(false);

// Timer
const [timerActive, setTimerActive] = useState(false);
const [timeRemaining, setTimeRemaining] = useState(20 * 60);
const [timerWarningLevel, setTimerWarningLevel] = useState<'normal' | 'yellow' | 'orange' | 'red'>('normal');

// Voiceflow
const voiceflowController = useRef<VoiceflowController | null>(null);

// Modals
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [showFinalWarningModal, setShowFinalWarningModal] = useState(false);
```

### Cleanup Strategy

**Critical: Prevent memory leaks and orphaned sessions**

```javascript
useEffect(() => {
  // Component mount
  disableVoiceflowCleanup();

  // Component unmount
  return () => {
    // Clean up timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // End simulation session
    if (sessionToken && !isCleaningUpRef.current) {
      isCleaningUpRef.current = true;
      simulationTracker.endSimulation(sessionToken);
    }

    // Clean up Voiceflow
    if (voiceflowController.current) {
      voiceflowController.current.cleanup();
    }

    // Clear storage
    clearSimulationStorage();
  };
}, []);
```

### Error Handling

**Retry Logic for Initialization:**

```javascript
const initializeWithRetry = async (userId: string) => {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Attempt initialization
      const result = await simulationTracker.startSimulation('kp');

      if (result.success) {
        return result.sessionToken;
      }

      // Exponential backoff
      await delay(1000 * attempt);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
};
```

**Session Validation:**

```javascript
const isValidSessionToken = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.length < 10) {
    return false;
  }
  return /^sim_[a-zA-Z0-9_]+$/.test(token);
};
```

### Security Measures

1. **Cryptographically Secure Tokens:**

   ```javascript
   const generateSessionToken = () => {
     // Returns pure UUID format for database compatibility
     return crypto.randomUUID();
   };
   ```

2. **RPC Timeout Protection:**

   ```javascript
   const withTimeout = (promise, timeoutMs = 10000) => {
     return Promise.race([
       promise,
       new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
     ]);
   };
   ```

3. **Input Validation:**

   ```javascript
   // Validate all user inputs before database calls
   if (!isValidSessionToken(token)) {
     throw new Error('Invalid token format');
   }
   ```

4. **Row-Level Security (RLS):**
   - Database enforces user isolation
   - No user can access another user's simulation data

---

## Summary

The KP Med Simulation System is a sophisticated feature that combines:

1. **Access Control** - Subscription-based limits with free tier support
2. **Session Tracking** - Precise logging with 5-minute minimum rule
3. **Timer Management** - 20-minute countdown with visual warnings
4. **AI Integration** - Voiceflow chatbot for interactive learning
5. **Database Operations** - PostgreSQL RPC functions with RLS
6. **Error Handling** - Retry logic, validation, and graceful degradation
7. **Security** - Token validation, timeout protection, RLS policies

**Key Principles:**

- ✅ Only count simulations that last 5+ minutes
- ✅ Block users only when `remaining === 0`
- ✅ Validate all data at database level
- ✅ Clean up resources on unmount
- ✅ Provide clear user feedback
- ✅ Handle edge cases gracefully

---

**For Questions or Issues:**

- Check the codebase comments for detailed explanations
- Review database migration files in `supabase/migrations/`
- Consult related documentation: `SUBSCRIPTION_FIXES_SUMMARY.md`, `MIGRATION_GUIDE.md`
