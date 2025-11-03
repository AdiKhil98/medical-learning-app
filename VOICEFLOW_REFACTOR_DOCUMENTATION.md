# Voiceflow Widget Integration - Refactored Implementation

## 📋 Overview

This document describes the refactored Voiceflow widget integration with persistent user and session ID management for KP and FSP simulations.

---

## 🎯 Key Features

### ✅ Persistent ID Management
- **user_id** synced with authenticated Supabase user ID
- **session_id** persists across page reloads using localStorage
- Separate storage keys for KP and FSP simulations
- IDs maintain consistency throughout Patient → Examiner evaluation flow
- Voiceflow data can be matched to actual Supabase users in database

### ✅ Modern Voiceflow Configuration
- Uses `window.voiceflow.chat.load({...})` with modern API
- Implements `user.data.session_id` for proper Make.com webhook integration
- Disables `assistant.persistence` to ensure our custom IDs are used (not Voiceflow's auto-generated ones)

### ✅ Automatic ID Management
- IDs are automatically created and retrieved from localStorage
- No manual ID generation required in simulation components
- Reset functions available for starting fresh simulations

---

## 📁 File Structure

```
utils/
├── persistentIdManager.ts      # Manages localStorage persistence for IDs
└── voiceflowIntegration.ts     # Main Voiceflow controller with modern config

app/(tabs)/simulation/
├── kp.tsx                       # KP simulation (uses createKPController)
└── fsp.tsx                      # FSP simulation (uses createFSPController)
```

---

## 🔧 Implementation Details

### 1. Persistent ID Manager (`utils/persistentIdManager.ts`)

**Purpose:** Manages localStorage-based persistence for user_id and session_id

**Key Functions:**

```typescript
// Get or create persistent IDs (with optional Supabase user ID sync)
getPersistentIds(simulationType: 'kp' | 'fsp', supabaseUserId?: string): { user_id: string; session_id: string }

// Reset simulation (clear both IDs)
resetSimulation(simulationType: 'kp' | 'fsp'): void

// Reset only session (keep user_id)
resetSession(simulationType: 'kp' | 'fsp'): void

// Check if IDs exist
hasExistingIds(simulationType: 'kp' | 'fsp'): boolean

// Get current IDs without creating new ones
getCurrentIds(simulationType: 'kp' | 'fsp'): { user_id: string; session_id: string } | null
```

**localStorage Keys:**
- KP: `kp_user_id`, `kp_session_id`
- FSP: `fsp_user_id`, `fsp_session_id`

---

### 2. Voiceflow Controller (`utils/voiceflowIntegration.ts`)

**Purpose:** Manages Voiceflow widget lifecycle with persistent IDs

**Constructor Behavior:**
```typescript
const controller = createKPController(user.id);
// Uses authenticated Supabase user ID as Voiceflow user_id
// Session ID is automatically generated and persisted in localStorage
// Voiceflow data can now be matched to Supabase users
```

**Modern Widget Configuration:**
```javascript
window.voiceflow.chat.load({
  verify: { projectID: '690664399c414573ccceb427' }, // KP project
  url: 'https://general-runtime.voiceflow.com',
  versionID: 'production',
  user: {
    id: userId,              // From localStorage: kp_user_id
    data: {
      session_id: sessionId  // From localStorage: kp_session_id
    }
  },
  assistant: {
    persistence: false,  // CRITICAL: Disabled to use our custom IDs
    header: {
      title: 'KP Simulation Assistant'
    },
    inputPlaceholder: 'Geben Sie Ihre Nachricht ein...'
  }
  // Note: voice parameter removed - not supported in new project schema
});
```

**Key Methods:**
```typescript
controller.initialize()                 // Load widget with persistent IDs
controller.getIds()                     // Get current user_id and session_id
controller.isReady()                    // Check if widget is loaded
controller.open()                       // Show widget
controller.close()                      // Hide widget
controller.destroy()                    // Cleanup widget and media streams
```

---

## 📊 Complete Widget Codes

### KP Simulation Widget

```html
<script type="text/javascript">
(function(d, t) {
  var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
  v.onload = function() {
    const userKey = 'kp_user_id';
    const sessionKey = 'kp_session_id';

    // Get or create PERSISTENT user ID
    let storedUser = localStorage.getItem(userKey);
    if (!storedUser) {
      storedUser = crypto.randomUUID();
      localStorage.setItem(userKey, storedUser);
      console.log('Created new KP user_id:', storedUser);
    }

    // Get or create PERSISTENT session ID
    let storedSession = localStorage.getItem(sessionKey);
    if (!storedSession) {
      storedSession = 'session_' + Date.now();
      localStorage.setItem(sessionKey, storedSession);
      console.log('Created new KP session_id:', storedSession);
    }

    console.log('Loading KP Voiceflow with:', {
      user_id: storedUser,
      session_id: storedSession
    });

    window.voiceflow.chat.load({
      verify: { projectID: '690664399c414573ccceb427' },
      url: 'https://general-runtime.voiceflow.com',
      versionID: 'production',
      user: {
        id: storedUser,
        data: {
          session_id: storedSession
        }
      },
      assistant: {
        persistence: false,  // CRITICAL: Disabled to use our custom user_id/session_id
        header: {
          title: 'KP Simulation Assistant'
        },
        inputPlaceholder: 'Geben Sie Ihre Nachricht ein...'
      }
    });
  };
  v.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  v.type = 'text/javascript';
  s.parentNode.insertBefore(v, s);
})(document, 'script');
</script>
```

### FSP Simulation Widget

```html
<script type="text/javascript">
(function(d, t) {
  var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
  v.onload = function() {
    const userKey = 'fsp_user_id';
    const sessionKey = 'fsp_session_id';

    // Get or create PERSISTENT user ID
    let storedUser = localStorage.getItem(userKey);
    if (!storedUser) {
      storedUser = crypto.randomUUID();
      localStorage.setItem(userKey, storedUser);
      console.log('Created new FSP user_id:', storedUser);
    }

    // Get or create PERSISTENT session ID
    let storedSession = localStorage.getItem(sessionKey);
    if (!storedSession) {
      storedSession = 'session_' + Date.now();
      localStorage.setItem(sessionKey, storedSession);
      console.log('Created new FSP session_id:', storedSession);
    }

    console.log('Loading FSP Voiceflow with:', {
      user_id: storedUser,
      session_id: storedSession
    });

    window.voiceflow.chat.load({
      verify: { projectID: '690664339c414573ccceb410' },
      url: 'https://general-runtime.voiceflow.com',
      versionID: 'production',
      user: {
        id: storedUser,
        data: {
          session_id: storedSession
        }
      },
      assistant: {
        persistence: false,  // CRITICAL: Disabled to use our custom user_id/session_id
        header: {
          title: 'FSP Simulation Assistant'
        },
        inputPlaceholder: 'Geben Sie Ihre Nachricht ein...'
      }
    });
  };
  v.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  v.type = 'text/javascript';
  s.parentNode.insertBefore(v, s);
})(document, 'script');
</script>
```

**⚠️ CRITICAL NOTES:**
- `persistence` is set to `false` to ensure Voiceflow uses our custom user_id and session_id instead of generating its own IDs.
- `voice` parameter has been removed as it's not supported in the new project schema (was causing ZodError)

---

## 🔄 Usage in Simulation Components

### Before (Old Implementation)
```typescript
// Manual ID management
const controller = createKPController();
await controller.initialize(userId, sessionToken);
```

### After (New Implementation)
```typescript
// Automatic ID management with Supabase sync
const { user } = useAuth();
const controller = createKPController(user.id); // Passes Supabase user ID
await controller.initialize(); // IDs loaded automatically, user_id synced with Supabase

// Get IDs if needed
const { user_id, session_id } = controller.getIds();
console.log('Using IDs:', user_id, session_id);
// user_id will match the Supabase user.id
```

---

## 🔗 Supabase User ID Synchronization

### How It Works

The system now synchronizes Voiceflow's `user_id` with the authenticated Supabase user ID. This ensures that:

1. **Voiceflow data can be matched to actual users**: When Make.com receives webhooks with `user_id`, it matches the authenticated Supabase user
2. **Consistent identity across systems**: Same user ID used in both Voiceflow conversations and Supabase database
3. **No duplicate ID systems**: Eliminates the previous problem of having separate random UUIDs for Voiceflow

### Implementation Flow

```typescript
// 1. User authenticates with Supabase
const { user } = useAuth(); // user.id = "550e8400-e29b-41d4-a716-446655440000"

// 2. Create Voiceflow controller with Supabase user ID
const controller = createKPController(user.id);
// This passes user.id to VoiceflowController constructor

// 3. VoiceflowController uses Supabase user ID as Voiceflow user_id
constructor(config: VoiceflowConfig, supabaseUserId?: string) {
  const persistentIds = getPersistentIds(config.simulationType, supabaseUserId);
  this.userId = persistentIds.user_id; // Will be Supabase user.id
  // ...
}

// 4. Voiceflow widget receives the Supabase user ID
window.voiceflow.chat.load({
  user: {
    id: user.id, // Supabase user ID: "550e8400-e29b-41d4-a716-446655440000"
    data: {
      session_id: "session_1698765432_a1b2c3d4e5" // Generated session ID
    }
  }
});
```

### localStorage Behavior

When a Supabase user ID is provided:
- **user_id**: Always uses the provided Supabase user ID and stores it in localStorage (e.g., `kp_user_id`)
- **session_id**: Generated once and persists across page reloads in localStorage (e.g., `kp_session_id`)

This means:
- ✅ Same user_id for authenticated user across all sessions
- ✅ Same session_id for current simulation (persists across page reloads)
- ✅ Make.com webhooks can match to Supabase users
- ✅ Different localStorage keys for KP vs FSP simulations

### Console Output Example

```javascript
🎮 VoiceflowController created for KP:
{
  user_id: "550e8400-e29b-41d4-a716-446655440000",  // Supabase user ID
  session_id: "session_1698765432_a1b2c3d4e5",
  projectID: "690664399c414573ccceb427",
  supabase_synced: true  // Indicates Supabase sync is active
}
```

---

## 🧪 Testing Checklist

### ✅ Persistence Tests
- [ ] Reload page → Same user_id (Supabase) and session_id
- [ ] Navigate between Patient/Examiner evaluations → Same session_id
- [ ] user_id matches authenticated Supabase user.id
- [ ] Clear localStorage → New session_id generated, but user_id remains Supabase user.id
- [ ] KP and FSP use different localStorage keys

### ✅ Console Verification
```javascript
// In browser console:
localStorage.getItem('kp_user_id')      // Should return Supabase user.id (e.g., "550e8400-e29b-41d4-a716-446655440000")
localStorage.getItem('kp_session_id')   // Should return session_TIMESTAMP_RANDOM
localStorage.getItem('fsp_user_id')     // Should return SAME Supabase user.id
localStorage.getItem('fsp_session_id')  // Should return different session ID (FSP has separate sessions)

// Verify Supabase sync:
// The user_id in localStorage should match the authenticated user's Supabase ID
```

### ✅ Voiceflow Function Tests
```javascript
// In Voiceflow function:
console.log('User ID:', args.inputVars.user_id);      // Should match Supabase user.id
console.log('Session ID:', args.inputVars.session_id); // Should match localStorage

// Verify the user_id is a Supabase user ID, not a random UUID
```

### ✅ Make.com Webhook Tests
- [ ] Patient evaluation sends user_id (Supabase) and session_id
- [ ] Examiner evaluation sends SAME user_id and session_id
- [ ] Both webhooks can be matched by session_id
- [ ] user_id in webhook matches authenticated Supabase user
- [ ] Webhook data can be linked back to Supabase users table

---

## 🔧 Reset Functions

### Reset Entire Simulation
```typescript
import { resetKPSimulation, resetFSPSimulation } from '@/utils/voiceflowIntegration';

// Clear all KP IDs
resetKPSimulation();

// Clear all FSP IDs
resetFSPSimulation();
```

### Manual localStorage Reset
```javascript
// In browser console:
localStorage.removeItem('kp_user_id');
localStorage.removeItem('kp_session_id');
localStorage.removeItem('fsp_user_id');
localStorage.removeItem('fsp_session_id');
```

---

## 📱 Make.com Webhook Integration

### Expected Payload Structure

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "session_1698765432_a1b2c3d4e5",
  "evaluation_type": "patient",
  "score": 85,
  "feedback": "Good performance"
}
```

### Matching Patient and Examiner Evaluations

Both evaluations will share the same `session_id`, allowing Make.com to:
1. Receive Patient evaluation with session_id
2. Receive Examiner evaluation with SAME session_id
3. Match and combine both evaluations
4. Generate comprehensive report

---

## ⚠️ Common Issues & Solutions

### Issue: IDs changing on page reload
**Solution:** Check browser console for localStorage errors. Ensure localStorage is enabled.

### Issue: Different session_id for Patient vs Examiner
**Solution:** Verify that page is NOT clearing localStorage between evaluations.

### Issue: KP and FSP using same IDs
**Solution:** Check that simulationType is correctly passed to controllers.

### Issue: Widget not loading
**Solution:** Check console for script loading errors. Verify projectID is correct.

---

## 📊 Project IDs Reference

| Simulation | Project ID | Version ID | Version |
|-----------|------------|------------|---------|
| **KP** | `690664399c414573ccceb427` | `690664399c414573ccceb428` | production |
| **FSP** | `690664339c414573ccceb410` | `690664339c414573ccceb411` | production |

---

## 🎓 Best Practices

1. **Never manually delete localStorage IDs** unless intentionally resetting simulation
2. **Always use the provided reset functions** for clean simulation restarts
3. **Log IDs in console during development** to verify persistence
4. **Test the complete flow** (Patient → Examiner → Make.com) before deployment
5. **Monitor Make.com webhooks** to ensure both evaluations arrive with matching session_ids

---

## 📝 Migration Notes

### Changes from Previous Implementation

1. **Removed** manual userId/sessionToken parameters from `initialize()`
2. **Added** automatic localStorage-based ID persistence
3. **Updated** widget configuration to modern Voiceflow API
4. **Simplified** controller creation (no ID parameters needed)
5. **Added** separate reset functions for KP and FSP

### Breaking Changes

- `controller.initialize(userId, sessionToken)` → `controller.initialize()`
- `updateSessionVariables()` method removed (no longer needed)
- Constructor no longer accepts userId/sessionToken parameters

---

## ✅ Success Criteria

The implementation is successful when:

1. ✅ user_id matches authenticated Supabase user.id
2. ✅ session_id persists across page reloads
3. ✅ Patient and Examiner evaluations use SAME user_id and session_id
4. ✅ KP and FSP simulations use separate localStorage keys for sessions
5. ✅ Make.com receives user_id (Supabase) and session_id from both evaluations
6. ✅ Widget loads without console errors
7. ✅ Voiceflow data can be matched to actual Supabase users
8. ✅ Console shows `supabase_synced: true` when controller is created

---

**Last Updated:** November 3, 2025
**Author:** Claude Code
**Version:** 2.1.1 (Refactored with Persistent IDs + Supabase Sync)

**Changelog:**
- v2.1.1: Removed `voice` parameter to fix ZodError with new Voiceflow project schema
- v2.1.0: Added Supabase user ID synchronization
- v2.0.0: Initial refactor with persistent ID management
