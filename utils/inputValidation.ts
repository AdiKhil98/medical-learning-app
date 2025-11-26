/**
 * Input Validation and XSS Protection Utilities
 *
 * Comprehensive input validation and sanitization for:
 * - XSS prevention
 * - SQL injection prevention
 * - Command injection prevention
 * - Path traversal prevention
 * - Email validation
 * - Password strength
 *
 * Security Note: Client-side validation is NOT sufficient.
 * ALWAYS validate and sanitize inputs on the server.
 */

import { logger } from './logger';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: string;
}

/**
 * XSS Protection: Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Encode dangerous characters
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize text input (preserves some formatting)
 */
export function sanitizeText(input: string, maxLength: number = 10000): string {
  if (!input) return '';

  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    logger.warn('Input truncated due to length', { original: input.length, max: maxLength });
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('E-Mail-Adresse ist erforderlich');
    return { isValid: false, errors };
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    errors.push('Ungültige E-Mail-Adresse');
  }

  // Check length
  if (sanitized.length > 254) {
    errors.push('E-Mail-Adresse ist zu lang');
  }

  // Check for dangerous characters
  if (/[<>'"\\]/.test(sanitized)) {
    errors.push('E-Mail-Adresse enthält ungültige Zeichen');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Passwort ist erforderlich');
    return { isValid: false, errors };
  }

  // Minimum length
  if (password.length < 8) {
    errors.push('Passwort muss mindestens 8 Zeichen lang sein');
  }

  // Maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push('Passwort ist zu lang (maximal 128 Zeichen)');
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten');
  }

  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten');
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Passwort muss mindestens eine Zahl enthalten');
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty', 'abc123',
    'password1', '123456789', '111111', '123123', 'admin',
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Dieses Passwort ist zu häufig verwendet');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Prevent SQL injection in search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  let sanitized = query.trim();

  // Remove SQL keywords and dangerous characters
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /--/g,  // SQL comments
    /\/\*/g, // Block comments start
    /\*\//g, // Block comments end
    /;/g,   // Statement separator
    /'/g,   // Single quotes
    /"/g,   // Double quotes
    /`/g,   // Backticks
  ];

  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Prevent path traversal attacks
 */
export function sanitizePath(path: string): ValidationResult {
  const errors: string[] = [];

  if (!path) {
    errors.push('Pfad ist erforderlich');
    return { isValid: false, errors };
  }

  let sanitized = path.trim();

  // Check for path traversal attempts
  if (/\.\.\//.test(sanitized) || /\.\.\\/.test(sanitized)) {
    errors.push('Pfad-Traversierung erkannt');
    logger.warn('Path traversal attempt detected', { path });
  }

  // Check for absolute paths
  if (/^[a-zA-Z]:\\/.test(sanitized) || /^\//.test(sanitized)) {
    errors.push('Absolute Pfade sind nicht erlaubt');
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Only allow safe characters
  if (!/^[a-zA-Z0-9\/_-]+$/.test(sanitized)) {
    errors.push('Pfad enthält ungültige Zeichen');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Validate URL
 */
export function validateURL(url: string, allowedProtocols: string[] = ['http', 'https']): ValidationResult {
  const errors: string[] = [];

  if (!url) {
    errors.push('URL ist erforderlich');
    return { isValid: false, errors };
  }

  try {
    const parsed = new URL(url);

    // Check protocol
    const protocol = parsed.protocol.replace(':', '');
    if (!allowedProtocols.includes(protocol)) {
      errors.push(`Protokoll ${protocol} ist nicht erlaubt`);
    }

    // Check for javascript: or data: protocols (XSS vectors)
    if (['javascript', 'data', 'vbscript', 'file'].includes(protocol)) {
      errors.push('Gefährliches Protokoll erkannt');
      logger.warn('Dangerous URL protocol detected', { url, protocol });
    }

    // Check for suspicious patterns
    if (url.includes('<script') || url.includes('javascript:')) {
      errors.push('Verdächtige URL erkannt');
      logger.warn('Suspicious URL pattern detected', { url });
    }
  } catch (error) {
    errors.push('Ungültige URL');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user-generated content (notes, comments, etc.)
 */
export function sanitizeUserContent(content: string, maxLength: number = 50000): ValidationResult {
  const errors: string[] = [];

  if (!content) {
    return { isValid: true, errors: [], sanitized: '' };
  }

  let sanitized = content.trim();

  // Length check
  if (sanitized.length > maxLength) {
    errors.push(`Inhalt ist zu lang (maximal ${maxLength} Zeichen)`);
    sanitized = sanitized.substring(0, maxLength);
  }

  // Sanitize HTML
  sanitized = sanitizeHTML(sanitized);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate phone number (German format)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone) {
    errors.push('Telefonnummer ist erforderlich');
    return { isValid: false, errors };
  }

  // Remove spaces, dashes, and parentheses
  let sanitized = phone.replace(/[\s\-()]/g, '');

  // Check if it starts with + or 0
  if (!/^(\+|0)/.test(sanitized)) {
    errors.push('Telefonnummer muss mit + oder 0 beginnen');
  }

  // Check if it contains only digits after the first character
  if (!/^(\+|0)[0-9]+$/.test(sanitized)) {
    errors.push('Telefonnummer enthält ungültige Zeichen');
  }

  // Length check (German phone numbers)
  if (sanitized.length < 10 || sanitized.length > 15) {
    errors.push('Telefonnummer hat eine ungültige Länge');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Rate limiting helper (client-side)
 * Prevents rapid repeated submissions
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if action is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);

    if (recentAttempts.length >= this.maxAttempts) {
      logger.warn('Rate limit exceeded', { key, attempts: recentAttempts.length });
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear all attempts
   */
  clearAll(): void {
    this.attempts.clear();
  }
}

// Export default rate limiter instance
export const defaultRateLimiter = new RateLimiter();
