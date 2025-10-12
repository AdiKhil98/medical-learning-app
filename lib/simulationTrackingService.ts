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
}

export const simulationTracker = new SimulationTrackingService();
