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
  // Only collect coverage from files with tests
  collectCoverageFrom: [
    'utils/inputValidation.ts',
    'utils/retryLogic.ts',
    'utils/timeValidation.ts',
    'utils/logger.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 15,
      statements: 15,
    },
    // Specific thresholds for well-tested utilities
    './utils/inputValidation.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './utils/retryLogic.ts': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './utils/timeValidation.ts': {
      branches: 75,
      functions: 60,
      lines: 78,
      statements: 78,
    },
    './utils/logger.ts': {
      branches: 45,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },

  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Globals
  globals: {
    __DEV__: true,
  },
};
