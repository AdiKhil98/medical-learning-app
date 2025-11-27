module.exports = {
  // Test file matching pattern
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)'],

  // Paths to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    '/dist/',
    '/api/',
    '/netlify/',
    '__tests__/components/', // Skip component tests - require full React Native environment
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],

  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.expo/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/jest.config.js',
    '!**/babel.config.js',
    '!**/metro.config.js',
    '!**/app.config.js',
    '!**/tailwind.config.js',
    '!**/.lintstagedrc.js',
    '!**/.eslintrc.js',
  ],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  coverageReporters: ['text', 'lcov', 'html'],

  // Globals
  globals: {
    __DEV__: true,
  },
};
