/**
 * Tests for inputValidation.ts
 */

import {
  sanitizeHTML,
  sanitizeText,
  validateEmail,
  validatePassword,
  sanitizeSearchQuery,
  sanitizePath,
  validateURL,
  sanitizeUserContent,
  validatePhoneNumber,
  RateLimiter,
} from '../../utils/inputValidation';

describe('Input Validation', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="malicious()">Click me</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('should encode dangerous characters', () => {
      const input = '<script>alert("test")</script>';
      const result = sanitizeHTML(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should handle empty input', () => {
      expect(sanitizeHTML('')).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeText(input);
      expect(result).toBe('hello world');
    });

    it('should remove null bytes', () => {
      const input = 'hello\0world';
      const result = sanitizeText(input);
      expect(result).toBe('helloworld');
    });

    it('should truncate to max length', () => {
      const input = 'a'.repeat(100);
      const result = sanitizeText(input, 50);
      expect(result.length).toBe(50);
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitized).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('E-Mail-Adresse ist zu lang');
    });

    it('should reject emails with dangerous characters', () => {
      const result = validateEmail('test<script>@example.com');
      expect(result.isValid).toBe(false);
    });

    it('should require email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('E-Mail-Adresse ist erforderlich');
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Passwort muss mindestens 8 Zeichen lang sein');
    });

    it('should require uppercase letter', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Großbuchstaben'))).toBe(true);
    });

    it('should require lowercase letter', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Kleinbuchstaben'))).toBe(true);
    });

    it('should require number', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Zahl'))).toBe(true);
    });

    it('should require special character', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Sonderzeichen'))).toBe(true);
    });

    it('should reject common passwords', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('zu häufig'))).toBe(true);
    });

    it('should reject very long passwords', () => {
      const result = validatePassword('A'.repeat(130) + 'a1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Passwort ist zu lang (maximal 128 Zeichen)');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should remove SQL keywords', () => {
      const input = 'SELECT * FROM users WHERE name = "test"';
      const result = sanitizeSearchQuery(input);
      expect(result).not.toContain('SELECT');
      expect(result).not.toContain('FROM');
    });

    it('should remove SQL comments', () => {
      const input = 'test -- comment';
      const result = sanitizeSearchQuery(input);
      expect(result).not.toContain('--');
    });

    it('should remove quotes', () => {
      const input = "test'OR'1'='1";
      const result = sanitizeSearchQuery(input);
      expect(result).not.toContain("'");
    });

    it('should truncate long queries', () => {
      const input = 'a'.repeat(300);
      const result = sanitizeSearchQuery(input);
      expect(result.length).toBe(200);
    });
  });

  describe('sanitizePath', () => {
    it('should accept safe paths', () => {
      const result = sanitizePath('path/to/file');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('path/to/file');
    });

    it('should reject path traversal attempts', () => {
      const result = sanitizePath('../../../etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('traversierung'))).toBe(true);
    });

    it('should reject absolute paths', () => {
      const result = sanitizePath('/absolute/path');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Absolute'))).toBe(true);
    });

    it('should reject paths with invalid characters', () => {
      const result = sanitizePath('path<>with|bad*chars');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateURL', () => {
    it('should accept valid URLs', () => {
      const result = validateURL('https://example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject dangerous protocols', () => {
      const protocols = ['javascript:', 'data:', 'vbscript:', 'file:'];

      protocols.forEach(protocol => {
        const result = validateURL(`${protocol}alert(1)`);
        expect(result.isValid).toBe(false);
      });
    });

    it('should reject URLs with script tags', () => {
      const result = validateURL('https://example.com<script>alert(1)</script>');
      expect(result.isValid).toBe(false);
    });

    it('should only allow whitelisted protocols', () => {
      const result = validateURL('ftp://example.com', ['http', 'https']);
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeUserContent', () => {
    it('should sanitize HTML in user content', () => {
      const input = '<p>Hello</p><script>bad()</script>';
      const result = sanitizeUserContent(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should handle empty content', () => {
      const result = sanitizeUserContent('');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('');
    });

    it('should truncate very long content', () => {
      const input = 'a'.repeat(60000);
      const result = sanitizeUserContent(input);
      expect(result.sanitized!.length).toBe(50000);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid German phone numbers', () => {
      const validNumbers = [
        '+49123456789',
        '0123456789',
        '+49 123 456 789',
        '0123 456 789',
      ];

      validNumbers.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123',  // Too short
        'abc123',  // Letters
        '1234567890123456',  // Too long
      ];

      invalidNumbers.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(false);
      });
    });

    it('should remove formatting', () => {
      const result = validatePhoneNumber('+49 (123) 456-789');
      expect(result.sanitized).toBe('+49123456789');
    });
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(3, 60000);

      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter(2, 60000);

      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(false);
    });

    it('should reset after time window', () => {
      const limiter = new RateLimiter(2, 1000);

      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(false);

      jest.advanceTimersByTime(1100);

      expect(limiter.isAllowed('test')).toBe(true);
    });

    it('should handle different keys separately', () => {
      const limiter = new RateLimiter(1, 60000);

      expect(limiter.isAllowed('key1')).toBe(true);
      expect(limiter.isAllowed('key2')).toBe(true);
      expect(limiter.isAllowed('key1')).toBe(false);
      expect(limiter.isAllowed('key2')).toBe(false);
    });

    it('should allow resetting a specific key', () => {
      const limiter = new RateLimiter(1, 60000);

      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(false);

      limiter.reset('test');

      expect(limiter.isAllowed('test')).toBe(true);
    });

    it('should allow clearing all attempts', () => {
      const limiter = new RateLimiter(1, 60000);

      limiter.isAllowed('key1');
      limiter.isAllowed('key2');

      limiter.clearAll();

      expect(limiter.isAllowed('key1')).toBe(true);
      expect(limiter.isAllowed('key2')).toBe(true);
    });
  });
});
