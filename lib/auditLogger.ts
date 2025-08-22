import { supabase } from './supabase';

export class AuditLogger {
  static async logAuthEvent(
    event: 'login_success' | 'login_failed' | 'logout' | 'signup' | 'password_reset',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        event_type: 'auth',
        event_action: event,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: null, // Will be populated by RLS policy if available
      });
    } catch (error) {
      // Silently fail for now
      console.log('Audit log skipped');
    }
  }

  static async logSecurityEvent(
    event: 'rate_limit_exceeded' | 'session_timeout' | 'invalid_token' | 'unauthorized_access',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        event_type: 'security',
        event_action: event,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: null,
      });
    } catch (error) {
      // Silently fail for now
      console.log('Audit log skipped');
    }
  }

  static async logErrorEvent(
    error: Error,
    userId?: string,
    component?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        event_type: 'error',
        event_action: 'application_error',
        user_id: userId,
        metadata: {
          error_message: error.message,
          error_stack: error.stack,
          component,
          ...metadata
        },
        timestamp: new Date().toISOString(),
        ip_address: null,
      });
    } catch (logError) {
      // Silently fail for now
      console.log('Audit log skipped');
    }
  }

  static async updateLastActivity(userId: string): Promise<void> {
    try {
      await supabase.rpc('update_last_activity', {
        user_id_input: userId
      });
    } catch (error) {
      // Silently fail for now
      console.log('Audit log skipped');
    }
  }

  static async logSessionEvent(
    event: 'session_started' | 'session_extended' | 'session_ended',
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        event_type: 'session',
        event_action: event,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: null,
      });
    } catch (error) {
      // Silently fail for now
      console.log('Audit log skipped');
    }
  }
}

export default AuditLogger;