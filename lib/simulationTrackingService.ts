import { supabase } from './supabase';
import { SecureLogger } from './security';

export type SimulationType = 'kp' | 'fsp';
export type SimulationStatus = 'started' | 'in_progress' | 'used' | 'completed' | 'aborted' | 'expired';

export interface SimulationUsageLog {
  id: string;
  user_id: string;
  subscription_id?: string;
  simulation_type: SimulationType;
  status: SimulationStatus;
  session_token: string;
  started_at: string;
  marked_used_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  billing_period_start?: string;
  billing_period_end?: string;
}

export interface CanStartResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  remaining?: number;
  daily_limit?: number;
}

class SimulationTrackingService {
  // Generate unique session token
  private generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `sim_${timestamp}_${randomPart}`;
  }

  // Get browser fingerprint for abuse detection
  private getBrowserFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 0, 0);
    const canvasFingerprint = canvas.toDataURL();
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvasFingerprint.slice(-20) // Last 20 chars of canvas fingerprint
    };
    
    return btoa(JSON.stringify(fingerprint)).slice(0, 50);
  }

  // Check if user can start a new simulation
  async canStartSimulation(simulationType: SimulationType): Promise<CanStartResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          allowed: false,
          reason: 'not_authenticated',
          message: 'Please log in to start simulation'
        };
      }

      // Check for active sessions (prevent multiple concurrent sessions)
      const { data: activeSessions, error: activeError } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['started', 'in_progress'])
        .gte('started_at', new Date(Date.now() - 25 * 60 * 1000).toISOString()); // Last 25 minutes

      if (activeError) {
        SecureLogger.error('Failed to check active sessions', { error: activeError, user_id: user.id });
        return { allowed: false, reason: 'error', message: 'Unable to check session status' };
      }

      if (activeSessions && activeSessions.length > 0) {
        return {
          allowed: false,
          reason: 'active_session',
          message: 'You already have an active simulation session'
        };
      }

      // For now, allow simulations (you can add daily limits later)
      return {
        allowed: true,
        remaining: 999, // Unlimited for now
        daily_limit: 999
      };
    } catch (error) {
      SecureLogger.error('Error checking simulation permissions', { error });
      return {
        allowed: false,
        reason: 'error',
        message: 'Unable to check simulation permissions'
      };
    }
  }

  // Start a new simulation session
  async startSimulation(simulationType: SimulationType): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    try {
      // First check if user can start simulation
      const canStart = await this.canStartSimulation(simulationType);
      if (!canStart.allowed) {
        return {
          success: false,
          error: canStart.message || 'Cannot start simulation'
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const sessionToken = this.generateSessionToken();

      const { data, error } = await supabase
        .from('simulation_usage_logs')
        .insert({
          user_id: user.id,
          simulation_type: simulationType,
          session_token: sessionToken,
          status: 'started',
          started_at: new Date().toISOString(),
          // Add subscription info if available (keeping existing structure)
          billing_period_start: new Date().toISOString(),
          billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .select()
        .single();

      if (error) {
        SecureLogger.error('Failed to create simulation session', { error, user_id: user.id });
        return { success: false, error: 'Failed to start simulation' };
      }

      SecureLogger.log('Simulation session started', { 
        session_id: data.id, 
        user_id: user.id, 
        type: simulationType,
        session_token: sessionToken
      });

      return { success: true, sessionToken };
    } catch (error) {
      SecureLogger.error('Error starting simulation', { error });
      return { success: false, error: 'System error' };
    }
  }

  // Mark simulation as used (called at 10-minute mark)
  async markSimulationUsed(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const markedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('simulation_usage_logs')
        .update({
          status: 'used',
          marked_used_at: markedAt
        })
        .eq('session_token', sessionToken)
        .eq('user_id', user.id)
        .eq('status', 'started') // Only mark sessions that are still in started state
        .select()
        .single();

      if (error || !data) {
        SecureLogger.error('Failed to mark simulation as used', { error, sessionToken, user_id: user.id });
        return { success: false, error: 'Session not found or already marked' };
      }

      SecureLogger.log('Simulation marked as used at 10-minute mark', { 
        sessionToken, 
        user_id: user.id, 
        marked_at: markedAt,
        simulation_type: data.simulation_type
      });

      return { success: true };
    } catch (error) {
      SecureLogger.error('Error marking simulation as used', { error });
      return { success: false, error: 'System error' };
    }
  }

  // Update simulation status (in_progress, completed, aborted, etc.)
  async updateSimulationStatus(
    sessionToken: string, 
    status: SimulationStatus, 
    durationSeconds?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const updateData: any = {
        status
      };

      if (status === 'completed' || status === 'aborted') {
        updateData.completed_at = new Date().toISOString();
        if (durationSeconds !== undefined) {
          updateData.duration_seconds = durationSeconds;
        }
      }

      const { error } = await supabase
        .from('simulation_usage_logs')
        .update(updateData)
        .eq('session_token', sessionToken)
        .eq('user_id', user.id);

      if (error) {
        SecureLogger.error('Failed to update simulation status', { error, sessionToken, status });
        return { success: false, error: 'Failed to update simulation' };
      }

      SecureLogger.log('Simulation status updated', { 
        sessionToken, 
        user_id: user.id, 
        status,
        duration: durationSeconds 
      });

      return { success: true };
    } catch (error) {
      SecureLogger.error('Error updating simulation status', { error });
      return { success: false, error: 'System error' };
    }
  }
}

export const simulationTracker = new SimulationTrackingService();