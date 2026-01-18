import { supabase } from './supabase';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

// Action types matching database values
type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'PASSWORD_RESET'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'SESSION_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS'
  | 'APP_ERROR';

interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  details?: Record<string, any>;
  includeDeviceInfo?: boolean;
}

// Get device/browser info for web
function getDeviceInfo(): Record<string, any> | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return null;
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: typeof screen !== 'undefined' ? screen.width : null,
    screenHeight: typeof screen !== 'undefined' ? screen.height : null,
  };
}

export class AuditLogger {
  /**
   * Generic audit log method - use this for all audit logging
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const { action, userId, details, includeDeviceInfo = true } = entry;

      await supabase.from('audit_logs').insert({
        action,
        user_id: userId || null,
        details: details ? JSON.stringify(details) : null,
        device_info: includeDeviceInfo ? getDeviceInfo() : null,
      });
    } catch (error) {
      // Silently fail - audit logging should never break the app
      logger.info('Audit log skipped');
    }
  }

  /**
   * Log authentication events (login, logout, signup, etc.)
   */
  static async logAuthEvent(
    event: 'login_success' | 'login_failed' | 'logout' | 'signup' | 'password_reset',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Map to uppercase action names
    const actionMap: Record<string, AuditAction> = {
      login_success: 'LOGIN_SUCCESS',
      login_failed: 'LOGIN_FAILED',
      logout: 'LOGOUT',
      signup: 'SIGNUP',
      password_reset: 'PASSWORD_RESET',
    };

    await this.log({
      action: actionMap[event],
      userId,
      details: metadata,
    });
  }

  /**
   * Log security events (rate limiting, unauthorized access, etc.)
   */
  static async logSecurityEvent(
    event: 'rate_limit_exceeded' | 'session_timeout' | 'invalid_token' | 'unauthorized_access',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
      rate_limit_exceeded: 'RATE_LIMIT_EXCEEDED',
      session_timeout: 'SESSION_TIMEOUT',
      invalid_token: 'UNAUTHORIZED_ACCESS',
      unauthorized_access: 'UNAUTHORIZED_ACCESS',
    };

    await this.log({
      action: actionMap[event],
      userId,
      details: metadata,
    });
  }

  /**
   * Log application errors
   */
  static async logErrorEvent(
    error: Error,
    userId?: string,
    component?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: 'APP_ERROR',
      userId,
      details: {
        error_message: error.message,
        error_stack: error.stack?.substring(0, 500), // Limit stack trace length
        component,
        ...metadata,
      },
    });
  }

  /**
   * Log session events
   */
  static async logSessionEvent(
    event: 'session_started' | 'session_extended' | 'session_ended',
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
      session_started: 'SESSION_STARTED',
      session_extended: 'SESSION_STARTED',
      session_ended: 'SESSION_ENDED',
    };

    await this.log({
      action: actionMap[event],
      userId,
      details: metadata,
    });
  }

  /**
   * Update user's last activity timestamp
   */
  static async updateLastActivity(userId: string): Promise<void> {
    try {
      await supabase.rpc('update_last_activity', {
        user_id_input: userId,
      });
    } catch (error) {
      // Silently fail
      logger.info('Activity update skipped');
    }
  }
}

export default AuditLogger;
