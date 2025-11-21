/**
 * Typography Design Tokens
 *
 * Consistent typography scale for the entire app.
 * Font sizes, weights, and line heights.
 *
 * Usage:
 * import { TYPOGRAPHY } from '@/constants/tokens/typography';
 * fontSize: TYPOGRAPHY.fontSize.lg
 */

export const TYPOGRAPHY = {
  /**
   * Font size scale (in pixels)
   * Based on even numbers for better rendering
   */
  fontSize: {
    /** 12px - Smallest text (captions, labels) */
    xs: 12,
    /** 14px - Small text (secondary info) */
    sm: 14,
    /** 16px - Base text size (body, default) */
    base: 16,
    /** 18px - Large text (emphasized body) */
    lg: 18,
    /** 20px - Extra large text (small headings) */
    xl: 20,
    /** 24px - 2x large text (medium headings) */
    '2xl': 24,
    /** 28px - 3x large text (large headings) */
    '3xl': 28,
    /** 32px - 4x large text (page titles) */
    '4xl': 32,
    /** 36px - 5x large text (hero text) */
    '5xl': 36,
  },

  /**
   * Font weight scale
   * Use string values for React Native compatibility
   */
  fontWeight: {
    /** 400 - Normal text */
    normal: '400' as const,
    /** 500 - Medium weight */
    medium: '500' as const,
    /** 600 - Semi-bold (most headings) */
    semibold: '600' as const,
    /** 700 - Bold (emphasis, important) */
    bold: '700' as const,
  },

  /**
   * Line height ratios
   * Multiply by font size to get line height
   */
  lineHeight: {
    /** 1.25 - Tight (large headings) */
    tight: 1.25,
    /** 1.4 - Snug (small headings) */
    snug: 1.4,
    /** 1.5 - Normal (body text) */
    normal: 1.5,
    /** 1.6 - Relaxed (comfortable reading) */
    relaxed: 1.6,
    /** 1.75 - Loose (very comfortable) */
    loose: 1.75,
  },
} as const;

/**
 * Typography preset combinations
 * Ready-to-use typography styles
 */
export const TYPOGRAPHY_PRESETS = {
  // Headings
  h1: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: TYPOGRAPHY.fontSize['4xl'] * TYPOGRAPHY.lineHeight.tight,
  },
  h2: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: TYPOGRAPHY.fontSize['3xl'] * TYPOGRAPHY.lineHeight.tight,
  },
  h3: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.fontSize['2xl'] * TYPOGRAPHY.lineHeight.snug,
  },
  h4: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.fontSize.xl * TYPOGRAPHY.lineHeight.snug,
  },
  h5: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.fontSize.lg * TYPOGRAPHY.lineHeight.normal,
  },

  // Body text
  body: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.normal,
    lineHeight: TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal,
  },
  bodyLarge: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.normal,
    lineHeight: TYPOGRAPHY.fontSize.lg * TYPOGRAPHY.lineHeight.normal,
  },
  bodySmall: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.normal,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },

  // Special
  caption: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.normal,
    lineHeight: TYPOGRAPHY.fontSize.xs * TYPOGRAPHY.lineHeight.normal,
  },
  button: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.snug,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
} as const;

/**
 * Helper function to calculate line height
 * @param fontSize - Font size value
 * @param ratio - Line height ratio
 * @returns Calculated line height
 */
export const calculateLineHeight = (
  fontSize: number,
  ratio: keyof typeof TYPOGRAPHY.lineHeight
): number => {
  return fontSize * TYPOGRAPHY.lineHeight[ratio];
};
