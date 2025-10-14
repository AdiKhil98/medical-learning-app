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

  /**
   * Generate unique session token
   */
  private generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `sim_${timestamp}_${randomPart}`;
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const sessionToken = this.generateSessionToken();
      console.log('🎫 Session token:', sessionToken);

      // Call database function to start session
      const { data, error } = await supabase.rpc('start_simulation_session', {
        p_user_id: user.id,
        p_simulation_type: simulationType,
        p_session_token: sessionToken
      });

      if (error) {
        console.error('❌ Database error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('❌ Failed to start session:', data);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching simulation status:', error);
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
   * UNIVERSAL: Performs backend validation for ALL subscription tiers and limits
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
      console.log('[Backend Validation] UNIVERSAL CHECK - Simulation type:', simulationType);

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

      // Get user's current subscription data with FRESH query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status, simulation_limit, simulations_used_this_month, free_simulations_used')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        console.error('[Backend Validation] Error fetching user:', userError);
        return {
          allowed: false,
          reason: 'database_error',
          message: 'Fehler beim Abrufen der Benutzerdaten',
          remaining: 0,
          totalLimit: 0
        };
      }

      // CRITICAL: Sanitize and validate data to handle edge cases
      const sanitizedData = {
        tier: userData.subscription_tier || 'free',
        status: userData.subscription_status || 'inactive',
        limit: Math.max(0, userData.simulation_limit || 0),
        usedMonthly: Math.max(0, userData.simulations_used_this_month || 0),
        usedFree: Math.max(0, userData.free_simulations_used || 0)
      };

      console.log('[Backend Validation] Sanitized data:', sanitizedData);

      // UNIVERSAL: Calculate limits for ANY tier
      let canStart = false;
      let reason = '';
      let message = '';
      let shouldUpgrade = false;
      let totalLimit = 0;
      let usedCount = 0;
      let remaining = 0;

      if (!sanitizedData.tier || sanitizedData.tier === 'free' || sanitizedData.status !== 'active') {
        // ===== FREE TIER: Always 3 simulations (lifetime) =====
        totalLimit = 3;
        usedCount = sanitizedData.usedFree;
        remaining = Math.max(0, totalLimit - usedCount);
        canStart = remaining > 0;

        if (!canStart) {
          reason = 'free_limit_reached';
          message = `Sie haben alle ${totalLimit} kostenlosen Simulationen verbraucht`;
          shouldUpgrade = true;
          console.log(`[Backend Validation] FREE TIER - BLOCKED (${usedCount}/${totalLimit})`);
        } else {
          console.log(`[Backend Validation] FREE TIER - Allowed (${remaining}/${totalLimit} remaining)`);
        }
      } else if (sanitizedData.tier === 'unlimited') {
        // ===== UNLIMITED TIER: No limit =====
        totalLimit = 999999;
        usedCount = sanitizedData.usedMonthly;
        remaining = 999999;
        canStart = true;
        console.log(`[Backend Validation] UNLIMITED TIER - Always allowed (used: ${usedCount})`);
      } else {
        // ===== PAID TIER: UNIVERSAL - Works for 5, 30, 50, 100, ANY limit value =====
        totalLimit = sanitizedData.limit;
        usedCount = sanitizedData.usedMonthly;

        // CRITICAL: Dynamic calculation works for ANY limit
        remaining = Math.max(0, totalLimit - usedCount);
        canStart = remaining > 0;

        if (!canStart) {
          reason = 'monthly_limit_reached';
          message = `Sie haben alle ${totalLimit} Simulationen dieses Monats verbraucht`;
          shouldUpgrade = true;
          console.log(`[Backend Validation] PAID TIER - BLOCKED (${usedCount}/${totalLimit})`);
        } else {
          console.log(`[Backend Validation] PAID TIER - Allowed (${remaining}/${totalLimit} remaining)`);
        }
      }

      // Check for active concurrent sessions (only if limit check passed)
      if (canStart) {
        const hasActiveSession = await this.hasActiveSession(user.id);
        if (hasActiveSession) {
          console.log('[Backend Validation] BLOCKED - Concurrent session detected');
          return {
            allowed: false,
            reason: 'concurrent_session',
            message: 'Sie haben bereits eine aktive Simulation',
            remaining,
            totalLimit
          };
        }
      }

      console.log('[Backend Validation] FINAL RESULT:', {
        allowed: canStart,
        tier: sanitizedData.tier,
        totalLimit,
        usedCount,
        remaining,
        shouldUpgrade
      });

      return {
        allowed: canStart,
        reason,
        message,
        shouldUpgrade,
        remaining,
        totalLimit
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
