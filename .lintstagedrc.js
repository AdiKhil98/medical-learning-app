module.exports = {
  '*.{ts,tsx}': [
    'npm run lint --fix',
    'npm test -- --bail --findRelatedTests',
  ],
};
