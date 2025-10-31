/**
 * Persistent ID Manager for Voiceflow Widget Integration
 *
 * Manages user_id and session_id persistence across page reloads to ensure:
 * - Consistent user tracking across Patient and Examiner evaluations
 * - Session continuity for proper Make.com webhook integration
 * - Separate IDs for KP and FSP simulations
 */

export type SimulationType = 'kp' | 'fsp';

export interface PersistentIds {
  user_id: string;
  session_id: string;
}

/**
 * Get or create persistent user_id and session_id for a simulation type
 * Uses localStorage to maintain IDs across page reloads
 */
export function getPersistentIds(simulationType: SimulationType): PersistentIds {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn('⚠️ localStorage not available - generating temporary IDs');
    return generateTemporaryIds();
  }

  const userKey = `${simulationType}_user_id`;
  const sessionKey = `${simulationType}_session_id`;

  // Get or create user_id
  let userId = localStorage.getItem(userKey);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(userKey, userId);
    console.log(`✅ Created new ${simulationType.toUpperCase()} user_id:`, userId);
  } else {
    console.log(`✅ Retrieved existing ${simulationType.toUpperCase()} user_id:`, userId);
  }

  // Get or create session_id
  let sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(sessionKey, sessionId);
    console.log(`✅ Created new ${simulationType.toUpperCase()} session_id:`, sessionId);
  } else {
    console.log(`✅ Retrieved existing ${simulationType.toUpperCase()} session_id:`, sessionId);
  }

  return {
    user_id: userId,
    session_id: sessionId
  };
}

/**
 * Generate a unique user ID using crypto.randomUUID() or fallback
 */
function generateUserId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a unique session ID with timestamp
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate temporary IDs (when localStorage is not available)
 */
function generateTemporaryIds(): PersistentIds {
  return {
    user_id: generateUserId(),
    session_id: generateSessionId()
  };
}

/**
 * Reset session for a simulation type (starts fresh simulation)
 * Clears both user_id and session_id from localStorage
 */
export function resetSimulation(simulationType: SimulationType): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn('⚠️ localStorage not available - cannot reset simulation');
    return;
  }

  const userKey = `${simulationType}_user_id`;
  const sessionKey = `${simulationType}_session_id`;

  localStorage.removeItem(userKey);
  localStorage.removeItem(sessionKey);

  console.log(`✅ Reset ${simulationType.toUpperCase()} simulation - cleared user_id and session_id`);
}

/**
 * Reset only the session_id (keeps the same user_id)
 * Useful for starting a new simulation while maintaining user identity
 */
export function resetSession(simulationType: SimulationType): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn('⚠️ localStorage not available - cannot reset session');
    return;
  }

  const sessionKey = `${simulationType}_session_id`;
  localStorage.removeItem(sessionKey);

  console.log(`✅ Reset ${simulationType.toUpperCase()} session - cleared session_id only`);
}

/**
 * Get current IDs without creating new ones (returns null if not exists)
 */
export function getCurrentIds(simulationType: SimulationType): PersistentIds | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  const userKey = `${simulationType}_user_id`;
  const sessionKey = `${simulationType}_session_id`;

  const userId = localStorage.getItem(userKey);
  const sessionId = localStorage.getItem(sessionKey);

  if (!userId || !sessionId) {
    return null;
  }

  return {
    user_id: userId,
    session_id: sessionId
  };
}

/**
 * Check if IDs exist in localStorage
 */
export function hasExistingIds(simulationType: SimulationType): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  const userKey = `${simulationType}_user_id`;
  const sessionKey = `${simulationType}_session_id`;

  return !!(localStorage.getItem(userKey) && localStorage.getItem(sessionKey));
}

/**
 * Log current IDs for debugging
 */
export function logCurrentIds(simulationType: SimulationType): void {
  const ids = getCurrentIds(simulationType);

  if (ids) {
    console.log(`📊 Current ${simulationType.toUpperCase()} IDs:`, {
      user_id: ids.user_id,
      session_id: ids.session_id,
      exists_in_storage: true
    });
  } else {
    console.log(`📊 No existing ${simulationType.toUpperCase()} IDs in localStorage`);
  }
}
