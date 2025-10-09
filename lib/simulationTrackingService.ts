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
      // Be more forgiving - auto-cleanup old sessions
      const { data: activeSessions, error: activeError } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['started', 'in_progress'])
        .gte('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

      if (activeError) {
        console.log('🔍 DEBUG: Error checking active sessions:', activeError);
        // Don't block on database errors, just log them
        SecureLogger.error('Failed to check active sessions', { error: activeError, user_id: user.id });
        // Allow simulation to continue
      } else if (activeSessions && activeSessions.length > 0) {
        console.log('🔍 DEBUG: Found active sessions:', activeSessions);

        // Auto-cleanup sessions older than 1 minute (very lenient)
        const oldSessions = activeSessions.filter(session =>
          new Date().getTime() - new Date(session.started_at).getTime() > 60 * 1000 // Older than 1 minute
        );

        if (oldSessions.length > 0) {
          console.log('🔍 DEBUG: Cleaning up old sessions:', oldSessions.length);
          // Mark old sessions as incomplete
          const { error: cleanupError } = await supabase
            .from('simulation_usage_logs')
            .update({ status: 'incomplete', completed_at: new Date().toISOString() })
            .in('id', oldSessions.map(s => s.id));

          if (cleanupError) {
            console.error('🔍 DEBUG: Error cleaning up sessions:', cleanupError);
          }
        }

        // Check if there are still truly active sessions (less than 1 minute old)
        const recentSessions = activeSessions.filter(session =>
          new Date().getTime() - new Date(session.started_at).getTime() <= 60 * 1000
        );

        if (recentSessions.length > 0) {
          console.log('🔍 DEBUG: Blocking due to recent active session');
          return {
            allowed: false,
            reason: 'active_session',
            message: 'Please wait a moment before starting a new simulation'
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

  // Mark simulation as used (called at 10-minute mark) - SERVER-SIDE VALIDATED
  async markSimulationUsed(sessionToken: string, clientElapsedSeconds?: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 DEBUG: markSimulationUsed called with token:', sessionToken);
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 DEBUG: Current user for marking:', user?.id);
      
      if (!user) {
        console.error('❌ DEBUG: No authenticated user for marking');
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🔍 DEBUG: Using server-side validation for marking as used');
      console.log('🔍 DEBUG: Client reported elapsed seconds:', clientElapsedSeconds);

      // Use server-side validation function
      const { data, error } = await supabase.rpc('mark_simulation_used_secure', {
        p_session_token: sessionToken,
        p_user_id: user.id,
        p_client_reported_elapsed: clientElapsedSeconds || null
      });

      console.log('🔍 DEBUG: Server-side validation result:', { data, error });

      if (error) {
        console.error('❌ DEBUG: Server-side validation error:', error);
        SecureLogger.error('Failed server-side simulation marking', { error, sessionToken, user_id: user.id });
        return { success: false, error: `Server validation error: ${error.message}` };
      }

      if (!data.success) {
        console.error('❌ DEBUG: Server rejected marking:', data);
        
        // Log different types of failures
        if (data.reason === 'insufficient_time') {
          console.log('🛡️ SECURITY: Blocked premature usage marking - only', data.elapsed_seconds, 'seconds elapsed');
          this.reportSuspiciousActivity('time_manipulation');
        }
        
        return { 
          success: false, 
          error: data.message || 'Server-side validation failed'
        };
      }

      console.log('✅ DEBUG: Server-side validation passed:', data);
      console.log('🔍 DEBUG: Server calculated', data.server_elapsed_seconds, 'seconds, client reported', data.client_elapsed_seconds);
      
      SecureLogger.log('Simulation marked as used with server validation', { 
        sessionToken, 
        user_id: user.id, 
        server_elapsed: data.server_elapsed_seconds,
        client_elapsed: data.client_elapsed_seconds,
        marked_at: data.marked_at
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

  // Report suspicious activity for abuse detection
  private async reportSuspiciousActivity(activityType: 'time_manipulation' | 'rapid_sessions' | 'multiple_tabs'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🛡️ SECURITY: Reporting suspicious activity:', activityType);

      // For time manipulation, increment the specific counter
      const updateField = activityType === 'time_manipulation' ? 'time_manipulation_attempts' :
                         activityType === 'rapid_sessions' ? 'rapid_session_count' :
                         'multiple_tab_attempts';

      await supabase
        .from('simulation_abuse_detection')
        .upsert({
          user_id: user.id,
          [updateField]: 1,
          last_suspicious_activity: new Date().toISOString(),
          admin_notes: `${activityType} detected at ${new Date().toISOString()}`
        }, {
          onConflict: 'user_id'
        });

      SecureLogger.warn('Suspicious activity reported', { 
        user_id: user.id, 
        activity_type: activityType 
      });

    } catch (error) {
      SecureLogger.error('Error reporting suspicious activity', { error });
    }
  }

  // Heartbeat function to detect session pausing/manipulation
  async sendHeartbeat(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data, error } = await supabase.rpc('update_session_heartbeat', {
        p_session_token: sessionToken,
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ Heartbeat error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.reason || 'Heartbeat failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Heartbeat system error:', error);
      return { success: false, error: 'System error' };
    }
  }
}

export const simulationTracker = new SimulationTrackingService();