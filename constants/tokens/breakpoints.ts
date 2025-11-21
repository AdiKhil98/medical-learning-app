/**
 * Responsive Breakpoint Design Tokens
 *
 * Standard breakpoints for responsive design.
 * Values are in pixels (dp on Android).
 *
 * Usage:
 * import { BREAKPOINTS, isCompact } from '@/constants/tokens/breakpoints';
 * const compact = screenWidth < BREAKPOINTS.md;
 */

export const BREAKPOINTS = {
  /** 0px - Extra small devices */
  xs: 0,
  /** 360px - Small phones */
  sm: 360,
  /** 600px - Large phones / Small tablets */
  md: 600,
  /** 900px - Tablets */
  lg: 900,
  /** 1200px - Large tablets / Small desktops */
  xl: 1200,
} as const;

/**
 * Helper functions for responsive checks
 */

/** Check if screen is compact (< 600px) */
export const isCompact = (screenWidth: number): boolean => {
  return screenWidth < BREAKPOINTS.md;
};

/** Check if screen is medium (600px - 899px) */
export const isMedium = (screenWidth: number): boolean => {
  return screenWidth >= BREAKPOINTS.md && screenWidth < BREAKPOINTS.lg;
};

/** Check if screen is large (>= 900px) */
export const isLarge = (screenWidth: number): boolean => {
  return screenWidth >= BREAKPOINTS.lg;
};

/**
 * Get device size category
 * @param screenWidth - Current screen width
 * @returns Device size category
 */
export const getDeviceSize = (screenWidth: number): 'compact' | 'medium' | 'large' => {
  if (screenWidth < BREAKPOINTS.md) return 'compact';
  if (screenWidth < BREAKPOINTS.lg) return 'medium';
  return 'large';
};
