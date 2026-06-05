// @ts-check
const config = require('@modusoperandi/eslint-config');
module.exports = [
  ...config.getFlatConfig({
    strict: false,
    header: config.header.mit,
  }),
  {
    files: config.TS_FILES,
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
