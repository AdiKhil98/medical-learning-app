/**
 * Database-Driven Simulation Quota Service
 *
 * This service provides a simple client interface to the database-driven
 * quota management system. All counting logic lives in Supabase.
 *
 * Key Features:
 * - Single source of truth (database)
 * - Atomic operations
 * - Automatic quota updates via triggers
 * - Simple client API
 */

import { supabase } from './supabase';

// ===== TYPE DEFINITIONS =====

export interface QuotaStatus {
  has_quota: boolean;
  subscription_tier?: string;
  total_simulations?: number;
  simulations_used?: number;
  simulations_remaining?: number;
  period_start?: string;
  period_end?: string;
  usage_text?: string;
  message?: string;
  // Trial-specific fields
  is_trial?: boolean;
  trial_expires_at?: string;
  days_remaining?: number;
  trial_expired?: boolean;
}

export interface CanStartResult {
  can_start: boolean;
  reason: string;
  message: string;
  simulations_remaining?: number;
  simulations_used?: number;
  total_simulations?: number;
  // Trial-specific fields
  is_trial?: boolean;
  trial_expires_at?: string;
  days_remaining?: number;
  trial_expired?: boolean;
}

export interface RecordUsageResult {
  success: boolean;
  message: string;
  quota_updated: boolean;
  simulations_used?: number;
  simulations_remaining?: number;
  total_simulations?: number;
}

export interface ActiveSimulation {
  has_active_simulation: boolean;
  session_token?: string;
  simulation_type?: string;
  started_at?: string;
  elapsed_seconds?: number;
  time_remaining_seconds?: number;
  will_count_toward_usage?: boolean;
  message?: string;
}

export interface StartSessionResult {
  success: boolean;
  message: string;
  session_token?: string;
  simulation_type?: string;
  started_at?: string;
  quota_info?: CanStartResult;
  reason?: string;
}

export interface EndSessionResult {
  success: boolean;
  message: string;
  session_token?: string;
  duration_seconds?: number;
  counted_toward_usage?: boolean;
  message_detail?: string;
}

// ===== QUOTA SERVICE CLASS =====

class QuotaService {
  /**
   * Check if a user can start a new simulation
   *
   * @param userId - User UUID
   * @returns Promise with can_start status and details
   */
  async canStartSimulation(userId: string): Promise<CanStartResult> {
    try {
      const { data, error } = await supabase.rpc('can_start_simulation', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error checking quota:', error);
        throw error;
      }

      return data as CanStartResult;
    } catch (error) {
      console.error('Failed to check if user can start simulation:', error);
      // Return safe default
      return {
        can_start: false,
        reason: 'error',
        message: 'Fehler beim Überprüfen des Simulationslimits',
      };
    }
  }

  /**
   * Get current quota status for a user
   *
   * @param userId - User UUID
   * @returns Promise with quota status details
   */
  async getQuotaStatus(userId: string): Promise<QuotaStatus> {
    try {
      const { data, error } = await supabase.rpc('get_user_quota_status', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error getting quota status:', error);
        throw error;
      }

      return data as QuotaStatus;
    } catch (error) {
      console.error('Failed to get quota status:', error);
      return {
        has_quota: false,
        message: 'Fehler beim Laden der Quota-Informationen',
      };
    }
  }

  /**
   * Initialize or update a user's quota when subscription changes
   *
   * NOTE: This should be called by backend/webhook when subscription changes,
   * not directly from client for security
   *
   * @param userId - User UUID
   * @param newTier - New subscription tier ('free', 'basic', 'premium')
   * @returns Promise with update result
   */
  async handleSubscriptionChange(userId: string, newTier: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('handle_subscription_change', {
        p_user_id: userId,
        p_new_tier: newTier,
      });

      if (error) {
        console.error('Error handling subscription change:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to handle subscription change:', error);
      throw error;
    }
  }

  /**
   * Record simulation usage (legacy method - now handled automatically by trigger)
   *
   * @deprecated The database trigger now handles this automatically when
   * simulation_usage_logs.ended_at is set. This method is kept for
   * backward compatibility but is no longer needed.
   *
   * @param sessionToken - Simulation session token
   * @param userId - User UUID
   * @param simulationType - 'kp' or 'fsp'
   * @param countedTowardUsage - Whether to count this simulation
   * @returns Promise with usage recording result
   */
  async recordSimulationUsage(
    sessionToken: string,
    userId: string,
    simulationType: string,
    countedTowardUsage: boolean = true
  ): Promise<RecordUsageResult> {
    console.warn(
      'quotaService.recordSimulationUsage() is deprecated. ' +
        'Quota is now automatically updated via database trigger when simulation ends.'
    );

    try {
      const { data, error } = await supabase.rpc('record_simulation_usage', {
        p_session_token: sessionToken,
        p_user_id: userId,
        p_simulation_type: simulationType,
        p_counted_toward_usage: countedTowardUsage,
      });

      if (error) {
        console.error('Error recording simulation usage:', error);
        throw error;
      }

      return data as RecordUsageResult;
    } catch (error) {
      console.error('Failed to record simulation usage:', error);
      return {
        success: false,
        message: 'Fehler beim Aufzeichnen der Simulation',
        quota_updated: false,
      };
    }
  }

  /**
   * Get tier simulation limit (client-side helper)
   *
   * @param tier - Subscription tier
   * @returns Number of simulations for tier (-1 = unlimited)
   */
  getTierLimit(tier: string): number {
    const limits: Record<string, number> = {
      trial: -1, // Unlimited during trial
      free: 0, // No access after trial expires
      monthly: -1, // Unlimited simulations
      quarterly: -1, // Unlimited simulations
      // Legacy tier names (now also unlimited)
      basic: -1,
      premium: -1,
      basis: -1,
      profi: -1,
    };
    return limits[tier] ?? 0;
  }

  /**
   * Get trial status for a user
   *
   * @param userId - User UUID
   * @returns Promise with trial status details
   */
  async getTrialStatus(userId: string): Promise<{
    has_trial: boolean;
    is_active: boolean;
    trial_started_at?: string;
    trial_expires_at?: string;
    days_remaining?: number;
    hours_remaining?: number;
    message?: string;
    trial_available?: boolean;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_trial_status', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error getting trial status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get trial status:', error);
      return {
        has_trial: false,
        is_active: false,
        message: 'Fehler beim Laden des Trial-Status',
      };
    }
  }

  /**
   * Initialize trial period for a user
   *
   * @param userId - User UUID
   * @returns Promise with trial initialization result
   */
  async startTrial(userId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    trial_started_at?: string;
    trial_expires_at?: string;
    days_remaining?: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('initialize_trial_period', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error starting trial:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to start trial:', error);
      return {
        success: false,
        error: 'Fehler beim Starten der Testphase',
      };
    }
  }

  /**
   * Check if user is on active trial
   *
   * @param userId - User UUID
   * @returns Promise with boolean
   */
  async isOnTrial(userId: string): Promise<boolean> {
    const status = await this.getTrialStatus(userId);
    return status.has_trial && status.is_active;
  }

  /**
   * Format trial days remaining for display
   *
   * @param daysRemaining - Number of days remaining
   * @returns Formatted string like "3 Tage" or "1 Tag"
   */
  formatTrialDaysRemaining(daysRemaining: number): string {
    if (daysRemaining <= 0) {
      return 'Testphase abgelaufen';
    }
    if (daysRemaining === 1) {
      return '1 Tag verbleibend';
    }
    return `${daysRemaining} Tage verbleibend`;
  }

  /**
   * Format usage text for display
   *
   * @param used - Simulations used
   * @param total - Total simulations
   * @returns Formatted text like "3 / 20"
   */
  formatUsageText(used: number, total: number): string {
    return `${used} / ${total}`;
  }

  /**
   * ========================================
   * SESSION TRACKING METHODS
   * ========================================
   */

  /**
   * Start a new simulation session
   *
   * This checks quota and creates a new session in simulation_usage_logs
   *
   * @param userId - User UUID
   * @param simulationType - 'kp' or 'fsp'
   * @param sessionToken - Optional session token (generated if not provided)
   * @returns Promise with session info
   */
  async startSession(userId: string, simulationType: 'kp' | 'fsp', sessionToken?: string): Promise<StartSessionResult> {
    try {
      const { data, error } = await supabase.rpc('start_simulation_session', {
        p_user_id: userId,
        p_simulation_type: simulationType,
        p_session_token: sessionToken || undefined,
      });

      if (error) {
        console.error('Error starting simulation session:', error);
        throw error;
      }

      return data as StartSessionResult;
    } catch (error) {
      console.error('Failed to start simulation session:', error);
      return {
        success: false,
        message: 'Fehler beim Starten der Simulation',
        reason: 'error',
      };
    }
  }

  /**
   * End a simulation session
   *
   * This automatically calculates duration, determines if it counts,
   * and updates quota if threshold met (>= 5 minutes)
   *
   * @param sessionToken - Session UUID
   * @param userId - User UUID
   * @returns Promise with end result
   */
  async endSession(sessionToken: string, userId: string): Promise<EndSessionResult> {
    try {
      const { data, error } = await supabase.rpc('end_simulation_session', {
        p_session_token: sessionToken,
        p_user_id: userId,
      });

      if (error) {
        console.error('Error ending simulation session:', error);
        throw error;
      }

      return data as EndSessionResult;
    } catch (error) {
      console.error('Failed to end simulation session:', error);
      return {
        success: false,
        message: 'Fehler beim Beenden der Simulation',
      };
    }
  }

  /**
   * Get active simulation for a user
   *
   * Returns info about any ongoing simulation including elapsed time
   *
   * @param userId - User UUID
   * @returns Promise with active simulation info
   */
  async getActiveSimulation(userId: string): Promise<ActiveSimulation> {
    try {
      const { data, error } = await supabase.rpc('get_active_simulation', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error getting active simulation:', error);
        throw error;
      }

      return data as ActiveSimulation;
    } catch (error) {
      console.error('Failed to get active simulation:', error);
      return {
        has_active_simulation: false,
        message: 'Fehler beim Laden der aktiven Simulation',
      };
    }
  }

  /**
   * Helper: Format time remaining for display
   *
   * @param seconds - Seconds remaining
   * @returns Formatted string like "14:32" or "00:05"
   */
  formatTimeRemaining(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// ===== SINGLETON INSTANCE =====
export const quotaService = new QuotaService();

// ===== EXAMPLE USAGE =====

/**
 * Example: Check if user can start simulation
 *
 * const result = await quotaService.canStartSimulation(userId);
 * if (result.can_start) {
 *   // Start simulation
 * } else {
 *   // Show upgrade modal
 *   alert(result.message);
 * }
 */

/**
 * Example: Get quota status for display
 *
 * const status = await quotaService.getQuotaStatus(userId);
 * if (status.has_quota) {
 *   console.log(status.usage_text); // "3 / 20" or "Unbegrenzt"
 * }
 */

/**
 * Example: Handle subscription change (backend/webhook only)
 *
 * await quotaService.handleSubscriptionChange(userId, 'premium');
 */
