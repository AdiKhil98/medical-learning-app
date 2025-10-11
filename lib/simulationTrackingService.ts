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
  // Force cleanup all active sessions for current user (emergency fix)
  async forceCleanupAllSessions(): Promise<{ success: boolean; cleaned: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, cleaned: 0 };
      }

      console.log('🧹 FORCE CLEANUP: Cleaning ALL active sessions for user');

      // Get all active sessions
      const { data: activeSessions } = await supabase
        .from('simulation_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['started', 'in_progress']);

      if (!activeSessions || activeSessions.length === 0) {
        console.log('✅ FORCE CLEANUP: No active sessions found');
        return { success: true, cleaned: 0 };
      }

      console.log(`🧹 FORCE CLEANUP: Found ${activeSessions.length} active sessions, cleaning all`);

      // Mark ALL as incomplete
      const { error } = await supabase
        .from('simulation_usage_logs')
        .update({ status: 'incomplete', completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('status', ['started', 'in_progress']);

      if (error) {
        console.error('❌ FORCE CLEANUP: Error:', error);
        return { success: false, cleaned: 0 };
      }

      console.log(`✅ FORCE CLEANUP: Successfully cleaned ${activeSessions.length} sessions`);
      return { success: true, cleaned: activeSessions.length };
    } catch (error) {
      console.error('❌ FORCE CLEANUP: Exception:', error);
      return { success: false, cleaned: 0 };
    }
  }

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
      // AGGRESSIVE cleanup - auto-cleanup ALL old sessions
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
        // Allow simulation to continue despite error
        return {
          allowed: true,
          remaining: 999,
          daily_limit: 999
        };
      }

      if (activeSessions && activeSessions.length > 0) {
        console.log('🔍 DEBUG: Found active sessions:', activeSessions);

        // CRITICAL FIX: Auto-cleanup ALL sessions older than 30 seconds (very aggressive)
        // This prevents the concurrency error when timer doesn't show properly
        const now = new Date().getTime();
        const oldSessions = activeSessions.filter(session => {
          const sessionAge = now - new Date(session.started_at).getTime();
          return sessionAge > 30 * 1000; // Older than 30 seconds
        });

        if (oldSessions.length > 0) {
          console.log('🔍 DEBUG: Auto-cleaning up', oldSessions.length, 'old sessions');

          // Mark old sessions as incomplete
          const { error: cleanupError } = await supabase
            .from('simulation_usage_logs')
            .update({ status: 'incomplete', completed_at: new Date().toISOString() })
            .in('id', oldSessions.map(s => s.id));

          if (cleanupError) {
            console.error('🔍 DEBUG: Error cleaning up sessions:', cleanupError);
            // Even if cleanup fails, still allow new session to prevent user lockout
          } else {
            console.log('✅ DEBUG: Successfully cleaned up old sessions');
          }
        }

        // Check if there are still truly active sessions (less than 30 seconds old)
        const recentSessions = activeSessions.filter(session => {
          const sessionAge = now - new Date(session.started_at).getTime();
          return sessionAge <= 30 * 1000; // Less than 30 seconds old
        });

        if (recentSessions.length > 0) {
          console.log('🔍 DEBUG: Blocking due to very recent active session (< 30s old)');
          console.log('🔍 DEBUG: Recent session details:', recentSessions[0]);
          return {
            allowed: false,
            reason: 'active_session',
            message: 'Bitte warten Sie einen Moment, bevor Sie eine neue Simulation starten'
          };
        } else {
          console.log('✅ DEBUG: All old sessions cleaned up, allowing new session');
        }
      }

      // For now, allow simulations (you can add daily limits later)
      return {
        allowed: true,
        remaining: 999, // Unlimited for now
        daily_limit: 999
      };
    } catch (error) {
      console.error('❌ DEBUG: Exception in canStartSimulation:', error);
      SecureLogger.error('Error checking simulation permissions', { error });
      // IMPORTANT: On error, allow the simulation to start to prevent user lockout
      return {
        allowed: true,
        remaining: 999,
        daily_limit: 999
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

        // EMERGENCY FIX: If blocked by concurrency, force cleanup and retry
        if (canStart.reason === 'active_session') {
          console.log('🔧 DEBUG: Attempting force cleanup due to concurrency block');
          const cleanup = await this.forceCleanupAllSessions();
          console.log('🔧 DEBUG: Force cleanup result:', cleanup);

          if (cleanup.success && cleanup.cleaned > 0) {
            console.log('✅ DEBUG: Force cleanup successful, retrying simulation start');
            // Don't retry canStartSimulation, just proceed with session creation
          } else {
            // Force cleanup failed, but still try to start session (prevent lockout)
            console.warn('⚠️ DEBUG: Force cleanup failed, but proceeding anyway to prevent lockout');
          }
        } else {
          // Different error reason, return it
          return {
            success: false,
            error: canStart.message || 'Cannot start simulation'
          };
        }
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
    durationSeconds?: number,
    metadata?: Record<string, any>
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

      // Add metadata if provided (e.g., early completion reason)
      if (metadata) {
        updateData.metadata = metadata;
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
        duration: durationSeconds,
        metadata
      });

      // SILENT REFUND: Check if we should refund this simulation
      // Triggers for: aborted or incomplete (NOT early completion - let DB decide based on duration)
      // Early completions are handled by the silent_refund_simulation function based on actual
      // marked_used_at timestamp, not client-reported duration
      if (status === 'aborted' || status === 'incomplete') {
        console.log('🔍 Checking if simulation is eligible for silent refund...');
        console.log('🔍 Status:', status, 'Duration:', durationSeconds, 'seconds');
        await this.attemptSilentRefund(sessionToken, durationSeconds);
      }

      return { success: true };
    } catch (error) {
      SecureLogger.error('Error updating simulation status', { error });
      return { success: false, error: 'System error' };
    }
  }

  // Silent refund: Automatically refund if simulation aborted before 10 minutes
  private async attemptSilentRefund(sessionToken: string, clientDuration?: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('💸 Attempting silent refund for session:', sessionToken);
      console.log('💸 Client reported duration:', clientDuration, 'seconds');

      // Call database function for silent refund
      const { data, error } = await supabase.rpc('silent_refund_simulation', {
        p_session_token: sessionToken,
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ Silent refund error:', error);
        SecureLogger.error('Silent refund failed', { error, sessionToken });
        return;
      }

      console.log('💸 Silent refund result:', data);

      if (data.refunded) {
        console.log('✅ SILENT REFUND: Simulation refunded successfully');
        console.log('💸 Reason:', data.reason);
        console.log('💸 Duration:', data.duration_seconds, 'seconds');

        SecureLogger.log('Silent refund executed', {
          sessionToken,
          user_id: user.id,
          refunded: true,
          reason: data.reason,
          duration: data.duration_seconds
        });
      } else {
        console.log('ℹ️ Silent refund: No refund necessary');
        console.log('ℹ️ Reason:', data.reason);
      }
    } catch (error) {
      console.error('❌ Exception in silent refund:', error);
      SecureLogger.error('Exception in silent refund', { error });
      // Don't throw - refund failure shouldn't break simulation flow
    }
  }

  // Check if simulation is eligible for refund (for debugging/admin)
  async checkRefundEligibility(sessionToken: string): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { eligible: false, reason: 'not_authenticated' };
      }

      const { data, error } = await supabase.rpc('check_refund_eligibility', {
        p_session_token: sessionToken,
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ Error checking refund eligibility:', error);
        return { eligible: false, reason: 'error' };
      }

      return data;
    } catch (error) {
      console.error('❌ Exception checking refund eligibility:', error);
      return { eligible: false, reason: 'exception' };
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