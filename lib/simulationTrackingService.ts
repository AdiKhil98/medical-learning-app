import { supabase } from './supabase';
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
   * Generate unique session token
   */
  private generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `sim_${timestamp}_${randomPart}`;
  }

  /**
   * Wrap a promise with a timeout to prevent UI hangs
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = this.RPC_TIMEOUT_MS): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Validate session token format
   */
  private isValidSessionToken(token: string): boolean {
    if (!token || typeof token !== 'string' || token.length < 10) {
      return false;
    }
    return /^sim_[a-zA-Z0-9_]+$/.test(token);
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
   * Start a new simulation session
   * Simply creates a database row with started_at timestamp
   */
  async startSimulation(simulationType: SimulationType): Promise<{
    success: boolean;
    sessionToken?: string;
    error?: string
  }> {
    try {
      console.log('📊 Starting simulation:', simulationType);

      // DEBUG: Check session state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        tokenLength: session?.access_token?.length,
        expiresAt: session?.expires_at,
        sessionError: sessionError?.message
      });

      // If no session, try to refresh
      if (!session) {
        console.log('⚠️ No session found, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error('❌ Session refresh failed:', refreshError);
          return { success: false, error: 'Session expired - please log in again' };
        }
        console.log('✅ Session refreshed successfully');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 User check:', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        userError: userError?.message
      });

      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const sessionToken = this.generateSessionToken();
      console.log('🎫 Session token:', sessionToken);

      // Call database function to start session
      console.log('📤 Calling RPC start_simulation_session with:', {
        p_user_id: user.id,
        p_simulation_type: simulationType,
        p_session_token: sessionToken
      });

      const { data, error } = await this.withTimeout(
        supabase.rpc('start_simulation_session', {
          p_user_id: user.id,
          p_simulation_type: simulationType,
          p_session_token: sessionToken
        })
      );

      console.log('📥 RPC response:', { data, error });

      if (error) {
        console.error('❌ Database error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error: error.message };
      }

      // ISSUE #9 FIX: Validate RPC response structure
      const validation = this.validateRpcResponse(data, ['success']);
      if (!validation.valid) {
        console.error('❌ Invalid RPC response:', validation.error);
        return { success: false, error: validation.error };
      }

      if (!data.success) {
        console.error('❌ Failed to start session:', data);
        console.error('❌ Function returned error:', data.error);
        return { success: false, error: data.error || 'Unknown error' };
      }

      console.log('✅ Simulation started:', data);
      return { success: true, sessionToken };

    } catch (error: any) {
      console.error('❌ Exception in startSimulation:', error);
      return { success: false, error: error.message || 'System error' };
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
      console.log('✓ Marking simulation as counted:', sessionToken);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Call database function - it handles validation and counter increment
      const { data, error } = await supabase.rpc('mark_simulation_counted', {
        p_session_token: sessionToken,
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ Database error marking counted:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('❌ Failed to mark as counted:', data);
        return {
          success: false,
          error: data.error || 'Validation failed',
          alreadyCounted: data.already_counted
        };
      }

      console.log('✅ Simulation marked as counted:', data);
      console.log('⏱️ Elapsed time:', data.elapsed_seconds, 'seconds');

      return {
        success: true,
        alreadyCounted: data.already_counted
      };

    } catch (error: any) {
      console.error('❌ Exception in markSimulationCounted:', error);
      return { success: false, error: error.message || 'System error' };
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
    error?: string
  }> {
    try {
      console.log('🏁 Ending simulation:', sessionToken);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Call database function to end session
      const { data, error } = await supabase.rpc('end_simulation_session', {
        p_session_token: sessionToken,
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ Database error ending session:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('❌ Failed to end session:', data);
        return { success: false, error: data.error || 'Unknown error' };
      }

      console.log('✅ Simulation ended:', data);
      console.log('⏱️ Duration:', data.duration_seconds, 'seconds');
      console.log('📊 Counted:', data.counted_toward_usage ? 'YES (>= 5 min)' : 'NO (< 5 min)');

      return {
        success: true,
        counted: data.counted_toward_usage,
        durationSeconds: data.duration_seconds
      };

    } catch (error: any) {
      console.error('❌ Exception in endSimulation:', error);
      return { success: false, error: error.message || 'System error' };
    }
  }

  /**
   * Get current simulation status (for debugging)
   */
  async getSimulationStatus(sessionToken: string): Promise<SimulationUsageLog | null> {
    try {
      // SECURITY FIX: Validate session token format
      if (!this.isValidSessionToken(sessionToken)) {
        console.error('❌ Invalid session token format');
        return null;
      }

      // SECURITY FIX: Better auth validation
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('❌ Auth error in getSimulationStatus:', authError.message);
        return null;
      }

      if (!user || !user.id) {
        console.error('❌ Not authenticated or missing user ID');
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
        console.error('❌ Error fetching simulation status:', error);
        return null;
      }

      // Verify the returned data belongs to the authenticated user
      if (data && data.user_id !== user.id) {
        console.error('❌ Security violation: returned data does not belong to user');
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Exception getting simulation status:', error);
      return null;
    }
  }

  /**
   * Get user's counted simulations (for analytics)
   */
  async getCountedSimulations(limit: number = 10): Promise<SimulationUsageLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('counted_toward_usage', true)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching counted simulations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception getting counted simulations:', error);
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
    console.log('⚠️ DEPRECATED: markSimulationUsed() called. Use markSimulationCounted() instead.');
    console.log('📊 Client reported:', clientElapsedSeconds, 'seconds (ignored - using server time)');

    // Call the new method
    const result = await this.markSimulationCounted(sessionToken);

    return {
      success: result.success,
      error: result.error
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
    console.log('⚠️ DEPRECATED: updateSimulationStatus() called. Use endSimulation() instead.');
    console.log('📊 Status:', status, 'Duration:', durationSeconds, 'Metadata:', metadata);

    // Just end the simulation - the database will determine if it should be counted
    const result = await this.endSimulation(sessionToken);

    return {
      success: result.success,
      error: result.error
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
   * Uses database function for consistent validation logic
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
      console.log('[Backend Validation] Checking simulation access for type:', simulationType);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Backend Validation] Not authenticated');
        return {
          allowed: false,
          reason: 'not_authenticated',
          message: 'Nicht angemeldet',
          remaining: 0,
          totalLimit: 0
        };
      }

      // Use database function for validation
      const { data, error } = await supabase
        .rpc('check_simulation_limit_before_start', { p_user_id: user.id })
        .single();

      if (error) {
        console.error('[Backend Validation] Error checking limit:', error);
        return {
          allowed: false,
          reason: 'database_error',
          message: 'Fehler bei der Überprüfung',
          remaining: 0,
          totalLimit: 0
        };
      }

      console.log('[Backend Validation] Limit check result:', {
        canStart: data.can_start,
        remaining: data.remaining,
        totalLimit: data.total_limit,
        used: data.used_count,
        calculation: `${data.total_limit} - ${data.used_count} = ${data.remaining}`
      });

      // CRITICAL: Only block if remaining === 0
      if (!data.can_start || data.remaining === 0) {
        console.error('[Backend Validation] ❌ BLOCKED - Limit reached:', data.reason);
        return {
          allowed: false,
          reason: data.remaining === 0 ? 'limit_reached' : 'blocked',
          message: data.reason,
          shouldUpgrade: data.remaining === 0,
          remaining: data.remaining,
          totalLimit: data.total_limit
        };
      }

      // Check for existing active sessions (concurrency check)
      const hasActiveSession = await this.hasActiveSession(user.id);
      if (hasActiveSession) {
        console.error('[Backend Validation] ❌ BLOCKED - User has active session');
        return {
          allowed: false,
          reason: 'concurrent_session',
          message: 'Sie haben bereits eine aktive Simulation',
          remaining: data.remaining,
          totalLimit: data.total_limit
        };
      }

      // All checks passed
      console.log('[Backend Validation] ✅ ALLOWED - Remaining:', data.remaining);
      return {
        allowed: true,
        reason: 'allowed',
        message: data.reason,
        shouldUpgrade: false,
        remaining: data.remaining,
        totalLimit: data.total_limit
      };

    } catch (error: any) {
      console.error('[Backend Validation] Exception:', error);
      return {
        allowed: false,
        reason: 'system_error',
        message: 'Systemfehler bei der Validierung',
        remaining: 0,
        totalLimit: 0
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
        console.error('[hasActiveSession] Error:', error);
        return false;
      }

      const hasActive = (data && data.length > 0);
      console.log('[hasActiveSession]', hasActive ? 'Found active session' : 'No active session');
      return hasActive;
    } catch (error) {
      console.error('[hasActiveSession] Exception:', error);
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
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

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
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('[Edge Case Fix] Error updating user:', updateError);
          return { fixed: false, issues };
        }

        console.log('[Edge Case Fix] Applied fixes:', updates);
        return { fixed: true, issues };
      }

      return { fixed: false, issues: ['No issues found'] };

    } catch (error) {
      console.error('[Edge Case Fix] Exception:', error);
      return { fixed: false, issues: ['Exception occurred'] };
    }
  }

  /**
   * Get default limit for a subscription tier
   * UNIVERSAL: Add custom tiers here as needed
   */
  private getDefaultLimitForTier(tier: string): number {
    const defaults: Record<string, number> = {
      'basis': 30,
      'profi': 60,
      'unlimited': 999999,
      // Custom tiers
      'custom_5': 5,
      'custom_50': 50,
      'custom_100': 100
    };
    return defaults[tier] || 30; // Default to 30 if unknown
  }
}

export const simulationTracker = new SimulationTrackingService();
