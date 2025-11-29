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
      favicon: './assets/favicon.png',

      // PWA Configuration
      manifest: '/manifest.json',
      serviceWorker: {
        enabled: true,
        scope: '/',
        swSrc: './public/service-worker.js',
      },

      // Meta tags for PWA and SEO
      meta: {
        'theme-color': '#B15740',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'default',
        'apple-mobile-web-app-title': 'KP MED',
        'mobile-web-app-capable': 'yes',
        'application-name': 'KP MED',
      },
    },

    // Optimize asset loading
    assetBundlePatterns: ['assets/**/*'],

    // Performance optimization flags
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true,
    },

    // Use default plugins (expo-font plugin removed to prevent loading all icon fonts)
    plugins: config.plugins || [],
  };
};
