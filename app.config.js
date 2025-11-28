module.exports = ({ config }) => {
  return {
    ...config,
    name: config.name || 'kp-app-medical-learning',
    slug: config.slug || 'kp-app-medical-learning',
    version: config.version || '1.0.0',

    // Web-specific optimizations
    web: {
      ...config.web,
      bundler: 'metro',

      // Performance optimizations
      build: {
        babel: {
          include: ['@expo/vector-icons'],
        },
      },

      // Meta tags for SEO (already good, but ensuring they're set)
      meta: {
        'theme-color': '#B15740',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'default',
      },
    },

    // Optimize asset loading
    assetBundlePatterns: ['assets/**/*'],

    // Performance optimization flags
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true,
    },

    // Plugin configuration
    plugins: [
      ...(config.plugins || []),
      [
        'expo-font',
        {
          fonts: [
            // Only load fonts that are actually used
            './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
            './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
          ],
        },
      ],
    ],
  };
};
