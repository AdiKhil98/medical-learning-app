import { useWindowDimensions } from 'react-native';

/**
 * Standardized responsive breakpoints for the entire app
 *
 * IMPORTANT: All components should use this hook instead of:
 * - Dimensions.get('window')
 * - width < 768
 * - isCompact()
 * - Any other custom breakpoint logic
 */

export const BREAKPOINTS = {
  mobile: 768, // 0-768px: Mobile devices
  tablet: 1024, // 768-1024px: Tablets
  desktop: 1280, // 1024-1280px: Small desktops
  wide: 1920, // 1280+: Wide screens
} as const;

export const SMALL_MOBILE_THRESHOLD = 375; // For very small phones

export interface ResponsiveValues {
  /** Current window width in pixels */
  width: number;
  /** Current window height in pixels */
  height: number;
  /** True if width < 768px (phones) */
  isMobile: boolean;
  /** True if width < 375px (small phones like iPhone SE) */
  isSmallMobile: boolean;
  /** True if width >= 768px and < 1024px (tablets) */
  isTablet: boolean;
  /** True if width >= 1024px (desktops and larger) */
  isDesktop: boolean;
  /** True if width >= 1280px (large desktops) */
  isWide: boolean;
}

/**
 * Hook to get responsive values based on current window dimensions
 *
 * @returns Responsive values including breakpoint flags and dimensions
 *
 * @example
 * ```tsx
 * const { isMobile, width } = useResponsive();
 *
 * const fontSize = isMobile ? 16 : 20;
 * const padding = isMobile ? 12 : 24;
 * ```
 */
export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isMobile: width < BREAKPOINTS.mobile,
    isSmallMobile: width < SMALL_MOBILE_THRESHOLD,
    isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop,
    isDesktop: width >= BREAKPOINTS.desktop,
    isWide: width >= BREAKPOINTS.wide,
  };
}

/**
 * Get responsive value based on breakpoint
 *
 * @example
 * ```tsx
 * const fontSize = getResponsiveValue(width, {
 *   mobile: 14,
 *   tablet: 16,
 *   desktop: 18,
 * });
 * ```
 */
export function getResponsiveValue<T>(
  width: number,
  values: {
    mobile: T;
    tablet?: T;
    desktop?: T;
    wide?: T;
  }
): T {
  if (width >= BREAKPOINTS.wide && values.wide !== undefined) {
    return values.wide;
  }
  if (width >= BREAKPOINTS.desktop && values.desktop !== undefined) {
    return values.desktop;
  }
  if (width >= BREAKPOINTS.mobile && values.tablet !== undefined) {
    return values.tablet;
  }
  return values.mobile;
}
