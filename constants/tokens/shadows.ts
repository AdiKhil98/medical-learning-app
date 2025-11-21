/**
 * Shadow & Elevation Design Tokens
 *
 * Consistent shadow definitions for iOS and Android.
 * iOS uses shadow properties, Android uses elevation.
 *
 * Usage:
 * import { SHADOWS } from '@/constants/tokens/shadows';
 * ...styles, ...SHADOWS.md
 */

import { ViewStyle } from 'react-native';

export const SHADOWS: Record<'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', ViewStyle> = {
  /**
   * No shadow
   */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  /**
   * Extra small shadow - Subtle depth
   * Use for: Slight elevation, hover states
   */
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  /**
   * Small shadow - Light elevation
   * Use for: Cards in flat layouts, badges
   */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  /**
   * Medium shadow - Standard elevation
   * Use for: Most cards, buttons, floating elements
   */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  /**
   * Large shadow - Prominent elevation
   * Use for: Dropdowns, popovers, important cards
   */
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  /**
   * Extra large shadow - High elevation
   * Use for: Modals, drawers, overlays
   */
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },

  /**
   * 2x extra large shadow - Maximum elevation
   * Use for: Full-screen modals, critical overlays
   */
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

/**
 * Helper function to get shadow style
 * @param size - Shadow size
 * @returns Shadow style object
 */
export const getShadow = (size: keyof typeof SHADOWS): ViewStyle => {
  return SHADOWS[size];
};
