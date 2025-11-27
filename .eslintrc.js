// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: [
    'expo',
    'prettier', // Integrate Prettier with ESLint
  ],
  ignorePatterns: ['/dist/*', '/node_modules/*', '/.expo/*', '/android/*', '/ios/*', 'coverage/*', '*.config.js'],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // React/React Native rules
    'react/prop-types': 'off', // Using TypeScript for prop types
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'warn',

    // Code quality rules
    'no-console': 'off', // We use logger instead, but allow console for now
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'prefer-arrow-callback': 'warn',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'warn',

    // Prettier (handled by prettier, but enforce here)
    'max-len': ['warn', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
};
