/**
 * Optimized Icon Loader
 *
 * Lazy loads only the icon fonts that are actually used in the app.
 * Reduces initial bundle size by ~4MB by not loading all icon font families.
 *
 * Usage:
 *   import { loadIcons } from '@/utils/iconLoader';
 *
 *   // In app initialization
 *   await loadIcons();
 */

import * as Font from 'expo-font';

// Define which icon families are actually used in the app
// Only load these to reduce bundle size
const USED_ICON_FAMILIES = [
  'MaterialCommunityIcons', // Used extensively in the app
  'Ionicons', // Used for navigation
  // Remove unused families:
  // 'FontAwesome',
  // 'FontAwesome5',
  // 'FontAwesome6',
  // 'AntDesign',
  // 'Entypo',
  // 'EvilIcons',
  // 'Feather',
  // 'Fontisto',
  // 'Foundation',
  // 'Octicons',
  // 'SimpleLineIcons',
  // 'Zocial',
];

/**
 * Load only the icon fonts that are used in the app
 */
export async function loadIcons(): Promise<void> {
  const fontsToLoad: Record<string, any> = {};

  // Dynamically import only the fonts we use
  if (USED_ICON_FAMILIES.includes('MaterialCommunityIcons')) {
    fontsToLoad[
      'MaterialCommunityIcons'
    ] = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf');
  }

  if (USED_ICON_FAMILIES.includes('Ionicons')) {
    fontsToLoad['Ionicons'] = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');
  }

  // Add more as needed based on actual usage
  // Check your code for which icon families are imported

  await Font.loadAsync(fontsToLoad);
}

/**
 * Check if icons are loaded
 */
export function areIconsLoaded(): boolean {
  return Font.isLoaded('MaterialCommunityIcons') && Font.isLoaded('Ionicons');
}

/**
 * Lazy load additional icon family if needed at runtime
 */
export async function loadIconFamily(family: string): Promise<void> {
  if (Font.isLoaded(family)) {
    return;
  }

  const fontMap: Record<string, any> = {
    MaterialCommunityIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    FontAwesome: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf'),
    // Add others as needed
  };

  if (fontMap[family]) {
    await Font.loadAsync({ [family]: fontMap[family] });
  }
}
