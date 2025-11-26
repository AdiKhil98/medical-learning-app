/**
 * Production-Ready Logging Utility
 *
 * Enterprise-grade logging system with:
 * - Multiple log levels (debug, info, warn, error)
 * - Contextual information (timestamp, source, user)
 * - Environment-aware (verbose in dev, minimal in prod)
 * - External service integration ready (Sentry, LogRocket)
 * - Performance tracking
 * - Structured logging for analytics
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('API failed', { error, endpoint: '/api/users' });
 */

import { Platform } from 'react-native';

// ===== LOG LEVELS =====
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

// ===== LOG CONFIGURATION =====
interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableExternalLogging: boolean;
  includeTimestamp: boolean;
  includeSource: boolean;
  environment: 'development' | 'production' | 'test';
}

// Default configuration based on environment
const isDevelopment = __DEV__;
const isTest = process.env.NODE_ENV === 'test';

const defaultConfig: LogConfig = {
  level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: isDevelopment || isTest,
  enableExternalLogging: !isDevelopment && !isTest,
  includeTimestamp: true,
  includeSource: true,
  environment: isDevelopment ? 'development' : 'production',
};

// ===== LOG CONTEXT =====
interface LogContext {
  userId?: string;
  sessionId?: string;
  screen?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

// ===== LOG ENTRY =====
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
  source?: string;
  platform: string;
}

// ===== LOGGER CLASS =====
class Logger {
  private config: LogConfig;
  private globalContext: LogContext = {};

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Set global context that will be included in all logs
   */
  setGlobalContext(context: LogContext): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Clear global context
   */
  clearGlobalContext(): void {
    this.globalContext = {};
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * DEBUG: Detailed information for debugging
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * INFO: General informational messages
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * WARN: Warning messages for potential issues
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * ERROR: Error messages for failures
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.ERROR, message, context, errorObj);
  }

  /**
   * Performance tracking
   */
  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.info(`[PERFORMANCE] ${operation}`, {
      ...context,
      durationMs,
      operation,
    });
  }

  /**
   * User action tracking
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`[USER ACTION] ${action}`, {
      ...context,
      action,
      userAction: true,
    });
  }

  /**
   * API call tracking
   */
  apiCall(endpoint: string, method: string, statusCode?: number, context?: LogContext): void {
    const level = statusCode && statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `[API] ${method} ${endpoint}`, {
      ...context,
      endpoint,
      method,
      statusCode,
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    // Skip if below configured level
    if (level < this.config.level) {
      return;
    }

    // Build log entry
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.globalContext, ...context },
      error,
      source: this.config.includeSource ? this.getSource() : undefined,
      platform: Platform.OS,
    };

    // Console output (development)
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // External logging (production)
    if (this.config.enableExternalLogging) {
      this.logToExternal(entry);
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = this.getLogPrefix(entry.level);
    const timestamp = this.config.includeTimestamp
      ? `[${new Date(entry.timestamp).toLocaleTimeString()}]`
      : '';
    const source = entry.source ? `[${entry.source}]` : '';

    const logMessage = `${prefix} ${timestamp} ${source} ${entry.message}`;

    // Use appropriate console method
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.context || '');
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.context || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.context || '', entry.error || '');
        if (entry.error?.stack) {
          console.error('Stack trace:', entry.error.stack);
        }
        break;
    }
  }

  /**
   * Log to external service (Sentry, LogRocket, etc.)
   */
  private logToExternal(entry: LogEntry): void {
    // TODO: Integrate with Sentry or other logging service
    // Example:
    // if (entry.level === LogLevel.ERROR && entry.error) {
    //   Sentry.captureException(entry.error, {
    //     contexts: { custom: entry.context },
    //     tags: { platform: entry.platform },
    //   });
    // }

    // For now, just prepare the data in the right format
    const externalLog = {
      level: LogLevel[entry.level],
      message: entry.message,
      timestamp: entry.timestamp,
      context: entry.context,
      error: entry.error ? {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name,
      } : undefined,
      platform: entry.platform,
    };

    // Placeholder: In production, send to logging service
    // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(externalLog) });
  }

  /**
   * Get log level prefix with emoji
   */
  private getLogPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍 DEBUG';
      case LogLevel.INFO:
        return 'ℹ️  INFO';
      case LogLevel.WARN:
        return '⚠️  WARN';
      case LogLevel.ERROR:
        return '❌ ERROR';
      default:
        return '📝 LOG';
    }
  }

  /**
   * Get source of log call (file/component)
   */
  private getSource(): string {
    try {
      const error = new Error();
      const stack = error.stack?.split('\n')[4]; // 4th line is usually the caller
      const match = stack?.match(/at\s+(.+?)\s+\(/);
      return match ? match[1] : 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
}

// ===== SINGLETON INSTANCE =====
export const logger = new Logger();

// ===== HELPER FUNCTIONS =====

/**
 * Create a scoped logger for a component/service
 */
export function createScopedLogger(scope: string): Logger {
  const scopedLogger = new Logger();
  scopedLogger.setGlobalContext({ component: scope });
  return scopedLogger;
}

/**
 * Performance measurement decorator
 */
export function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const start = Date.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.then((value) => {
      const duration = Date.now() - start;
      logger.performance(operation, duration);
      return value;
    });
  } else {
    const duration = Date.now() - start;
    logger.performance(operation, duration);
    return Promise.resolve(result);
  }
}

/**
 * Async error wrapper with logging
 */
export async function withErrorLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Failed: ${operation}`, error, context);
    throw error;
  }
}

// ===== TYPE EXPORTS =====
export type { LogContext, LogEntry, LogConfig };

// ===== DEVELOPMENT HELPERS =====
if (__DEV__) {
  // Make logger available in global scope for debugging
  (global as any).logger = logger;
  logger.info('🚀 Logger initialized in development mode');
}
