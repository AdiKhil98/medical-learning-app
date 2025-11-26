import AsyncStorage from '@react-native-async-storage/async-storage';

// Password validation utility
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation utility
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.toLowerCase());
};

// Secure Logger class for HIPAA compliance
export class SecureLogger {
  private static sensitivePatterns = [
    /password/i,
    /token/i,
    /session/i,
    /auth/i,
    /secret/i,
    /key/i,
    /bearer/i,
    /authorization/i,
    /email/i,
    /phone/i,
    /ssn/i,
    /dob/i,
    /birthdate/i,
    /medical/i,
    /patient/i,
    /diagnosis/i,
    /medication/i
  ];

  private static sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Replace sensitive patterns with [REDACTED]
      for (const pattern of this.sensitivePatterns) {
        if (pattern.test(data)) {
          return '[REDACTED]';
        }
      }
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const isSensitiveKey = this.sensitivePatterns.some(pattern => pattern.test(key));
        sanitized[key] = isSensitiveKey ? '[REDACTED]' : this.sanitizeData(value);
      }
      return sanitized;
    }
    
    return data;
  }

  static log(message: string, ...args: any[]): void {
    if (__DEV__) {
      const sanitizedArgs = args.map(arg => this.sanitizeData(arg));
      logger.info(`[SECURE LOG] ${message}`, ...sanitizedArgs);
    }
  }

  static warn(message: string, ...args: any[]): void {
    if (__DEV__) {
      const sanitizedArgs = args.map(arg => this.sanitizeData(arg));
      logger.warn(`[SECURE WARN] ${message}`, ...sanitizedArgs);
    }
  }

  static error(message: string, ...args: any[]): void {
    if (__DEV__) {
      const sanitizedArgs = args.map(arg => this.sanitizeData(arg));
      logger.error(`[SECURE ERROR] ${message}`, ...sanitizedArgs);
    }
  }
}

// Session timeout manager for exam preparation platform (4 hours)
export class SessionTimeoutManager {
  private static readonly TIMEOUT_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  private static readonly WARNING_DURATION = 5 * 60 * 1000; // 5 minutes warning
  private static readonly STORAGE_KEY = 'last_activity_timestamp';
  
  private static timeoutId: NodeJS.Timeout | null = null;
  private static warningTimeoutId: NodeJS.Timeout | null = null;
  private static onWarningCallback: (() => void) | null = null;
  private static onTimeoutCallback: (() => void) | null = null;

  static async init(
    onWarning: () => void,
    onTimeout: () => void
  ): Promise<void> {
    this.onWarningCallback = onWarning;
    this.onTimeoutCallback = onTimeout;
    
    await this.updateLastActivity();
    this.startTimer();
    
    SecureLogger.log('Session timeout manager initialized');
  }

  static async updateLastActivity(): Promise<void> {
    const timestamp = Date.now().toString();
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, timestamp);
      this.resetTimer();
    } catch (error) {
      SecureLogger.error('Failed to update last activity', error);
    }
  }

  private static resetTimer(): void {
    this.clearTimers();
    this.startTimer();
  }

  private static startTimer(): void {
    // Set warning timer (13 minutes)
    this.warningTimeoutId = setTimeout(() => {
      SecureLogger.warn('Session timeout warning triggered');
      this.onWarningCallback?.();
    }, this.TIMEOUT_DURATION - this.WARNING_DURATION);

    // Set timeout timer (15 minutes)
    this.timeoutId = setTimeout(async () => {
      SecureLogger.warn('Session timeout triggered');
      await this.handleTimeout();
    }, this.TIMEOUT_DURATION);
  }

  private static clearTimers(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
  }

  private static async handleTimeout(): Promise<void> {
    try {
      SecureLogger.log('Executing automatic logout due to session timeout');
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.onTimeoutCallback?.();
    } catch (error) {
      SecureLogger.error('Error during automatic logout', error);
    }
  }

  static async checkSessionValidity(): Promise<boolean> {
    try {
      const lastActivity = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!lastActivity) return false;
      
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      const isValid = timeSinceLastActivity < this.TIMEOUT_DURATION;
      
      if (!isValid) {
        SecureLogger.warn('Session expired based on last activity');
        await this.handleTimeout();
      }
      
      return isValid;
    } catch (error) {
      SecureLogger.error('Error checking session validity', error);
      return false;
    }
  }

  static destroy(): void {
    this.clearTimers();
    this.onWarningCallback = null;
    this.onTimeoutCallback = null;
    SecureLogger.log('Session timeout manager destroyed');
  }
}

// Rate limiter for failed login attempts
export class RateLimiter {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly STORAGE_PREFIX = 'rate_limit_';

  static async checkAttempts(identifier: string): Promise<{
    allowed: boolean;
    attemptsRemaining: number;
    lockoutEndsAt?: number;
  }> {
    try {
      const key = `${this.STORAGE_PREFIX}${identifier}`;
      const data = await AsyncStorage.getItem(key);
      
      if (!data) {
        return {
          allowed: true,
          attemptsRemaining: this.MAX_ATTEMPTS
        };
      }
      
      const { attempts, firstAttemptTime, lockoutEndsAt } = JSON.parse(data);
      const now = Date.now();
      
      // Check if lockout period has expired
      if (lockoutEndsAt && now < lockoutEndsAt) {
        return {
          allowed: false,
          attemptsRemaining: 0,
          lockoutEndsAt
        };
      }
      
      // Reset if lockout has expired
      if (lockoutEndsAt && now >= lockoutEndsAt) {
        await AsyncStorage.removeItem(key);
        return {
          allowed: true,
          attemptsRemaining: this.MAX_ATTEMPTS
        };
      }
      
      // Check if we're within the rate limit window (1 hour)
      const windowExpired = now - firstAttemptTime > 60 * 60 * 1000;
      if (windowExpired) {
        await AsyncStorage.removeItem(key);
        return {
          allowed: true,
          attemptsRemaining: this.MAX_ATTEMPTS
        };
      }
      
      const remaining = this.MAX_ATTEMPTS - attempts;
      return {
        allowed: remaining > 0,
        attemptsRemaining: Math.max(0, remaining)
      };
      
    } catch (error) {
      SecureLogger.error('Error checking rate limit', error);
      // Fail open - allow the attempt if we can't check
      return {
        allowed: true,
        attemptsRemaining: this.MAX_ATTEMPTS
      };
    }
  }

  static async recordFailedAttempt(identifier: string): Promise<void> {
    try {
      const key = `${this.STORAGE_PREFIX}${identifier}`;
      const existing = await AsyncStorage.getItem(key);
      const now = Date.now();
      
      let attempts = 1;
      let firstAttemptTime = now;
      
      if (existing) {
        const data = JSON.parse(existing);
        attempts = data.attempts + 1;
        firstAttemptTime = data.firstAttemptTime;
      }
      
      const newData: any = {
        attempts,
        firstAttemptTime
      };
      
      // If max attempts reached, set lockout
      if (attempts >= this.MAX_ATTEMPTS) {
        newData.lockoutEndsAt = now + this.LOCKOUT_DURATION;
        SecureLogger.warn(`Rate limit exceeded for ${identifier}, lockout until ${new Date(newData.lockoutEndsAt)}`);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(newData));
      
    } catch (error) {
      SecureLogger.error('Error recording failed attempt', error);
    }
  }

  static async clearAttempts(identifier: string): Promise<void> {
    try {
      const key = `${this.STORAGE_PREFIX}${identifier}`;
      await AsyncStorage.removeItem(key);
      SecureLogger.log(`Rate limit cleared for ${identifier}`);
    } catch (error) {
      SecureLogger.error('Error clearing rate limit', error);
    }
  }

  static async getAllLockouts(): Promise<Array<{
    identifier: string;
    lockoutEndsAt: number;
    attempts: number;
  }>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const rateLimitKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      const lockouts: Array<{
        identifier: string;
        lockoutEndsAt: number;
        attempts: number;
      }> = [];
      
      for (const key of rateLimitKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.lockoutEndsAt && Date.now() < parsed.lockoutEndsAt) {
            lockouts.push({
              identifier: key.replace(this.STORAGE_PREFIX, ''),
              lockoutEndsAt: parsed.lockoutEndsAt,
              attempts: parsed.attempts
            });
          }
        }
      }
      
      return lockouts;
    } catch (error) {
      SecureLogger.error('Error getting lockouts', error);
      return [];
    }
  }
}

// Security utilities export
export const SecurityUtils = {
  validatePassword,
  validateEmail,
  SecureLogger,
  SessionTimeoutManager,
  RateLimiter
};

export default SecurityUtils;