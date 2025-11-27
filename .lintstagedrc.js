module.exports = {
  '*.{ts,tsx,js,jsx}': (filenames) => {
    const files = filenames.join(' ');
    return [`prettier --write ${files}`, `eslint --fix ${files}`];
  },
  '*.{json,md}': (filenames) => {
    const files = filenames.join(' ');
    return [`prettier --write ${files}`];
  },
};
