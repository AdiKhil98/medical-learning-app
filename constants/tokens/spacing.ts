/**
 * Spacing Design Tokens
 *
 * Based on 4px base scale for consistent spacing throughout the app.
 * All values are in pixels.
 *
 * Usage:
 * import { SPACING } from '@/constants/tokens/spacing';
 * paddingHorizontal: SPACING.md
 */

export const SPACING = {
  /** 0px - No spacing */
  none: 0,
  /** 4px - Extra small spacing */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 12px - Medium spacing */
  md: 12,
  /** 16px - Large spacing (most common) */
  lg: 16,
  /** 20px - Extra large spacing */
  xl: 20,
  /** 24px - 2x extra large spacing */
  xxl: 24,
  /** 32px - 3x extra large spacing */
  xxxl: 32,
  /** 40px - 4x extra large spacing */
  xxxxl: 40,
  /** 48px - 5x extra large spacing */
  xxxxxl: 48,
} as const;

/**
 * Responsive spacing multipliers
 * Use these to adjust spacing based on screen size
 */
export const SPACING_MULTIPLIERS = {
  compact: 0.75,  // For small screens
  normal: 1,      // Default
  comfortable: 1.25, // For large screens
} as const;

/**
 * Helper function to get responsive spacing
 * @param size - Spacing size from SPACING
 * @param multiplier - Multiplier from SPACING_MULTIPLIERS
 * @returns Calculated spacing value
 */
export const getResponsiveSpacing = (
  size: keyof typeof SPACING,
  multiplier: keyof typeof SPACING_MULTIPLIERS = 'normal'
): number => {
  return SPACING[size] * SPACING_MULTIPLIERS[multiplier];
};
