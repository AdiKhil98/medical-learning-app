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
  is_unlimited?: boolean;
  period_start?: string;
  period_end?: string;
  usage_text?: string;
  message?: string;
}

export interface CanStartResult {
  can_start: boolean;
  reason: string;
  message: string;
  simulations_remaining?: number;
  simulations_used?: number;
  total_simulations?: number;
}

export interface RecordUsageResult {
  success: boolean;
  message: string;
  quota_updated: boolean;
  simulations_used?: number;
  simulations_remaining?: number;
  total_simulations?: number;
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
   * @param newTier - New subscription tier ('free', 'basis', 'profi', 'unlimited')
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
   * @returns Number of simulations for tier (-1 for unlimited)
   */
  getTierLimit(tier: string): number {
    const limits: Record<string, number> = {
      free: 5,
      basis: 20,
      profi: 100,
      unlimited: -1,
    };
    return limits[tier] || 5;
  }

  /**
   * Format usage text for display
   *
   * @param used - Simulations used
   * @param total - Total simulations (-1 for unlimited)
   * @returns Formatted text like "3 / 20" or "Unbegrenzt"
   */
  formatUsageText(used: number, total: number): string {
    if (total === -1) {
      return 'Unbegrenzt';
    }
    return `${used} / ${total}`;
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
 * await quotaService.handleSubscriptionChange(userId, 'profi');
 */
