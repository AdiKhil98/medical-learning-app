const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable aggressive tree shaking
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      keep_classnames: false,
      keep_fnames: false,
    },
    compress: {
      drop_console: false, // KEEP console.logs for debugging (changed from true)
      drop_debugger: true,
      // pure_funcs removed - we want to keep all console methods
    },
  },
};

// Optimize resolver
config.resolver = {
  ...config.resolver,
  // Enable source map generation for better debugging
  sourceExts: [...(config.resolver?.sourceExts || []), 'mjs', 'cjs'],
};

module.exports = config;
