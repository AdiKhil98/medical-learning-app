# Voiceflow Widget Integration - Refactored Implementation

## 📋 Overview

This document describes the refactored Voiceflow widget integration with persistent user and session ID management for KP and FSP simulations.

---

## 🎯 Key Features

### ✅ Persistent ID Management
- **user_id** and **session_id** persist across page reloads using localStorage
- Separate storage keys for KP and FSP simulations
- IDs maintain consistency throughout Patient → Examiner evaluation flow

### ✅ Modern Voiceflow Configuration
- Uses `window.voiceflow.chat.load({...})` with modern API
- Implements `user.data.session_id` for proper Make.com webhook integration
- Enables `assistant.persistence: 'localStorage'` for conversation stability

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
// Get or create persistent IDs
getPersistentIds(simulationType: 'kp' | 'fsp'): { user_id: string; session_id: string }

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
const controller = createKPController();
// Automatically loads/creates persistent IDs from localStorage
// No need to pass user_id or session_id manually
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
    persistence: 'localStorage',
    header: {
      title: 'KP Simulation Assistant'
    },
    inputPlaceholder: 'Geben Sie Ihre Nachricht ein...'
  },
  voice: {
    url: 'https://runtime-api.voiceflow.com'
  }
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
        persistence: 'localStorage',
        header: {
          title: 'KP Simulation Assistant'
        },
        inputPlaceholder: 'Geben Sie Ihre Nachricht ein...'
      },
      voice: {
        url: 'https://runtime-api.voiceflow.com'
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
        persistence: 'localStorage',
        header: {
          title: 'FSP Simulation Assistant'
        },
        inputPlaceholder: 'Geben Sie Ihre Nachricht ein...'
      },
      voice: {
        url: 'https://runtime-api.voiceflow.com'
      }
    });
  };
  v.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  v.type = 'text/javascript';
  s.parentNode.insertBefore(v, s);
})(document, 'script');
</script>
```

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
// Automatic ID management
const controller = createKPController();
await controller.initialize(); // IDs loaded automatically from localStorage

// Get IDs if needed
const { user_id, session_id } = controller.getIds();
console.log('Using IDs:', user_id, session_id);
```

---

## 🧪 Testing Checklist

### ✅ Persistence Tests
- [ ] Reload page → Same user_id and session_id
- [ ] Navigate between Patient/Examiner evaluations → Same session_id
- [ ] Clear localStorage → New IDs generated
- [ ] KP and FSP use different localStorage keys

### ✅ Console Verification
```javascript
// In browser console:
localStorage.getItem('kp_user_id')      // Should return UUID
localStorage.getItem('kp_session_id')   // Should return session_TIMESTAMP_RANDOM
localStorage.getItem('fsp_user_id')     // Should return different UUID
localStorage.getItem('fsp_session_id')  // Should return different session ID
```

### ✅ Voiceflow Function Tests
```javascript
// In Voiceflow function:
console.log('User ID:', args.inputVars.user_id);      // Should match localStorage
console.log('Session ID:', args.inputVars.session_id); // Should match localStorage
```

### ✅ Make.com Webhook Tests
- [ ] Patient evaluation sends user_id and session_id
- [ ] Examiner evaluation sends SAME user_id and session_id
- [ ] Both webhooks can be matched by session_id

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

1. ✅ user_id persists across page reloads
2. ✅ session_id persists across page reloads
3. ✅ Patient and Examiner evaluations use SAME session_id
4. ✅ KP and FSP simulations use separate localStorage keys
5. ✅ Make.com receives matching session_id from both evaluations
6. ✅ Widget loads without console errors
7. ✅ Conversation history persists with `localStorage` persistence

---

**Last Updated:** October 31, 2025
**Author:** Claude Code
**Version:** 2.0 (Refactored with Persistent IDs)
