import { supabase } from './supabase';
import { SecureLogger } from './security';

export type SimulationType = 'kp' | 'fsp';
export type SimulationStatus = 'started' | 'in_progress' | 'used' | 'completed' | 'aborted' | 'expired' | 'incomplete';

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
      // But be more forgiving - only block if there's a truly recent active session
      const { data: activeSessions, error: activeError } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['started', 'in_progress'])
        .gte('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Only last 5 minutes

      if (activeError) {
        console.log('🔍 DEBUG: Error checking active sessions:', activeError);
        // Don't block on database errors, just log them
        SecureLogger.error('Failed to check active sessions', { error: activeError, user_id: user.id });
        // Allow simulation to continue
      } else if (activeSessions && activeSessions.length > 0) {
        console.log('🔍 DEBUG: Found active sessions:', activeSessions);
        
        // Auto-cleanup old 'started' sessions (mark as incomplete)
        const oldSessions = activeSessions.filter(session => 
          new Date().getTime() - new Date(session.started_at).getTime() > 2 * 60 * 1000 // Older than 2 minutes
        );
        
        if (oldSessions.length > 0) {
          console.log('🔍 DEBUG: Cleaning up old sessions:', oldSessions.length);
          // Mark old sessions as incomplete
          await supabase
            .from('simulation_usage_logs')
            .update({ status: 'incomplete' })
            .in('id', oldSessions.map(s => s.id));
        }
        
        // Check if there are still truly active sessions (less than 2 minutes old)
        const recentSessions = activeSessions.filter(session => 
          new Date().getTime() - new Date(session.started_at).getTime() <= 2 * 60 * 1000
        );
        
        if (recentSessions.length > 0) {
          console.log('🔍 DEBUG: Blocking due to recent active session');
          return {
            allowed: false,
            reason: 'active_session',
            message: 'You already have an active simulation session'
          };
        } else {
          console.log('🔍 DEBUG: Old sessions cleaned up, allowing new session');
        }
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
      console.log('🔍 DEBUG: Starting simulation tracking for type:', simulationType);
      
      // First check if user can start simulation
      const canStart = await this.canStartSimulation(simulationType);
      console.log('🔍 DEBUG: Can start simulation result:', canStart);
      
      if (!canStart.allowed) {
        console.error('❌ DEBUG: Cannot start simulation:', canStart.message);
        return {
          success: false,
          error: canStart.message || 'Cannot start simulation'
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 DEBUG: Current user:', user?.id || 'No user');
      
      if (!user) {
        console.error('❌ DEBUG: No authenticated user');
        return { success: false, error: 'Not authenticated' };
      }

      const sessionToken = this.generateSessionToken();
      console.log('🔍 DEBUG: Generated session token:', sessionToken);

      const insertData = {
        user_id: user.id,
        simulation_type: simulationType,
        session_token: sessionToken,
        status: 'started' as const,
        started_at: new Date().toISOString(),
        // Add subscription info if available (keeping existing structure)
        billing_period_start: new Date().toISOString(),
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };

      console.log('🔍 DEBUG: Inserting data:', insertData);

      const { data, error } = await supabase
        .from('simulation_usage_logs')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ DEBUG: Database insert error:', error);
        SecureLogger.error('Failed to create simulation session', { error, user_id: user.id });
        return { success: false, error: `Database error: ${error.message}` };
      }

      console.log('✅ DEBUG: Successfully inserted session:', data);
      
      SecureLogger.log('Simulation session started', { 
        session_id: data.id, 
        user_id: user.id, 
        type: simulationType,
        session_token: sessionToken
      });

      return { success: true, sessionToken };
    } catch (error) {
      console.error('❌ DEBUG: Caught error in startSimulation:', error);
      SecureLogger.error('Error starting simulation', { error });
      return { success: false, error: 'System error' };
    }
  }

  // Mark simulation as used (called at 10-minute mark)
  async markSimulationUsed(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 DEBUG: markSimulationUsed called with token:', sessionToken);
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 DEBUG: Current user for marking:', user?.id);
      
      if (!user) {
        console.error('❌ DEBUG: No authenticated user for marking');
        return { success: false, error: 'Not authenticated' };
      }

      const markedAt = new Date().toISOString();
      console.log('🔍 DEBUG: About to update session to used status');

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

      console.log('🔍 DEBUG: Database update result:', { data, error });

      if (error || !data) {
        console.error('❌ DEBUG: Failed to update session:', error);
        SecureLogger.error('Failed to mark simulation as used', { error, sessionToken, user_id: user.id });
        return { success: false, error: `Database error: ${error?.message || 'Session not found or already marked'}` };
      }

      console.log('✅ DEBUG: Successfully marked as used:', data);
      
      SecureLogger.log('Simulation marked as used at 10-minute mark', { 
        sessionToken, 
        user_id: user.id, 
        marked_at: markedAt,
        simulation_type: data.simulation_type
      });

      return { success: true };
    } catch (error) {
      console.error('❌ DEBUG: Caught error in markSimulationUsed:', error);
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