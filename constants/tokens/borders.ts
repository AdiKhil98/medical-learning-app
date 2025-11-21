/**
 * Border Design Tokens
 *
 * Consistent border radius and width values.
 *
 * Usage:
 * import { BORDER_RADIUS, BORDER_WIDTH } from '@/constants/tokens/borders';
 * borderRadius: BORDER_RADIUS.lg
 */

export const BORDER_RADIUS = {
  /** 0px - No rounding */
  none: 0,
  /** 4px - Slight rounding */
  sm: 4,
  /** 8px - Small rounding */
  md: 8,
  /** 12px - Medium rounding (most common) */
  lg: 12,
  /** 16px - Large rounding */
  xl: 16,
  /** 20px - Extra large rounding */
  '2xl': 20,
  /** 24px - 2x extra large rounding */
  '3xl': 24,
  /** 9999px - Fully rounded (pills, circles) */
  full: 9999,
} as const;

export const BORDER_WIDTH = {
  /** 0px - No border */
  none: 0,
  /** 1px - Thin border (default) */
  thin: 1,
  /** 1.5px - Medium border */
  medium: 1.5,
  /** 2px - Thick border */
  thick: 2,
  /** 3px - Extra thick border */
  extraThick: 3,
} as const;

/**
 * Border presets for common use cases
 */
export const BORDER_PRESETS = {
  /** Standard card border */
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: BORDER_WIDTH.none,
  },
  /** Button border */
  button: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: BORDER_WIDTH.none,
  },
  /** Input border */
  input: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: BORDER_WIDTH.thin,
  },
  /** Badge/pill border */
  badge: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: BORDER_WIDTH.none,
  },
  /** Outline button/card */
  outline: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: BORDER_WIDTH.medium,
  },
} as const;
