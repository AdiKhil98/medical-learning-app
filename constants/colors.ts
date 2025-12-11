/**
 * App Color Constants
 *
 * Light theme colors for the KP Med application.
 * These colors match the brand identity and provide consistent styling throughout the app.
 */

export const colors = {
  background: '#FFFFFF', // Pure white to match homepage
  surface: '#FFFFFF',
  primary: '#E2827F', // Burning Sand - main brand color
  secondary: '#B87E70', // Old Rose - dark accent
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  card: '#F9F6F2', // Light beige/cream for cards to match homepage
  error: '#B15740', // Brown Rust for errors
  success: '#22C55E',
  warning: '#E5877E', // Tonys Pink for warnings/highlights
};

// Font sizes
export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SCALE_MAP: Record<FontSize, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
};

/**
 * Get scaled font size
 * @param baseSize - Base font size in pixels
 * @param fontSize - Font size variant (small, medium, large)
 * @returns Scaled font size
 */
export function fontScale(baseSize: number, fontSize: FontSize = 'medium'): number {
  return Math.round(baseSize * FONT_SCALE_MAP[fontSize]);
}
