import { supabase } from './supabase';
import { logger } from '@/utils/logger';
import { SecureLogger } from './security';

export type SimulationType = 'kp' | 'fsp';

export interface SimulationUsageLog {
  id: string;
  user_id: string;
  simulation_type: SimulationType;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  counted_toward_usage: boolean;
  session_token: string;
}

/**
 * SIMPLIFIED Simulation Tracking Service
 *
 * Core Logic:
 * - Start simulation: Create row in simulation_usage_logs with started_at
 * - At 5-minute mark: Call markSimulationCounted() to increment counter
 * - End simulation: Update with ended_at and duration_seconds
 * - Database determines: duration >= 300 seconds (5 minutes) = counted
 */
class SimulationTrackingService {
  // Default timeout for RPC calls (10 seconds)
  private readonly RPC_TIMEOUT_MS = 10000;

  /**
   * Generate unique session token using cryptographically secure random UUID
   * SECURITY: Uses crypto.randomUUID() instead of Math.random() to prevent token prediction
   * Returns pure UUID format (no prefix) for database compatibility
   */
  private generateSessionToken(): string {
    try {
      // Use crypto.randomUUID() for cryptographically secure token generation
      // This prevents attackers from predicting session tokens
      // Returns pure UUID format for database uuid type compatibility
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }

      // Fallback for environments without crypto.randomUUID()
      logger.warn('⚠️ crypto.randomUUID() not available, using fallback UUID generation');
      return this.generateUUIDFallback();
    } catch (error) {
      logger.error('❌ Error generating session token:', error);
      // Last resort fallback
      return this.generateUUIDFallback();
    }
  }

  /**
   * Fallback UUID v4 generator for environments without crypto.randomUUID()
   * Uses crypto.getRandomValues() if available, otherwise Math.random() (less secure)
   */
  private generateUUIDFallback(): string {
    // Try to use crypto.getRandomValues() for better randomness
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);

      // Set version (4) and variant bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      // Convert to UUID format
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }

    // Last resort: Math.random() (not cryptographically secure, but works)
    logger.warn('⚠️ Using Math.random() for UUID generation (not cryptographically secure)');
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Wrap a promise with a timeout to prevent UI hangs
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = this.RPC_TIMEOUT_MS): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs)),
    ]);
  }

  /**
   * Validate session token format (UUID v4)
   * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12 hex digits)
   */
  private isValidSessionToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    // UUID v4 regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(token);
  }

  /**
   * ISSUE #9 FIX: Validate RPC response structure
   */
  private validateRpcResponse(data: any, requiredFields: string[] = ['success']): { valid: boolean; error?: string } {
    if (data === null || data === undefined) {
      return { valid: false, error: 'RPC returned null or undefined' };
    }

    if (typeof data !== 'object') {
      return { valid: false, error: `RPC returned invalid type: ${typeof data}` };
    }

    for (const field of requiredFields) {
      if (!(field in data)) {
        return { valid: false, error: `Missing required field in response: ${field}` };
      }
    }

    return { valid: true };
  }

  /**
   * Clean up orphaned sessions (sessions with ended_at = NULL)
   * This prevents 409 Conflict errors when starting new simulations
   * UPDATED: Uses database RPC function to properly handle trigger execution
   */
  private async cleanupOrphanedSessions(userId: string): Promise<void> {
    try {
      console.log('🧹🧹🧹 CLEANUP: Calling RPC to cleanup orphaned sessions for user:', userId);

      // Call database function to cleanup orphaned sessions
      // This properly handles the duration calculation trigger
      const { data, error } = await this.withTimeout(
        supabase.rpc('cleanup_orphaned_sessions_for_user', {
          p_user_id: userId,
        })
      );

      if (error) {
        console.error('❌ CLEANUP: RPC error:', error);
        logger.error('❌ Error calling cleanup RPC:', error);
        return;
      }

      if (data) {
        console.log('✅ CLEANUP: RPC response:', data);
        if (data.closed_count > 0) {
          console.warn(`⚠️ CLEANUP: ${data.message}`);
          // Wait briefly for database to commit
          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          console.log('✅ CLEANUP: No orphaned sessions found');
        }
      }

      console.log('✅ CLEANUP: Complete - ready to start new session');
    } catch (error) {
      console.error('❌ CLEANUP: Exception:', error);
      logger.error('❌ Exception in cleanupOrphanedSessions:', error);
      // Don't throw - this is cleanup, we want to continue even if it fails
    }
  }

  /**
   * Start a new simulation session
   * Simply creates a database row with started_at timestamp
   */
  async startSimulation(simulationType: SimulationType): Promise<{
    success: boolean;
    sessionToken?: string;
    error?: string;
  }> {
    try {
      logger.info('📊 Starting simulation:', simulationType);

      // DEBUG: Check session state
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      logger.info('🔐 Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length,
        expiresAt: session?.expires_at,
        sessionError: sessionError?.message,
      });

      // If no session, try to refresh
      if (!session) {
        logger.info('⚠️ No session found, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          logger.error('❌ Session refresh failed:', refreshError);
          // ISSUE #18 FIX: Standardize to German
          return { success: false, error: 'Sitzung abgelaufen - bitte erneut anmelden' };
        }
        logger.info('✅ Session refreshed successfully');
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      logger.info('👤 User check:', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        userError: userError?.message,
      });

      if (!user) {
        // ISSUE #18 FIX: Standardize to German
        return { success: false, error: 'Nicht angemeldet' };
      }

      // CRITICAL FIX: Clean up any orphaned sessions before starting new one
      // This prevents 409 Conflict errors from the unique constraint
      await this.cleanupOrphanedSessions(user.id);

      const sessionToken = this.generateSessionToken();
      logger.info('🎫 Session token:', sessionToken);

      // Call database function to start session
      logger.info('📤 Calling RPC start_simulation_session with:', {
        p_user_id: user.id,
        p_simulation_type: simulationType,
        p_session_token: sessionToken,
      });

      const { data, error } = await this.withTimeout(
        supabase.rpc('start_simulation_session', {
          p_user_id: user.id,
          p_simulation_type: simulationType,
          p_session_token: sessionToken,
        })
      );

      logger.info('📥 RPC response:', { data, error });

      if (error) {
        logger.error('❌ Database error:', error);
        logger.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return { success: false, error: error.message };
      }

      // ISSUE #9 FIX: Validate RPC response structure
      const validation = this.validateRpcResponse(data, ['success']);
      if (!validation.valid) {
        logger.error('❌ Invalid RPC response:', validation.error);
        return { success: false, error: validation.error };
      }

      if (!data.success) {
        logger.error('❌ Failed to start session:', data);
        logger.error('❌ Function returned error:', data.message || data.reason);
        // Database function returns 'message' and 'reason' fields, not 'error'
        return { success: false, error: data.message || data.reason || 'Unbekannter Fehler' };
      }

      logger.info('✅ Simulation started:', data);
      return { success: true, sessionToken };
    } catch (error: any) {
      logger.error('❌ Exception in startSimulation:', error);
      // ISSUE #18 FIX: Standardize to German
      return { success: false, error: error.message || 'Systemfehler' };
    }
  }

  /**
   * Mark simulation as counted (called at 5-minute mark from timer)
   * Database validates that >= 5 minutes have elapsed and increments counter
   */
  async markSimulationCounted(sessionToken: string): Promise<{
    success: boolean;
    error?: string;
    alreadyCounted?: boolean;
  }> {
    try {
      logger.info('✓ Marking simulation as counted:', sessionToken);

      // ISSUE #19 FIX: Validate session token format
      if (!this.isValidSessionToken(sessionToken)) {
        logger.error('❌ Invalid session token format in markSimulationCounted');
        return { success: false, error: 'Ungültiges Sitzungstoken' };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // ISSUE #18 FIX: Standardize to German
        return { success: false, error: 'Nicht angemeldet' };
      }

      // Call database function - it handles validation and counter increment
      const { data, error } = await supabase.rpc('mark_simulation_counted', {
        p_session_token: sessionToken,
        p_user_id: user.id,
      });

      if (error) {
        logger.error('❌ Database error marking counted:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        logger.error('❌ Failed to mark as counted:', data);
        return {
          success: false,
          // ISSUE #18 FIX: Standardize to German
          error: data.error || 'Validierung fehlgeschlagen',
          alreadyCounted: data.already_counted,
        };
      }

      logger.info('✅ Simulation marked as counted:', data);
      logger.info('⏱️ Elapsed time:', data.elapsed_seconds, 'seconds');

      return {
        success: true,
        alreadyCounted: data.already_counted,
      };
    } catch (error: any) {
      logger.error('❌ Exception in markSimulationCounted:', error);
      // ISSUE #18 FIX: Standardize to German
      return { success: false, error: error.message || 'Systemfehler' };
    }
  }

  /**
   * End simulation session
   * Updates ended_at and duration_seconds
   * Database determines if it should be counted based on duration
   */
  async endSimulation(sessionToken: string): Promise<{
    success: boolean;
    counted?: boolean;
    durationSeconds?: number;
    error?: string;
  }> {
    try {
      logger.info('🏁 Ending simulation:', sessionToken);

      // ISSUE #19 FIX: Validate session token format
      if (!this.isValidSessionToken(sessionToken)) {
        logger.error('❌ Invalid session token format in endSimulation');
        return { success: false, error: 'Ungültiges Sitzungstoken' };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // ISSUE #18 FIX: Standardize to German
        return { success: false, error: 'Nicht angemeldet' };
      }

      // Call database function to end session
      const { data, error } = await supabase.rpc('end_simulation_session', {
        p_session_token: sessionToken,
        p_user_id: user.id,
      });

      if (error) {
        logger.error('❌ Database error ending session:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        logger.error('❌ Failed to end session:', data);
        // Database function returns 'message' field, not 'error'
        return { success: false, error: data.message || 'Unbekannter Fehler' };
      }

      logger.info('✅ Simulation ended:', data);
      logger.info('⏱️ Duration:', data.duration_seconds, 'seconds');
      logger.info('📊 Counted:', data.counted_toward_usage ? 'YES (>= 5 min)' : 'NO (< 5 min)');

      return {
        success: true,
        counted: data.counted_toward_usage,
        durationSeconds: data.duration_seconds,
      };
    } catch (error: any) {
      logger.error('❌ Exception in endSimulation:', error);
      // ISSUE #18 FIX: Standardize to German
      return { success: false, error: error.message || 'Systemfehler' };
    }
  }

  /**
   * Get current simulation status (for debugging)
   */
  async getSimulationStatus(sessionToken: string): Promise<SimulationUsageLog | null> {
    try {
      // SECURITY FIX: Validate session token format
      if (!this.isValidSessionToken(sessionToken)) {
        logger.error('❌ Invalid session token format');
        return null;
      }

      // SECURITY FIX: Better auth validation
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        logger.error('❌ Auth error in getSimulationStatus:', authError.message);
        return null;
      }

      if (!user || !user.id) {
        logger.error('❌ Not authenticated or missing user ID');
        return null;
      }

      const { data, error } = await this.withTimeout(
        supabase
          .from('simulation_usage_logs')
          .select('*')
          .eq('session_token', sessionToken)
          .eq('user_id', user.id)
          .single()
      );

      if (error) {
        logger.error('❌ Error fetching simulation status:', error);
        return null;
      }

      // Verify the returned data belongs to the authenticated user
      if (data && data.user_id !== user.id) {
        logger.error('❌ Security violation: returned data does not belong to user');
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ Exception getting simulation status:', error);
      return null;
    }
  }

  /**
   * Get user's counted simulations (for analytics)
   */
  async getCountedSimulations(limit: number = 10): Promise<SimulationUsageLog[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('counted_toward_usage', true)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('❌ Error fetching counted simulations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ Exception getting counted simulations:', error);
      return [];
    }
  }

  // ============================================================================
  // BACKWARD COMPATIBILITY METHODS
  // These methods provide compatibility with the old API used by KP/FSP screens
  // TODO: Remove these once KP and FSP screens are updated to use the new API
  // ============================================================================

  /**
   * @deprecated Use markSimulationCounted() instead
   * Backward compatibility wrapper for old API
   */
  async markSimulationUsed(
    sessionToken: string,
    clientElapsedSeconds?: number
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('⚠️ DEPRECATED: markSimulationUsed() called. Use markSimulationCounted() instead.');
    logger.info('📊 Client reported:', clientElapsedSeconds, 'seconds (ignored - using server time)');

    // Call the new method
    const result = await this.markSimulationCounted(sessionToken);

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * @deprecated Use endSimulation() instead
   * Backward compatibility wrapper for old API
   */
  async updateSimulationStatus(
    sessionToken: string,
    status: string,
    durationSeconds?: number,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('⚠️ DEPRECATED: updateSimulationStatus() called. Use endSimulation() instead.');
    logger.info('📊 Status:', status, 'Duration:', durationSeconds, 'Metadata:', metadata);

    // Just end the simulation - the database will determine if it should be counted
    const result = await this.endSimulation(sessionToken);

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * @deprecated Heartbeat is no longer needed in the new system
   * This is a no-op for backward compatibility
   */
  async sendHeartbeat(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    // No-op - heartbeat is not used in the simplified system
    return { success: true };
  }

  /**
   * Check if user can start a simulation
   * Uses NEW database-driven quota system (user_simulation_quota table)
   * CRITICAL: Block only when remaining === 0
   */
  async canStartSimulation(simulationType: SimulationType): Promise<{
    allowed: boolean;
    reason?: string;
    message?: string;
    shouldUpgrade?: boolean;
    remaining?: number;
    totalLimit?: number;
  }> {
    try {
      logger.info('[Quota Check] Checking simulation access for type:', simulationType);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        logger.info('[Quota Check] Not authenticated');
        return {
          allowed: false,
          reason: 'not_authenticated',
          message: 'Nicht angemeldet',
          remaining: 0,
          totalLimit: 0,
        };
      }

      // Use NEW quota system database function
      const { data, error } = await supabase.rpc('can_start_simulation', {
        p_user_id: user.id,
      });

      if (error) {
        logger.error('[Quota Check] Error checking quota:', error);
        return {
          allowed: false,
          reason: 'database_error',
          message: 'Fehler bei der Überprüfung',
          remaining: 0,
          totalLimit: 0,
        };
      }

      logger.info('[Quota Check] Result:', {
        can_start: data.can_start,
        reason: data.reason,
        simulations_remaining: data.simulations_remaining,
        simulations_used: data.simulations_used,
        total_simulations: data.total_simulations,
      });

      // Check for existing active sessions (concurrency check)
      if (data.can_start) {
        const hasActiveSession = await this.hasActiveSession(user.id);
        if (hasActiveSession) {
          logger.error('[Quota Check] ❌ BLOCKED - User has active session');
          return {
            allowed: false,
            reason: 'concurrent_session',
            message: 'Sie haben bereits eine aktive Simulation',
            remaining: data.simulations_remaining || 0,
            totalLimit: data.total_simulations || 0,
          };
        }
      }

      // Return result based on quota check
      if (!data.can_start) {
        logger.error('[Quota Check] ❌ BLOCKED -', data.reason);
        return {
          allowed: false,
          reason: data.reason === 'quota_exceeded' ? 'limit_reached' : data.reason,
          message: data.message,
          shouldUpgrade: data.reason === 'quota_exceeded',
          remaining: data.simulations_remaining || 0,
          totalLimit: data.total_simulations || 0,
        };
      }

      logger.info('[Quota Check] ✅ ALLOWED - Remaining:', data.simulations_remaining);
      return {
        allowed: true,
        reason: data.reason,
        message: data.message,
        shouldUpgrade: false,
        remaining: data.simulations_remaining || 0,
        totalLimit: data.total_simulations || 0,
      };
    } catch (error: any) {
      logger.error('[Quota Check] Exception:', error);
      return {
        allowed: false,
        reason: 'system_error',
        message: 'Systemfehler bei der Validierung',
        remaining: 0,
        totalLimit: 0,
      };
    }
  }

  /**
   * Check if user has an active simulation session
   */
  private async hasActiveSession(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('simulation_usage_logs')
        .select('id')
        .eq('user_id', userId)
        .is('ended_at', null)
        .limit(1);

      if (error) {
        logger.error('[hasActiveSession] Error:', error);
        return false;
      }

      const hasActive = data && data.length > 0;
      logger.info('[hasActiveSession]', hasActive ? 'Found active session' : 'No active session');
      return hasActive;
    } catch (error) {
      logger.error('[hasActiveSession] Exception:', error);
      return false;
    }
  }

  /**
   * EDGE CASE HANDLING: Validate and fix data inconsistencies
   * Call this periodically or when suspicious data is detected
   */
  async validateAndFixUserData(userId: string): Promise<{
    fixed: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();

      if (error || !user) {
        issues.push('User not found');
        return { fixed: false, issues };
      }

      let needsUpdate = false;
      const updates: any = {};

      // CASE 1: NULL or 0 simulation_limit for paid tier
      if (user.subscription_tier && user.subscription_tier !== 'free' && user.subscription_tier !== 'unlimited') {
        if (!user.simulation_limit || user.simulation_limit <= 0) {
          const defaultLimit = this.getDefaultLimitForTier(user.subscription_tier);
          updates.simulation_limit = defaultLimit;
          issues.push(`Fixed NULL/0 limit for ${user.subscription_tier}: set to ${defaultLimit}`);
          needsUpdate = true;
        }
      }

      // CASE 2: Used count exceeds limit (should never happen)
      if (user.simulation_limit && user.simulations_used_this_month > user.simulation_limit) {
        updates.simulations_used_this_month = user.simulation_limit;
        issues.push(`Fixed used count exceeding limit: capped at ${user.simulation_limit}`);
        needsUpdate = true;
      }

      // CASE 3: Negative usage counts (data corruption)
      if (user.simulations_used_this_month < 0) {
        updates.simulations_used_this_month = 0;
        issues.push('Fixed negative monthly usage count');
        needsUpdate = true;
      }

      if (user.free_simulations_used < 0) {
        updates.free_simulations_used = 0;
        issues.push('Fixed negative free usage count');
        needsUpdate = true;
      }

      // Apply fixes if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase.from('users').update(updates).eq('id', userId);

        if (updateError) {
          logger.error('[Edge Case Fix] Error updating user:', updateError);
          return { fixed: false, issues };
        }

        logger.info('[Edge Case Fix] Applied fixes:', updates);
        return { fixed: true, issues };
      }

      return { fixed: false, issues: ['No issues found'] };
    } catch (error) {
      logger.error('[Edge Case Fix] Exception:', error);
      return { fixed: false, issues: ['Exception occurred'] };
    }
  }

  /**
   * Get default limit for a subscription tier
   * UNIVERSAL: Add custom tiers here as needed
   */
  private getDefaultLimitForTier(tier: string): number {
    const defaults: Record<string, number> = {
      basis: 30,
      profi: 60,
      unlimited: 999999,
      // Custom tiers
      custom_5: 5,
      custom_50: 50,
      custom_100: 100,
    };
    return defaults[tier] || 30; // Default to 30 if unknown
  }
}

export const simulationTracker = new SimulationTrackingService();
